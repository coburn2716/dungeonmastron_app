#!/usr/bin/env python3
"""
Dungeon Mastron Game Validator (v1.1)

Usage:
  python validate_dungeon_mastron.py path/to/game.json
  python validate_dungeon_mastron.py path/to/game.json --strict

Exit codes:
  0 = valid (no errors)
  1 = errors found

Changelog v1.0 → v1.1
  BUG-1  Accept action.type="boss" — validate stage chain (stage_page targets exist,
          boss-action fields present). Each stage is validated for success/failure targets.
  BUG-2  Support all 3 item formats (stats / stat_mods / item_mods) in has_any_items()
          and extract_item_name() so requires_item reachability sees them all.
  BUG-3  Ending pages WITH choices (replay loops: reset_game=true) are now allowed;
          downgraded to info if choices present and only replay (reset_game) choices exist,
          plain info if any forward choice. No longer an error.
  BUG-4  Accept next_page as alias for target everywhere (choice target resolution,
          action success/failure fields). Validator resolves target = target or next_page.
  BUG-5  Page keys with leading/trailing whitespace → warning. References that resolve
          only after trimming → warning with clear message.
  BUG-6  Double-damage detection: action page whose failure_page ALSO has negative
          stat_mods.health → WARNING (authoring bug).
  BUG-7  Flags support (requires_flags / set_flags / set_flags_on_enter) — best-effort
          warning (not error) if required flags never set upstream.
  COMPAT Also accept requires_items (plural list) as alias for locked-page gating.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Set, Tuple


# ----------------------------
# Report structures
# ----------------------------

@dataclass
class Issue:
    rule_id: str
    severity: str  # "error" | "warning" | "info"
    message: str
    page_id: Optional[str] = None
    path: Optional[str] = None
    suggested_fix: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class Report:
    valid: bool
    errors: List[Issue]
    warnings: List[Issue]
    info: List[Issue]

    def to_json(self) -> str:
        payload = {
            "valid": self.valid,
            "errors": [i.to_dict() for i in self.errors],
            "warnings": [i.to_dict() for i in self.warnings],
            "info": [i.to_dict() for i in self.info],
        }
        return json.dumps(payload, indent=2)


# ----------------------------
# Helpers: normalization
# ----------------------------

def normalize_stat_mods(stat_mods: Any, issues: List[Issue], page_id: str, path: str) -> Dict[str, int]:
    """
    Accept:
      - map: {"health": -20, "luck": 1}
      - list: [{"stat":"health","change":-20}]
    Normalize to map with summed changes.
    """
    if stat_mods is None:
        return {}

    if isinstance(stat_mods, dict):
        out: Dict[str, int] = {}
        for k, v in stat_mods.items():
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                out[str(k)] = int(v)
            else:
                issues.append(Issue(
                    rule_id="STAT_MODS_NON_NUMERIC",
                    severity="warning",
                    page_id=page_id,
                    path=f"{path}.{k}",
                    message=f"stat_mods['{k}'] is not numeric; ignoring.",
                    suggested_fix="Use integers for stat_mods values."
                ))
        return out

    if isinstance(stat_mods, list):
        issues.append(Issue(
            rule_id="STAT_MODS_ARRAY_FORMAT_USED",
            severity="warning",
            page_id=page_id,
            path=path,
            message="stat_mods is an array format. Normalizing to map format.",
            suggested_fix="Prefer stat_mods as an object map: {\"health\": -10}."
        ))
        out: Dict[str, int] = {}
        for idx, entry in enumerate(stat_mods):
            if not isinstance(entry, dict):
                issues.append(Issue(
                    rule_id="STAT_MODS_ARRAY_ENTRY_INVALID",
                    severity="warning",
                    page_id=page_id,
                    path=f"{path}[{idx}]",
                    message="stat_mods array entry is not an object; ignoring.",
                ))
                continue
            stat = entry.get("stat")
            change = entry.get("change")
            if isinstance(stat, str) and isinstance(change, (int, float)) and not isinstance(change, bool):
                out[stat] = out.get(stat, 0) + int(change)
            else:
                issues.append(Issue(
                    rule_id="STAT_MODS_ARRAY_ENTRY_INVALID",
                    severity="warning",
                    page_id=page_id,
                    path=f"{path}[{idx}]",
                    message="stat_mods array entry must have {stat: string, change: number}; ignoring.",
                    suggested_fix="Use {\"stat\":\"health\",\"change\":-10} entries if using array format."
                ))
        return out

    issues.append(Issue(
        rule_id="STAT_MODS_INVALID_TYPE",
        severity="warning",
        page_id=page_id,
        path=path,
        message=f"stat_mods has invalid type {type(stat_mods).__name__}; treating as empty.",
        suggested_fix="Use an object map or an array of {stat, change}."
    ))
    return {}


def resolve_choice_target(choice: Dict[str, Any]) -> Optional[str]:
    """
    BUG-4: Accept target or next_page as the destination field.
    Returns the target string, or None if neither is present.
    """
    t = choice.get("target")
    if isinstance(t, str):
        return t
    t = choice.get("next_page")
    if isinstance(t, str):
        return t
    return None


def extract_choice_requires_item(choice: Dict[str, Any], issues: List[Issue], page_id: str, choice_path: str) -> Optional[str]:
    """
    Supports:
      - requires_item: "id"           (singular string)
      - condition: { has_item: "id" } (legacy)
    Returns the first required item id, or None.
    Note: requires_items (plural list) is handled separately via extract_choice_requires_items_list.
    """
    if isinstance(choice.get("requires_item"), str):
        return choice["requires_item"]

    cond = choice.get("condition")
    if isinstance(cond, dict) and isinstance(cond.get("has_item"), str):
        issues.append(Issue(
            rule_id="LEGACY_HAS_ITEM_CONDITION_USED",
            severity="warning",
            page_id=page_id,
            path=f"{choice_path}.condition.has_item",
            message="Legacy item gating via condition.has_item used. Prefer requires_item.",
            suggested_fix="Replace with requires_item: \"item_id\"."
        ))
        return cond["has_item"]

    return None


def extract_choice_requires_items_list(choice: Dict[str, Any]) -> List[str]:
    """
    BUG-COMPAT: Accept requires_items (plural) as an array of item ids.
    Returns a list (possibly empty).
    """
    ris = choice.get("requires_items")
    if isinstance(ris, list):
        return [r for r in ris if isinstance(r, str)]
    return []


def choice_has_any_item_requirement(choice: Dict[str, Any], issues: List[Issue], page_id: str, choice_path: str) -> bool:
    """
    Returns True if the choice has any item requirement (singular or plural).
    """
    if extract_choice_requires_item(choice, issues, page_id, choice_path) is not None:
        return True
    if extract_choice_requires_items_list(choice):
        return True
    return False


def extract_choice_stat_condition(choice: Dict[str, Any]) -> Optional[Tuple[str, int]]:
    """
    Supports condition: { stat: "strength", min: 5 }
    Returns (stat_name, min_value)
    """
    cond = choice.get("condition")
    if not isinstance(cond, dict):
        return None
    stat = cond.get("stat")
    minv = cond.get("min")
    if isinstance(stat, str) and isinstance(minv, (int, float)) and not isinstance(minv, bool):
        return (stat, int(minv))
    return None


def normalize_choice_add_items(choice: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Supports:
      - add_item: {...}
      - add_items: [{...}, {...}]
    Normalize to a list.
    """
    items: List[Dict[str, Any]] = []
    if isinstance(choice.get("add_item"), dict):
        items.append(choice["add_item"])
    if isinstance(choice.get("add_items"), list):
        for it in choice["add_items"]:
            if isinstance(it, dict):
                items.append(it)
    return items


