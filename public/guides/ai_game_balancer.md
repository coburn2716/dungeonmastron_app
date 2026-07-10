# Deep-Dive JSON Game Balancing – Prompt Instructions (Reasonable Player)

Copy/paste this prompt into your AI tool and fill in the bracketed parts.

---

## Core Prompt

You are a **game-balance analyst**. Perform a deep-dive balance pass on this JSON game file:

- File: `[ABSOLUTE_PATH_TO_GAME_JSON]`

### Goal
Rebalance the game to hit these **death-rate bands** (death = player HP 0):

- **Easy:** 515%
- **Medium:** 1530%
- **Hard:** 3050%
- **Super hard:** 5070%

Target difficulty for this pass: **`[Easy|Medium|Hard|Super hard]`**.

### Measure difficulty using a "reasonable player" model (required)
When estimating death rate, do **not** use purely-random choices. Use a **reasonable player policy**:

1. **Survival priority:** when HP is low, prefer choices that reduce expected HP loss.
2. **Healing preference:** if a choice/rest/sanctuary/first-aid increases HP, prefer it when current HP  `[LOW_HP_THRESHOLD]`.
3. **Risk management:** avoid optional high-risk fights/checks when a safer alternative exists and expected value is better.
4. **Item gating:** if a choice requires an item the player lacks, it cannot be chosen.
5. **Tie-break:** if two options are similar, allow some randomness (e.g. 70/30 split) to avoid overly-deterministic play.

If the JSON does not encode enough to decide what is safer (e.g., missing action rules), **ask clarifying questions** before changing values.

---

## Required: Simulation method (so results are reproducible)

You must estimate difficulty with a lightweight **Monte Carlo simulation** that:

1. Tracks player state:
   - `health/strength/luck` (and any other stats present)
   - inventory items
2. Applies all numeric effects encountered:
   - page `stat_mods`
   - choice `modify_stats`
   - item stats from `add_item` / `add_items`
3. Enforces item locks:
   - if a choice has `requires_item` and the player doesn’t have it, it can’t be chosen
4. Resolves actions with your stated rules (dice/combat/boss), then follows `success_page` / `failure_page`.

### Reasonable-player choice policy (simulate decision-making)
At pages with 2+ available choices, the player should not pick randomly. Use a **rollout policy**:

- For each available choice:
  1. Apply its immediate effects (`modify_stats`, `add_item(s)`)
  2. Run `R` random rollouts from the resulting next page to estimate expected final HP
- Pick the choice with the highest expected HP.
- Add some exploration noise so the policy isn’t perfect:
  - with probability `epsilon`, pick a random available choice.

### Important: model players who sometimes take fun/risky routes
Many players will sometimes take optional risk (e.g., pursuing an optional miniboss) even if it’s not the safest EV choice.
To reflect that, you must report difficulty under **two policies**:

1. **Cautious reasonable-player** (risk-averse)
   - chooses the highest expected-HP option (with small `epsilon` exploration)
2. **Adventurous reasonable-player** (not always safest)
   - still uses rollouts, but is more willing to take non-optimal choices, e.g.:
     - higher `epsilon` (more randomness), and/or
     - “pick 2nd-best option X% of the time” when multiple options exist

When presenting final difficulty, include both death rates (cautious vs adventurous), and tune so the target band holds under the intended play style.

### Default simulation settings (fast)
Use these unless the user overrides:

- `N = 300` full playthroughs
- `R = 6` rollouts per choice
- Cautious: `epsilon = 0.15`
- Adventurous: `epsilon = 0.35` and/or “2nd-best choice 30% of the time”
- terminal conditions:
  - death if `health <= 0`
  - end if `page_type` is `ending` or `game_over` (or a choice has `reset_game: true`)

Report the exact `N/R/epsilon` you used along with the measured death rate.

---

## Hard Constraints (must follow)

1. **Numbers only.** You may adjust numeric parameters such as:
   - `enemy_bonus`, `enemy_damage`
   - `target`, `failure_damage`
   - numeric `stat_mods` / `modify_stats` values (HP, luck, strength, etc.)
2. **Do not change any text.** No edits to story text, choice text, display names.
3. **Do not change structure.** No adding/removing pages, no rewiring links (`target`, `next_page`), no reordering.
4. **Do not change items.** No edits to item definitions (names, stats, availability, counts).
5. **Preserve schema/format.** Output must remain valid JSON.

---

## Required Output Format

1. **Assumptions & rules**
   - State the assumed resolution rules (dice/combat) used for analysis.
   - Define the reasonable-player policy precisely (thresholds and tie-break).

2. **Diagnostics (before changes)**
   - Identify the worst spikes/outliers (healing spikes, unavoidable damage spikes, unfair checks).
   - Report baseline difficulty: estimated death rate under the reasonable-player model.

3. **Patch list (numbers-only, before  after)**
   - For every edited page id, show the exact fields changed and old/new numeric values.

4. **Apply changes to the JSON file**
   - Make the edits directly in the file.

5. **Verification (after changes)**
   - Recompute estimated death rate under the same reasonable-player model.
   - Confirm the result lands in the target band.
   - Validate JSON parses successfully.

---

## Optional Inputs (fill if you can)

- Starting HP and max HP rules (cap? overheal allowed?): `[DETAILS]`
- Expected play style (cautious vs aggressive): `[DETAILS]`
- Run count for simulation (if simulating): `[e.g., 10,000]`
- Low-HP threshold suggestion: `[e.g., 30% of starting HP]`
