#!/usr/bin/env python3
"""
Dungeon Mastron Game Validator (v1.0)

Usage:
  python validate_dungeon_mastron.py path/to/game.json
  python validate_dungeon_mastron.py path/to/game.json --strict

Exit codes:
  0 = valid (no errors)
  1 = errors found
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


def extract_choice_requires_item(choice: Dict[str, Any], issues: List[Issue], page_id: str, choice_path: str) -> Optional[str]:
    """
    Supports:
      - requires_item: "id"
      - condition: { has_item: "id" } (legacy)
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


def has_any_items(page: Dict[str, Any]) -> bool:
    if isinstance(page.get("add_items"), list) and len(page["add_items"]) > 0:
        return True
    if isinstance(page.get("choices"), list):
        for c in page["choices"]:
            if isinstance(c, dict):
                if isinstance(c.get("add_item"), dict):
                    return True
                if isinstance(c.get("add_items"), list) and len(c["add_items"]) > 0:
                    return True
    return False


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

    start_page = game.get("start_page")
    if isinstance(start_page, str):
        if start_page not in pages:
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

        # Action rules
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
            if atype not in ("combat", "dice"):
                add(Issue(
                    rule_id="ACTION_MISSING_FIELDS",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.action.type",
                    message="action.type must be 'combat' or 'dice'.",
                    suggested_fix="Set action.type to 'combat' or 'dice'."
                ))

            succ = action.get("success_page")
            fail = action.get("failure_page")
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
                if succ not in pages:
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

                if fail not in pages:
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

            if atype == "combat":
                dmg = action.get("enemy_damage")
                if not isinstance(dmg, (int, float)) or isinstance(dmg, bool) or dmg <= 0:
                    add(Issue(
                        rule_id="COMBAT_ENEMY_DAMAGE_INVALID",
                        severity="error",
                        page_id=pid,
                        path=f"pages.{pid}.action.enemy_damage",
                        message="Combat actions must have enemy_damage > 0.",
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

        # Ending rules
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
                add(Issue(
                    rule_id="ENDING_HAS_CHOICES",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.choices",
                    message="Ending pages must have no forward choices (choices must be []).",
                    suggested_fix="Set choices to [] or remove choices."
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
                req_item = extract_choice_requires_item(c, warnings, pid, f"pages.{pid}.choices[{idx}]")
                cond_stat = extract_choice_stat_condition(c)
                if req_item is not None:
                    gated += 1
                else:
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
                    message="Locked pages must have at least one choice requiring an item.",
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
            target = c.get("target")
            if not isinstance(target, str):
                add(Issue(
                    rule_id="CHOICE_TARGET_MISSING",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.choices[{idx}].target",
                    message="Choice is missing a string 'target'.",
                    suggested_fix="Set target to a valid page_id."
                ))
                continue
            if target not in pages:
                add(Issue(
                    rule_id="CHOICE_TARGET_MISSING",
                    severity="error",
                    page_id=pid,
                    path=f"pages.{pid}.choices[{idx}].target",
                    message=f"Choice target '{target}' does not exist.",
                ))
                continue

            edges_all.append((pid, target, "choice"))

            req_item = extract_choice_requires_item(c, warnings, pid, f"pages.{pid}.choices[{idx}]")
            cond_stat = extract_choice_stat_condition(c)
            if req_item is None:
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

    # Cycle detection (allow only game_over -> start_page)
    allow_edge = ("game_over", start_page) if start_page else None
    graph: Dict[str, List[str]] = {pid: [] for pid in pages.keys()}
    for src, dst, _ in edges_all:
        graph.setdefault(src, []).append(dst)

    cycle = find_cycle(graph, allow_edge=allow_edge)
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


def find_cycle(graph: Dict[str, List[str]], allow_edge: Optional[Tuple[str, str]] = None) -> Optional[List[str]]:
    """
    Detect any cycle in directed graph.
    If allow_edge is provided, ignore that single edge for cycle detection.
    Returns a cycle path list if found.
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color: Dict[str, int] = {n: WHITE for n in graph.keys()}
    parent: Dict[str, Optional[str]] = {n: None for n in graph.keys()}

    def neighbors(u: str) -> List[str]:
        nbrs = graph.get(u, [])
        if allow_edge and u == allow_edge[0]:
            return [v for v in nbrs if v != allow_edge[1]]
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
        if report.info:
            print(f"\nInfo ({len(report.info)}):")
            for i in report.info:
                print(f" - {i.rule_id}: {i.message}")
    else:
        print(report.to_json())

    return 0 if report.valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