def normalize_page_add_items(page: Dict[str, Any]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    # add_item (singular dict) at page level
    if isinstance(page.get("add_item"), dict):
        items.append(page["add_item"])
    # add_items (plural list) at page level
    if isinstance(page.get("add_items"), list):
        for it in page["add_items"]:
            if isinstance(it, dict):
                items.append(it)
    return items


def extract_item_stats(item: Dict[str, Any]) -> Dict[str, int]:
    """
    Template shows multiple item schemas:
      - {id,name,stat_mods}
      - {name,display_name,stats}
    Normalize to a stats map.
    """
    stats = item.get("stat_mods")
    if isinstance(stats, dict):
        return {k: int(v) for k, v in stats.items() if isinstance(v, (int, float)) and not isinstance(v, bool)}
    stats = item.get("stats")
    if isinstance(stats, dict):
        return {k: int(v) for k, v in stats.items() if isinstance(v, (int, float)) and not isinstance(v, bool)}
    return {}


def extract_item_name(item: Dict[str, Any]) -> Optional[str]:
    """
    Extract the canonical item name from any item format:
      - {name: "id", ...}                 → "id"
      - {item_name: 1}  (simple format)   → "item_name" (first key if no 'name')
    """
    if isinstance(item.get("name"), str):
        return item["name"]
    # Simple quantity format: {"item_name": 1}
    for k, v in item.items():
        if k not in ("display_name", "stats", "stat_mods", "quantity"):
            return k
    return None


def has_any_items(page: Dict[str, Any]) -> bool:
    """
    BUG-2: Support all 3 item formats:
      - add_item (page level singular dict) — NEWLY SUPPORTED
      - add_items (page level array)
      - add_item / add_items on choices
      - item_mods (page level or choice level dict, format {"item_name": qty})
      - stats / stat_mods on items (covered by add_items above)
    """
    # Page-level add_item (singular dict)
    if isinstance(page.get("add_item"), dict):
        return True
    # Page-level add_items (plural list)
    if isinstance(page.get("add_items"), list) and len(page["add_items"]) > 0:
        return True
    # Page-level item_mods (BUG-2 fix)
    if isinstance(page.get("item_mods"), dict) and len(page["item_mods"]) > 0:
        return True
    # Choice-level
    if isinstance(page.get("choices"), list):
        for c in page["choices"]:
            if isinstance(c, dict):
                if isinstance(c.get("add_item"), dict):
                    return True
                if isinstance(c.get("add_items"), list) and len(c["add_items"]) > 0:
                    return True
                # Choice-level item_mods (BUG-2 fix)
                if isinstance(c.get("item_mods"), dict) and len(c["item_mods"]) > 0:
                    return True
    return False


def collect_all_item_names(pages: Dict[str, Any]) -> Set[str]:
    """
    BUG-2: Collect all item names that can be acquired anywhere in the game.
    Supports add_item (singular), add_items, and item_mods formats at both page and choice level.
    """
    names: Set[str] = set()
    for pid, page in pages.items():
        if not isinstance(page, dict):
            continue
        # Page-level add_item (singular) and add_items (plural)
        # normalize_page_add_items handles both
        for it in normalize_page_add_items(page):
            n = extract_item_name(it)
            if n:
                names.add(n)
        # Page-level item_mods
        if isinstance(page.get("item_mods"), dict):
            names.update(page["item_mods"].keys())
        # Choice-level
        for c in page.get("choices", []):
            if not isinstance(c, dict):
                continue
            for it in normalize_choice_add_items(c):
                n = extract_item_name(it)
                if n:
                    names.add(n)
            # Choice-level item_mods
            if isinstance(c.get("item_mods"), dict):
                names.update(c["item_mods"].keys())
    return names


# ----------------------------
# Core validation
# ----------------------------

def validate(game: Dict[str, Any], strict: bool = False) -> Report:
    errors: List[Issue] = []
    warnings: List[Issue] = []
    info: List[Issue] = []

    def add(issue: Issue) -> None:
        if issue.severity == "error":
            errors.append(issue)
        elif issue.severity == "warning":
            warnings.append(issue)
        else:
            info.append(issue)

    # ---- G001 required top-level
    required = ["title", "start_page", "player_stats", "pages"]
    missing = [k for k in required if k not in game]
    if missing:
        add(Issue(
            rule_id="TOPLEVEL_MISSING_REQUIRED",
            severity="error",
            message=f"Missing required top-level fields: {', '.join(missing)}",
            suggested_fix="Add the missing fields to the root of game.json."
        ))

    pages = game.get("pages")
    if not isinstance(pages, dict):
        add(Issue(
            rule_id="PAGES_INVALID_TYPE",
            severity="error",
            message="Top-level 'pages' must be an object map of page_id -> page definition.",
            path="pages",
            suggested_fix="Ensure pages is a JSON object, not a list."
        ))
        pages = {}

    # BUG-5: Warn about page keys with leading/trailing whitespace
    for pid in list(pages.keys()):
        if pid != pid.strip():
            add(Issue(
                rule_id="PAGE_KEY_WHITESPACE",
                severity="warning",
                page_id=pid,
                path=f"pages.{repr(pid)}",
                message=f"Page key has leading/trailing whitespace: {repr(pid)}. This may cause broken references that only resolve after trimming.",
                suggested_fix=f"Rename the page key to '{pid.strip()}' (remove surrounding whitespace)."
            ))

    # Build a trimmed-key lookup for BUG-5 reference warnings
    trimmed_key_map: Dict[str, str] = {pid.strip(): pid for pid in pages.keys()}

    def page_exists(pid: str) -> bool:
        """Return True if pid exactly matches a page key."""
        return pid in pages

    def page_exists_trimmed(pid: str) -> bool:
        """Return True if pid matches after trimming (only if exact match fails)."""
        return pid.strip() in trimmed_key_map

    start_page = game.get("start_page")
    if isinstance(start_page, str):
        if not page_exists(start_page):
            add(Issue(
                rule_id="START_PAGE_NOT_FOUND",
                severity="error",
                message=f"start_page '{start_page}' does not exist in pages.",
                path="start_page",
                suggested_fix="Set start_page to an existing page_id."
            ))
    else:
        add(Issue(
            rule_id="START_PAGE_INVALID",
            severity="error",
            message="start_page must be a string page id.",
            path="start_page"
        ))
        start_page = None

    # Player stats
    player_stats = game.get("player_stats")
    if not isinstance(player_stats, dict):
        add(Issue(
            rule_id="PLAYER_STATS_INVALID_TYPE",
            severity="error",
            message="player_stats must be an object with health/strength/luck.",
            path="player_stats"
        ))
        player_stats = {}
    for stat in ["health", "strength", "luck"]:
        if stat not in player_stats:
            add(Issue(
                rule_id="PLAYER_STATS_MISSING",
                severity="error",
                message=f"player_stats missing '{stat}'.",
                path=f"player_stats.{stat}"
            ))

    base_stats = {
        "health": int(player_stats.get("health", 0) or 0),
        "strength": int(player_stats.get("strength", 0) or 0),
        "luck": int(player_stats.get("luck", 0) or 0),
    }

    # ---- G003 game_over presence/uniqueness
    if "game_over" not in pages:
        add(Issue(
            rule_id="GAME_OVER_PAGE_INVALID",
            severity="error",
            message="Missing required page_id 'game_over'.",
            suggested_fix="Add a 'game_over' page with page_type 'game_over' and a restart choice."
        ))
    else:
        go = pages.get("game_over", {})
        if isinstance(go, dict):
            if go.get("page_type") != "game_over":
                add(Issue(
                    rule_id="GAME_OVER_PAGE_INVALID",
                    severity="error",
                    page_id="game_over",
                    path="pages.game_over.page_type",
                    message="game_over page must have page_type: 'game_over'.",
                    suggested_fix="Set pages.game_over.page_type = 'game_over'."
                ))
            choices = go.get("choices")
            if not (isinstance(choices, list) and len(choices) > 0):
                add(Issue(
                    rule_id="GAME_OVER_NO_RESTART",
                    severity="error",
                    page_id="game_over",
                    path="pages.game_over.choices",
                    message="game_over must have at least one choice to restart.",
                    suggested_fix="Add a choice targeting the start page."
                ))
        else:
            add(Issue(
                rule_id="GAME_OVER_PAGE_INVALID",
                severity="error",
                message="pages.game_over must be an object.",
                path="pages.game_over"
            ))

    # Ensure no other page_type game_over
    for pid, page in pages.items():
        if not isinstance(page, dict):
            add(Issue(
                rule_id="PAGE_INVALID_TYPE",
                severity="error",
                page_id=pid,
                path=f"pages.{pid}",
                message="Each page must be an object."
            ))
            continue
        if pid != "game_over" and page.get("page_type") == "game_over":
            add(Issue(
                rule_id="GAME_OVER_PAGE_INVALID",
                severity="error",
                page_id=pid,
                path=f"pages.{pid}.page_type",
                message="Only the page with id 'game_over' may have page_type 'game_over'.",
                suggested_fix="Change page_type or rename page_id to 'game_over' (but only one can exist)."
            ))

    # ---- Build edges and classifications
    action_pages: Set[str] = set()
    ending_pages: Set[str] = set()
    sanctuary_pages: Set[str] = set()
    armory_pages: Set[str] = set()
    locked_pages: Set[str] = set()

    edges_all: List[Tuple[str, str, str]] = []  # (src, dst, kind)
    edges_no_items: List[Tuple[str, str]] = []  # reachability ignoring item requirements & unmet base stat reqs

    total_enemy_damage = 0
    total_direct_heal = 0

    def classify(pid: str, page: Dict[str, Any]) -> str:
        if start_page is not None and pid == start_page:
            return "start"
        if "action" in page and isinstance(page.get("action"), dict):
            return "action"
        pt = page.get("page_type")
        if isinstance(pt, str):
            return pt
        return "normal"

    # Collect all known item names for requires_item reachability (BUG-2)
    all_item_names = collect_all_item_names(pages)

    # BUG-7: Collect all flag names that are set anywhere in the game
    all_set_flags: Set[str] = set()
    for pid, page in pages.items():
        if not isinstance(page, dict):
            continue
        # set_flags_on_enter
        sfe = page.get("set_flags_on_enter")
        if isinstance(sfe, list):
            all_set_flags.update(f for f in sfe if isinstance(f, str))
        for c in page.get("choices", []):
            if not isinstance(c, dict):
                continue
            sf = c.get("set_flags")
            if isinstance(sf, list):
                all_set_flags.update(f for f in sf if isinstance(f, str))

    # Iterate pages
    for pid, page in pages.items():
        if not isinstance(page, dict):
            continue

        pclass = classify(pid, page)

        if pclass == "action":
            action_pages.add(pid)
        elif pclass == "ending":
            ending_pages.add(pid)
        elif pclass == "sanctuary":
            sanctuary_pages.add(pid)
        elif pclass == "armory":
            armory_pages.add(pid)
        elif pclass == "locked":
            locked_pages.add(pid)

        if pclass == "normal":
            if pid != start_page and "action" not in page and "page_type" not in page:
                add(Issue(
                    rule_id="PAGE_TYPE_MISSING_DEFAULTED",
                    severity="warning",
                    page_id=pid,
                    path=f"pages.{pid}.page_type",
                    message="Page has no page_type; defaulting to 'normal'.",
                    suggested_fix="Set page_type explicitly to 'normal' (or appropriate type)."
                ))

        # Normalize stat_mods
        local_issues: List[Issue] = []
        stat_mods = normalize_stat_mods(page.get("stat_mods"), local_issues, pid, f"pages.{pid}.stat_mods")
        for iss in local_issues:
            add(iss)

        # Choices normalization
        choices = page.get("choices")
        if choices is None:
            choices_list: List[Dict[str, Any]] = []
        elif isinstance(choices, list):
            choices_list = [c for c in choices if isinstance(c, dict)]
        else:
            add(Issue(
                rule_id="CHOICES_INVALID_TYPE",
                severity="error",
                page_id=pid,
                path=f"pages.{pid}.choices",
                message="choices must be an array.",
                suggested_fix="Use choices: [] or a list of {text,target} objects."
            ))
            choices_list = []

        # BUG-7: Validate requires_flags on choices
        for idx, c in enumerate(choices_list):
            req_flags = c.get("requires_flags")
            if isinstance(req_flags, list):
                for flag in req_flags:
                    if isinstance(flag, str) and flag not in all_set_flags:
                        add(Issue(
                            rule_id="FLAG_NEVER_SET",
                            severity="warning",
                            page_id=pid,
                            path=f"pages.{pid}.choices[{idx}].requires_flags",
                            message=f"Flag '{flag}' is required here but never set anywhere in the game (set_flags / set_flags_on_enter).",
                            suggested_fix=f"Add set_flags: [\"{flag}\"] to a choice or set_flags_on_enter: [\"{flag}\"] to a page earlier in the story."
                        ))

        # BUG-7: Validate requires_flags on page entry (set_flags_on_enter check)
        req_page_flags = page.get("requires_flags")
        if isinstance(req_page_flags, list):
            for flag in req_page_flags:
                if isinstance(flag, str) and flag not in all_set_flags:
                    add(Issue(
                        rule_id="FLAG_NEVER_SET",
                        severity="warning",
                        page_id=pid,
                        path=f"pages.{pid}.requires_flags",
                        message=f"Flag '{flag}' is required to reach this page but never set anywhere in the game.",
                        suggested_fix=f"Add set_flags: [\"{flag}\"] to a choice or set_flags_on_enter: [\"{flag}\"] to an earlier page."
                    ))

        # ---- Action rules
        if pclass == "action":
            action = page.get("action", {})
            if not isinstance(action, dict):
                add(Issue(
                    rule_id="ACTION_MISSING_FIELDS",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.action",
                    message="Action page must have an action object.",
                ))
                action = {}

            if len(choices_list) > 0:
                add(Issue(
                    rule_id="ACTION_HAS_CHOICES",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.choices",
                    message="Action pages must not have choices (choices must be [] or omitted).",
                    suggested_fix="Move choices to success/failure pages, or remove choices from this action page."
                ))

            if stat_mods.get("health", 0) < 0:
                add(Issue(
                    rule_id="ACTION_NEGATIVE_HEALTH_STATMOD_FORBIDDEN",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.stat_mods.health",
                    message="Action pages must never apply negative health via stat_mods (double damage bug).",
                    suggested_fix="Remove negative stat_mods.health and use enemy_damage or failure page damage instead."
                ))

            atype = action.get("type")

            # BUG-1: Accept "boss" as a valid action type
            if atype not in ("combat", "dice", "boss"):
                add(Issue(
                    rule_id="ACTION_MISSING_FIELDS",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.action.type",
                    message="action.type must be 'combat', 'dice', or 'boss'.",
                    suggested_fix="Set action.type to 'combat', 'dice', or 'boss'."
                ))

            # BUG-4: Accept success_page and failure_page (no next_page alias needed here,
            # but resolve them consistently)
            succ = action.get("success_page")
            fail = action.get("failure_page")

            # BUG-1: For boss type, also validate the stage_page link
            if atype == "boss":
                stage_page = action.get("stage_page")
                # stage_page is required unless this is a final stage (empty string or absent)
                if stage_page and not page_exists(stage_page):
                    # BUG-5: Check if it resolves with trimming
                    if page_exists_trimmed(stage_page):
                        add(Issue(
                            rule_id="BOSS_STAGE_PAGE_WHITESPACE",
                            severity="warning",
                            page_id=pid,
                            path=f"pages.{pid}.action.stage_page",
                            message=f"Boss stage_page '{stage_page}' only resolves after trimming whitespace from the target key. This may fail at runtime.",
                            suggested_fix=f"Rename the target page key to remove surrounding whitespace, or fix the stage_page reference."
                        ))
                    else:
                        add(Issue(
                            rule_id="BOSS_STAGE_PAGE_MISSING",
                            severity="error",
                            page_id=pid,
                            path=f"pages.{pid}.action.stage_page",
                            message=f"Boss action stage_page '{stage_page}' does not exist in pages.",
                            suggested_fix="Set stage_page to an existing page_id (or empty string for the final stage)."
                        ))
                if stage_page and page_exists(stage_page):
                    edges_all.append((pid, stage_page, "boss_stage"))
                    edges_no_items.append((pid, stage_page))

            if not isinstance(succ, str) or not isinstance(fail, str):
                add(Issue(
                    rule_id="ACTION_MISSING_FIELDS",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.action",
                    message="Action pages must define success_page and failure_page.",
                    suggested_fix="Add action.success_page and action.failure_page pointing to valid page_ids."
                ))
            else:
                if not page_exists(succ):
                    # BUG-5: check trimmed
                    if page_exists_trimmed(succ):
                        add(Issue(
                            rule_id="ACTION_TARGET_WHITESPACE",
                            severity="warning",
                            page_id=pid,
                            path=f"pages.{pid}.action.success_page",
                            message=f"Action success_page '{succ}' only resolves after trimming whitespace from the target key.",
                            suggested_fix="Fix the page key or the success_page reference to remove surrounding whitespace."
                        ))
                    else:
                        add(Issue(
                            rule_id="ACTION_TARGET_MISSING",
                            severity="error",
                            page_id=pid,
                            path=f"pages.{pid}.action.success_page",
                            message=f"Action success_page '{succ}' does not exist.",
                        ))
                else:
                    edges_all.append((pid, succ, "action_success"))
                    edges_no_items.append((pid, succ))

                if not page_exists(fail):
                    # BUG-5: check trimmed
                    if page_exists_trimmed(fail):
                        add(Issue(
                            rule_id="ACTION_TARGET_WHITESPACE",
                            severity="warning",
                            page_id=pid,
                            path=f"pages.{pid}.action.failure_page",
                            message=f"Action failure_page '{fail}' only resolves after trimming whitespace from the target key.",
                            suggested_fix="Fix the page key or the failure_page reference to remove surrounding whitespace."
                        ))
                    else:
                        add(Issue(
                            rule_id="ACTION_TARGET_MISSING",
                            severity="error",
                            page_id=pid,
                            path=f"pages.{pid}.action.failure_page",
                            message=f"Action failure_page '{fail}' does not exist.",
                        ))
                else:
                    edges_all.append((pid, fail, "action_failure"))
                    edges_no_items.append((pid, fail))

                    # BUG-6: Double-damage detection
                    # Check if failure_page also applies negative health via stat_mods
                    if page_exists(fail):
                        fail_pg = pages[fail]
                        if isinstance(fail_pg, dict):
                            fail_sm = normalize_stat_mods(
                                fail_pg.get("stat_mods"), [], fail, f"pages.{fail}.stat_mods"
                            )
                            fail_health_mod = fail_sm.get("health", 0)
                            if fail_health_mod < 0:
                                action_damage = action.get("enemy_damage", action.get("failure_damage", 0))
                                add(Issue(
                                    rule_id="DOUBLE_DAMAGE_WARN",
                                    severity="warning",
                                    page_id=pid,
                                    path=f"pages.{pid}.action",
                                    message=(
                                        f"Double-damage risk: action '{pid}' deals {action_damage} damage on failure "
                                        f"AND its failure_page '{fail}' ALSO applies stat_mods.health={fail_health_mod}. "
                                        f"Player takes both hits. This is the #1 authoring bug."
                                    ),
                                    suggested_fix=f"Remove stat_mods.health from '{fail}' — damage is already applied by the action itself."
                                ))

            if atype in ("combat", "boss"):
                dmg = action.get("enemy_damage")
                if not isinstance(dmg, (int, float)) or isinstance(dmg, bool) or dmg <= 0:
                    add(Issue(
                        rule_id="COMBAT_ENEMY_DAMAGE_INVALID",
                        severity="error",
                        page_id=pid,
                        path=f"pages.{pid}.action.enemy_damage",
                        message="Combat/boss actions must have enemy_damage > 0.",
                        suggested_fix="Set enemy_damage to a positive integer (e.g. 20-50)."
                    ))
                else:
                    total_enemy_damage += int(dmg)

        # Non-action normal pages should have choices
        if pclass not in ("action", "ending", "game_over"):
            if pclass == "normal" and len(choices_list) == 0:
                add(Issue(
                    rule_id="NORMAL_NO_CHOICES",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.choices",
                    message="Normal (non-action) pages must have at least one choice.",
                    suggested_fix="Add 1-4 choices that move forward to new pages."
                ))

        # BUG-3: Ending rules — allow endings with choices (replay loops)
        if pclass == "ending":
            if "action" in page:
                add(Issue(
                    rule_id="ENDING_HAS_ACTION",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.action",
                    message="Ending pages must not contain an action object.",
                    suggested_fix="Move action to a prior page, and end with choices: [] here."
                ))
            if len(choices_list) > 0:
                # Check if all choices are replay loops (reset_game: true)
                all_replay = all(c.get("reset_game") is True for c in choices_list)
                if all_replay:
                    add(Issue(
                        rule_id="ENDING_HAS_REPLAY_CHOICES",
                        severity="info",
                        page_id=pid,
                        path=f"pages.{pid}.choices",
                        message="Ending page has replay choices (reset_game: true). This is a valid replay loop design pattern.",
                    ))
                else:
                    add(Issue(
                        rule_id="ENDING_HAS_FORWARD_CHOICES",
                        severity="info",
                        page_id=pid,
                        path=f"pages.{pid}.choices",
                        message="Ending page has forward choices (soft ending / multi-act design). This is allowed.",
                    ))

        # Sanctuary rules
        if pclass == "sanctuary":
            heal = stat_mods.get("health")
            if heal is None or heal <= 0:
                add(Issue(
                    rule_id="SANCTUARY_NO_POSITIVE_HEAL",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.stat_mods.health",
                    message="Sanctuary pages must include positive stat_mods.health > 0.",
                    suggested_fix="Add stat_mods: {\"health\": 20} (or similar)."
                ))
            else:
                total_direct_heal += int(heal)

            if len(choices_list) == 0:
                add(Issue(
                    rule_id="SANCTUARY_DEAD_END",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.choices",
                    message="Sanctuary pages must have forward choices (not a dead end).",
                    suggested_fix="Add at least one choice to continue forward."
                ))

            negatives = {k: v for k, v in stat_mods.items() if v < 0}
            if negatives:
                add(Issue(
                    rule_id="SANCTUARY_NEGATIVE_STATMOD_WARN",
                    severity="warning",
                    page_id=pid,
                    path=f"pages.{pid}.stat_mods",
                    message=f"Sanctuary has negative stat_mods {negatives}. Sanctuaries should be purely positive.",
                    suggested_fix="Remove negative stat mods or change page_type."
                ))

            cursed_found = False
            for it in normalize_page_add_items(page):
                stats = extract_item_stats(it)
                if any(v < 0 for v in stats.values()):
                    cursed_found = True
            for idx, c in enumerate(choices_list):
                for it in normalize_choice_add_items(c):
                    stats = extract_item_stats(it)
                    if any(v < 0 for v in stats.values()):
                        cursed_found = True
            if cursed_found:
                add(Issue(
                    rule_id="SANCTUARY_NEGATIVE_ITEM_FORBIDDEN",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}",
                    message="Sanctuary pages must not grant items with negative stats (cursed items).",
                    suggested_fix="Move cursed item to an armory page or make the page non-sanctuary."
                ))

        # Armory rules + "items imply armory"
        gives_items = has_any_items(page)
        if pclass == "armory":
            if not gives_items:
                add(Issue(
                    rule_id="ARMORY_WITHOUT_ITEMS",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}",
                    message="Armory pages must grant at least one item.",
                    suggested_fix="Add add_items or choice add_item/add_items."
                ))
        else:
            if gives_items and pclass not in ("start", "action"):
                add(Issue(
                    rule_id="ITEM_PAGE_NOT_ARMORY",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.page_type",
                    message="Any page that gives an item must have page_type 'armory' (unless it's start/action).",
                    suggested_fix="Set page_type to 'armory' for this page."
                ))

        # Locked rules
        if pclass == "locked":
            gated = 0
            unlocked = 0
            for idx, c in enumerate(choices_list):
                # BUG-COMPAT: Count requires_items (plural list) as a gate too
                if choice_has_any_item_requirement(c, warnings, pid, f"pages.{pid}.choices[{idx}]"):
                    gated += 1
                else:
                    cond_stat = extract_choice_stat_condition(c)
                    if cond_stat is not None:
                        stat_name, minv = cond_stat
                        if base_stats.get(stat_name, -10**9) >= minv:
                            unlocked += 1
                    else:
                        unlocked += 1

            if gated == 0:
                add(Issue(
                    rule_id="LOCKED_NO_GATED_CHOICE",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.choices",
                    message="Locked pages must have at least one choice requiring an item (requires_item or requires_items).",
                    suggested_fix="Add requires_item to at least one choice."
                ))
            if unlocked == 0:
                add(Issue(
                    rule_id="LOCKED_NO_UNLOCKED_ALTERNATIVE",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.choices",
                    message="Locked pages must have at least one unlocked alternative choice to avoid softlocks.",
                    suggested_fix="Add a choice without requires_item (and ideally without unmet stat conditions)."
                ))

        # Choice target integrity + edges
        for idx, c in enumerate(choices_list):
            # BUG-4: resolve target = target or next_page
            target = resolve_choice_target(c)
            if target is None:
                add(Issue(
                    rule_id="CHOICE_TARGET_MISSING",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.choices[{idx}].target",
                    message="Choice is missing a string 'target' (or 'next_page').",
                    suggested_fix="Set target to a valid page_id."
                ))
                continue
            if not page_exists(target):
                # BUG-5: Check if target resolves after trimming
                if page_exists_trimmed(target):
                    add(Issue(
                        rule_id="CHOICE_TARGET_WHITESPACE",
                        severity="warning",
                        page_id=pid,
                        path=f"pages.{pid}.choices[{idx}].target",
                        message=f"Choice target '{target}' only resolves after trimming whitespace from the page key. May fail at runtime.",
                        suggested_fix=f"Rename the destination page key to '{target.strip()}' (remove surrounding whitespace)."
                    ))
                    # Still add the edge using trimmed key for reachability
                    real_target = trimmed_key_map[target.strip()]
                    edges_all.append((pid, real_target, "choice_whitespace"))
                else:
                    add(Issue(
                        rule_id="CHOICE_TARGET_MISSING",
                        severity="error",
                        page_id=pid,
                        path=f"pages.{pid}.choices[{idx}].target",
                        message=f"Choice target '{target}' does not exist.",
                    ))
                continue

            edges_all.append((pid, target, "choice"))

            # Determine if this edge is traversable without items/flags
            has_item_req = choice_has_any_item_requirement(c, warnings, pid, f"pages.{pid}.choices[{idx}]")
            cond_stat = extract_choice_stat_condition(c)
            req_flags = c.get("requires_flags")
            has_flag_req = isinstance(req_flags, list) and len(req_flags) > 0

            if not has_item_req and not has_flag_req:
                if cond_stat is None:
                    edges_no_items.append((pid, target))
                else:
                    stat_name, minv = cond_stat
                    if base_stats.get(stat_name, -10**9) >= minv:
                        edges_no_items.append((pid, target))

    # Dead ends: no outgoing edges except endings and game_over
    outgoing: Dict[str, int] = {pid: 0 for pid in pages.keys()}
    for src, _, _ in edges_all:
        outgoing[src] = outgoing.get(src, 0) + 1

    for pid, page in pages.items():
        if not isinstance(page, dict):
            continue
        pclass = classify(pid, page)
        if pclass in ("ending", "game_over"):
            continue
        if outgoing.get(pid, 0) == 0:
            add(Issue(
                rule_id="DEAD_END_PAGE",
                severity="error",
                page_id=pid,
                path=f"pages.{pid}",
                message="Page is a dead end but is not an ending or game_over.",
                suggested_fix="Add choices or an action to move forward."
            ))

    # Cycle detection — allow game_over -> start_page AND any page whose choices
    # are all reset_game: true back to start (e.g. a 'the_end' credit screen with
    # a 'Play Again' button — same semantics as game_over but a different page_id).
    allow_edges: Set[Tuple[str, str]] = set()
    if start_page:
        for pid, page in pages.items():
            if not isinstance(page, dict):
                continue
            choices_here = [c for c in page.get("choices", []) if isinstance(c, dict)]
            if choices_here and all(
                c.get("reset_game") is True
                and (c.get("target") == start_page or c.get("next_page") == start_page)
                for c in choices_here
            ):
                allow_edges.add((pid, start_page))
    graph: Dict[str, List[str]] = {pid: [] for pid in pages.keys()}
    for src, dst, _ in edges_all:
        graph.setdefault(src, []).append(dst)

    cycle = find_cycle(graph, allow_edges=allow_edges)
    if cycle:
        add(Issue(
            rule_id="NAVIGATION_CYCLE_DETECTED",
            severity="error",
            message="Navigation graph contains a cycle (backwards navigation / loop).",
            path="pages",
            suggested_fix="Remove links that point back to earlier pages. Cycles are not allowed."
        ))
        info.append(Issue(
            rule_id="NAVIGATION_CYCLE_PATH",
            severity="info",
            message="Cycle path: " + " -> ".join(cycle)
        ))

    # Reachability without items: must reach at least one ending
    if start_page and start_page in pages:
        reachable_no_items = reachable_nodes(start_page, edges_no_items)
        reachable_endings = [pid for pid in ending_pages if pid in reachable_no_items]
        if not reachable_endings:
            add(Issue(
                rule_id="NO_ENDING_REACHABLE_WITHOUT_ITEMS",
                severity="error",
                message="No ending is reachable from start_page without requiring items (or unmet base stat conditions).",
                suggested_fix="Ensure at least one ending path exists via unlocked choices."
            ))

        # Unreachable pages warning (ignoring conditions)
        reachable_any = reachable_nodes(start_page, [(s, d) for s, d, _ in edges_all])
        for pid in pages.keys():
            if pid not in reachable_any:
                add(Issue(
                    rule_id="UNREACHABLE_PAGE_WARN",
                    severity="warning",
                    page_id=pid,
                    message="Page is unreachable from start_page (ignoring conditions).",
                    suggested_fix="Add a path to this page or remove it."
                ))

    # BUG-2: requires_item reachability check — warn if required item never acquirable
    # Collect all requires_item/requires_items across all choices
    for pid, page in pages.items():
        if not isinstance(page, dict):
            continue
        for idx, c in enumerate(page.get("choices", [])):
            if not isinstance(c, dict):
                continue
            ri = c.get("requires_item")
            if isinstance(ri, str) and ri not in all_item_names:
                add(Issue(
                    rule_id="REQUIRES_ITEM_NEVER_GIVEN",
                    severity="warning",
                    page_id=pid,
                    path=f"pages.{pid}.choices[{idx}].requires_item",
                    message=f"Choice requires item '{ri}' but this item is never given anywhere in the game.",
                    suggested_fix=f"Add an armory page or choice that grants '{ri}', or remove the requires_item gate."
                ))
            ris = c.get("requires_items")
            if isinstance(ris, list):
                for ri_item in ris:
                    if isinstance(ri_item, str) and ri_item not in all_item_names:
                        add(Issue(
                            rule_id="REQUIRES_ITEM_NEVER_GIVEN",
                            severity="warning",
                            page_id=pid,
                            path=f"pages.{pid}.choices[{idx}].requires_items",
                            message=f"Choice requires item '{ri_item}' (from requires_items list) but this item is never given anywhere in the game.",
                            suggested_fix=f"Add an armory page or choice that grants '{ri_item}', or remove the gate."
                        ))

    # Balance warnings
    total_pages = len([p for p in pages.values() if isinstance(p, dict)])
    if total_pages > 0:
        action_ratio = len(action_pages) / total_pages
        sanctuary_ratio = len(sanctuary_pages) / total_pages
        armory_ratio = len(armory_pages) / total_pages
        locked_ratio = len(locked_pages) / total_pages
        ending_ratio = len(ending_pages) / total_pages

        def ratio_warn(rule_id: str, ratio: float, lo: float, hi: float, label: str):
            if ratio < lo or ratio > hi:
                add(Issue(
                    rule_id=rule_id,
                    severity="warning",
                    message=f"{label} ratio {ratio:.1%} is outside recommended range [{lo:.0%}, {hi:.0%}]."
                ))

        ratio_warn("RATIO_ACTION_OUT_OF_RANGE", action_ratio, 0.03, 0.12, "Action pages")
        ratio_warn("RATIO_SANCTUARY_OUT_OF_RANGE", sanctuary_ratio, 0.02, 0.08, "Sanctuary pages")
        ratio_warn("RATIO_ARMORY_OUT_OF_RANGE", armory_ratio, 0.03, 0.10, "Armory pages")
        ratio_warn("RATIO_LOCKED_OUT_OF_RANGE", locked_ratio, 0.01, 0.08, "Locked pages")
        ratio_warn("RATIO_ENDINGS_OUT_OF_RANGE", ending_ratio, 0.05, 0.15, "Ending pages")

        if total_enemy_damage > 0:
            heal = total_direct_heal
            dmg = total_enemy_damage
            if heal < 0.5 * dmg or heal > 1.5 * dmg:
                add(Issue(
                    rule_id="HEALING_DAMAGE_IMBALANCE_WARN",
                    severity="warning",
                    message=f"Healing vs combat damage looks imbalanced. direct_heal={heal}, total_enemy_damage={dmg}.",
                    suggested_fix="Adjust sanctuary healing totals or enemy_damage values so healing roughly matches realistic damage."
                ))

    # Strict mode: warnings become errors
    if strict and warnings:
        for w in list(warnings):
            errors.append(Issue(
                rule_id=w.rule_id,
                severity="error",
                message=w.message,
                page_id=w.page_id,
                path=w.path,
                suggested_fix=w.suggested_fix
            ))
        warnings.clear()

    valid = len(errors) == 0
    return Report(valid=valid, errors=errors, warnings=warnings, info=info)


# ----------------------------
# Graph utilities
# ----------------------------

def reachable_nodes(start: str, edges: List[Tuple[str, str]]) -> Set[str]:
    adj: Dict[str, List[str]] = {}
    for s, d in edges:
        adj.setdefault(s, []).append(d)
    seen: Set[str] = set()
    stack = [start]
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        for nxt in adj.get(cur, []):
            if nxt not in seen:
                stack.append(nxt)
    return seen


def find_cycle(graph: Dict[str, List[str]], allow_edges: Optional[Set[Tuple[str, str]]] = None) -> Optional[List[str]]:
    """
    Detect any cycle in directed graph.
    If allow_edges is provided, ignore those edges for cycle detection.
    This is used to exempt intentional replay loops (game_over -> start, the_end -> start).
    Returns a cycle path list if found.
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color: Dict[str, int] = {n: WHITE for n in graph.keys()}
    parent: Dict[str, Optional[str]] = {n: None for n in graph.keys()}

    def neighbors(u: str) -> List[str]:
        nbrs = graph.get(u, [])
        if allow_edges:
            return [v for v in nbrs if (u, v) not in allow_edges]
        return nbrs

    def dfs(u: str) -> Optional[List[str]]:
        color[u] = GRAY
        for v in neighbors(u):
            if v not in color:
                color[v] = WHITE
                parent[v] = None
            if color[v] == WHITE:
                parent[v] = u
                cyc = dfs(v)
                if cyc:
                    return cyc
            elif color[v] == GRAY:
                # found back edge u->v; reconstruct cycle
                cycle = [v]
                cur = u
                while cur is not None and cur != v:
                    cycle.append(cur)
                    cur = parent[cur]
                cycle.append(v)
                cycle.reverse()
                return cycle
        color[u] = BLACK
        return None

    for node in list(graph.keys()):
        if color.get(node, WHITE) == WHITE:
            cyc = dfs(node)
            if cyc:
                return cyc
    return None


# ----------------------------
# CLI
# ----------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description="Validate a Dungeon Mastron game.json.")
    ap.add_argument("game_json", help="Path to game.json")
    ap.add_argument("--strict", action="store_true", help="Treat warnings as errors.")
    ap.add_argument("--pretty", action="store_true", help="Print a human-friendly summary instead of JSON.")
    args = ap.parse_args()

    try:
        with open(args.game_json, "r", encoding="utf-8") as f:
            game = json.load(f)
    except Exception as e:
        print(json.dumps({
            "valid": False,
            "errors": [{"rule_id": "FILE_READ_ERROR", "severity": "error", "message": str(e)}],
            "warnings": [],
            "info": []
        }, indent=2))
        return 1

    report = validate(game, strict=args.strict)

    if args.pretty:
        print("VALID" if report.valid else "INVALID")
        if report.errors:
            print(f"\nErrors ({len(report.errors)}):")
            for e in report.errors:
                loc = f"[{e.page_id}]" if e.page_id else ""
                where = f" @ {e.path}" if e.path else ""
                print(f" - {e.rule_id} {loc}{where}: {e.message}")
                if e.suggested_fix:
                    print(f"   fix: {e.suggested_fix}")
        if report.warnings:
            print(f"\nWarnings ({len(report.warnings)}):")
            for w in report.warnings:
                loc = f"[{w.page_id}]" if w.page_id else ""
                where = f" @ {w.path}" if w.path else ""
                print(f" - {w.rule_id} {loc}{where}: {w.message}")
                if w.suggested_fix:
                    print(f"   fix: {w.suggested_fix}")
        if report.info:
            print(f"\nInfo ({len(report.info)}):")
            for i in report.info:
                print(f" - {i.rule_id}: {i.message}")
    else:
        print(report.to_json())

    return 0 if report.valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
