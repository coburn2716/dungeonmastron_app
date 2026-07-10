<!--
Dungeon Mastron © Artifextron
Community-shared source files. Official development and releases remain with Artifextron.
-->

# Dungeon Mastron – Game Creation Manual (Start → Finish)

This is a practical, step-by-step guide for creating a complete Dungeon Mastron game using the **Visual Game Builder**.

It’s written for someone who has never built a realization of a branching story game before.

**Core idea:** a Dungeon Mastron game is a **set of pages** (nodes). Each page shows text (and optionally image/audio), and moves forward through **choices** or a single **action** (dice/combat/boss).

---

## 0) What you’ll build

You’ll create a folder that contains:

```
MY_GAME/
  game.json
  images/
  audio/
  bezels/
  action_bezel/
  fonts/
  (optional) logo.png
```

You’ll test it in:

- **Web Player** (`/play/`)
- **Physical Console** (`console.py` on Raspberry Pi)

---

## 1) Two ways to build a game

### Path A – Visual Builder first (recommended)
1. Sketch your story (start, a few branches, an ending).
2. Build pages and links in the Visual Game Builder.
3. Add images/audio later.
4. Download `game.json`.
5. Put it in a game folder with optional assets.
6. Test in Web Player and/or on the Console.

### Path B – AI draft → import → edit
1. Use the AI Companion template (`/ai/` → `ai/index.md`) to generate a full `game.json` draft.
2. Upload it into the Visual Builder.
3. Fix structure issues, wiring, and pacing.
4. Download the cleaned `game.json`.
5. Add images/audio/bezels/fonts.
6. Test.

---

## 2) Launch the Visual Game Builder

Open:

- `Future Version/builder/index.html`

The builder is a single-page app with:

- a **canvas** (graph of pages)
- a **legend + checks panel** (left overlay)
- a **properties panel** (right side) for editing the selected page
- a **top toolbar** for project-level actions (download/upload/analysis)

---

## 3) Game file format (mental model)

At a high level, your `game.json` contains:

```json
{
  "title": "My Game",
  "start_page": "start",
  "theme": { "preset": "fantasy" },
  "player_stats": { "health": 100, "strength": 2, "luck": 0 },
  "font_colors": { "main": "#e8e3d9", "choices": "#d97757", "stats": "#e8e3d9", "items": "#e8e3d9" },
  "font_sizes": { "main": 20, "choices": 20, "stats": 20, "items": 20 },
  "font_positions": { "choices": 52, "main": 61 },
  "pages": {
    "start": {
      "page_type": "normal",
      "text": "Your story begins...",
      "choices": [
        { "text": "Go left", "target": "left" },
        { "text": "Go right", "target": "right" }
      ]
    }
  }
}
```

### Page types
Use `page_type` to describe what a page *is*:

- `normal` – most pages
- `locked` – any page that has at least one gated choice (`requires_item` / `requires_flags`)
- `sanctuary` – rest/healing moments
- `armory` – reward/equipment moments
- `ending` – a real ending
- `game_over` – shown when HP hits 0 (usually)

### Choices vs Actions (important)
- **Choice pages** have `choices: [...]`.
- **Action pages** have an `action: {...}` object, and the builder will force `choices: []`.

---

## 4) Builder tour (every major button + panel)

### 4.1 Top toolbar (project actions)

Buttons in the builder header:

- **Settings** – game-wide settings (title, theme, fonts, layout positions)
- **Add Page** – creates a new page node
- **Auto-Layout** – reorganizes nodes into a readable layout
- **Layout Style dropdown** – changes how Auto-Layout behaves
- **Example** – replaces your current project with a feature-rich example game
- **Upload** – imports a `game.json` file (replaces current work)
- **Animations** – downloads `animation_manifest.json` for Ken Burns video generation
- **Download** – exports your `game.json` (with cleanup/normalization)
- **Analysis** – opens the analysis/validation modal (stats + warnings)
- **Clear** – wipes the current project data

Notes from the implementation:

- **Download** removes `node_positions`, removes auto-filled filenames like `${pageId}.jpg`, `${pageId}.wav`, `${pageId}_sfx.wav`, and strips the workflow flag `page.ready`.
- **Download** also normalizes item fields: `stat_mods` → `stats` inside items.
- **Upload** will map choice `target` into `next_page` for editor compatibility (and keeps both).

### 4.2 Canvas controls (navigation)

Bottom-right:

- `+` zoom in
- `-` zoom out
- **Reset View**

### 4.3 Legend + progress + checks (left overlay)

The legend explains:

- Node colors (page types)
- Link types (Choice A/B/C, Action success/failure, boss stage)
- Markers (items, key items, stat mods, flags)

**Progress**
- Ready / Total counter (based on `page.ready`)

**Shortcuts (hold key + drag between nodes)**
- `1-3` connect Choice A/B/C
- `4` connect Action Success
- `5` connect Action Failure
- `6` connect Boss Stage
- `7` remove link
- `8` mark ready
- `9` add page
- `0` delete selected page

**Checks panel**
- Unlinked nodes
- Backtrack (cycles)
- Unlinked action nodes (missing success/failure)
- Unreachable from start

### 4.4 Build Mode (“Lane Builder”)

Build Mode is a fast way to generate a blank graph layout.

- Click **Build Mode**
- Choose number of rows and how many nodes per row
- Click **Apply** to replace your current graph with the generated nodes

This is ideal when you want to quickly outline a 40–120 page game as empty placeholders (`p001`, `p002`, ...).

---

## 5) Creating your first playable skeleton

### Step 1: Create 5 pages
Make a tiny game first:

1. `start`
2. `left`
3. `right`
4. `ending_good`
5. `ending_bad`

In the builder:

1. Click **Add Page** until you have 5 nodes.
2. Click each node and rename its ID if the builder exposes it (some builds use page IDs directly; others create defaults).
3. In **Settings**, set **Start Page** to your start page ID.

### Step 2: Write page text
Select each node and fill:

- **Display Name** (optional, for you)
- **Page Text** (what the player reads)

### Step 3: Add choices
On the `start` node:

- Add 2 choices: “Go left” → `left`, “Go right” → `right`

On `left`:

- Choice: “Continue” → `ending_good`

On `right`:

- Choice: “Continue” → `ending_bad`

### Step 4: Mark endings
Set `page_type`:

- `ending_good` → `ending`
- `ending_bad` → `ending`

Now you have a complete playable loop.

---

## 6) Page properties (what everything means)

When you click a node, the right panel edits that page.

### 6.1 Workflow
- **Mark as Ready** → sets `page.ready` (builder workflow only; removed on download)

### 6.2 Page type
Radio options set `page.page_type`:

- `normal`, `ending`, `sanctuary`, `armory`, `locked`, `game_over`

### 6.3 Special Pages (full-screen)
Special Pages are “chapter cards” / prologues / boss reveals.

When enabled, a page uses:

- `special_page: true`
- optional `special_bg` (image filename)
- optional `special_padding` (text box margins)
- optional `continue_y` (continue prompt placement)
- optional `continue_text` and styling overrides

Important rule (from the system): **Special Pages should have exactly one “Continue” choice and no actions.**

### 6.4 Media fields
You can attach:

- `image` (defaults to `<page_id>.jpg` if not set)
- `speech_file` (defaults to `<page_id>.wav` if not set)
- `sound_file` (defaults to `<page_id>_sfx.wav` if not set)
- `animation_effect` (Ken Burns preset)

### 6.5 LED effects
`led_effect` drives the physical console LEDs:

```json
"led_effect": { "type": "pulse", "color": "blue", "speed": 1.0 }
```

Semantic rules you should follow:

- **Red** only when an action button interaction is needed (dice/combat)
- **Orange** danger / tension / game over
- **Blue** normal exploration/story
- **Green** healing / success / treasure

### 6.6 Page-level stat changes
The builder uses `stat_mods` on the page:

```json
"stat_mods": { "health": -10, "luck": 1 }
```

Use page-level `stat_mods` for “automatic” effects that happen when entering a page.

### 6.7 Choice-level stat changes
For a specific choice, use:

```json
"modify_stats": { "health": -5 }
```

Use this when choices represent different approaches (safe vs risky), or to satisfy “fake choice” detection.

### 6.8 Items

Items can be given on a **page** or on a **choice**.

There are two main patterns:

#### Enhanced item object (recommended for non-key items)
```json
"add_item": {
  "name": "steel_sword",
  "display_name": "Steel Sword",
  "stats": { "strength": 2 },
  "quantity": 1
}
```

#### Key items (allowed to have no stats)
```json
"add_item": {
  "name": "temple_key",
  "display_name": "Temple Key",
  "quantity": 1
}
```

Important linking rule:

- Always reference the **internal** `name` in `requires_item`.

### 6.9 Gating (locked choices)

You can lock a choice behind:

- `requires_item`: single item
- `requires_items`: multiple items (must have all)
- `requires_flags`: flags (state)

Example:

```json
{
  "text": "Open the maintenance door",
  "target": "inside",
  "requires_item": "temple_key"
}
```

If *any* choice on a page is gated, set the page’s `page_type` to `locked` so the builder highlights it.

### 6.10 Flags (state)

Flags are story state that isn’t an item.

Set flags:

- On enter: `set_flags_on_enter: [...]`
- On choice: `set_flags: [...]`

Require flags:

- `requires_flags: [...]`

Flags are great for “you met the stranger” / “you learned the password” / “you already opened the vault”.

---

## 7) Actions (dice, combat, boss)

Actions are what make the physical console feel physical: the player presses the action button, and the system resolves an outcome.

### 7.1 Dice action (player vs environment)

Use dice for traps, stealth, jumps, endurance.

```json
"action": {
  "type": "dice",
  "prompt": "DODGE!",
  "stat_bonus": "luck",
  "dice": 20,
  "target": 11,
  "failure_damage": 20,
  "success_page": "safe",
  "failure_page": "hurt"
}
```

### 7.2 Combat action (player vs enemy)

Use combat when there’s an active opponent trying to hurt the player.

```json
"action": {
  "type": "combat",
  "prompt": "FIGHT!",
  "stat_bonus": "strength",
  "player_bonus": 0,
  "enemy_bonus": 6,
  "enemy_damage": 30,
  "success_page": "win",
  "failure_page": "wounded"
}
```

### 7.3 Boss action (multi-stage)

Boss fights are chained stages.

- Each boss page points to the next stage with `stage_page`.
- Each stage has success/failure routing and damage.

```json
"action": {
  "type": "boss",
  "action_name": "Stone Guardian",
  "prompt": "HOLD YOUR GROUND!",
  "stat_bonus": "strength",
  "player_bonus": 1,
  "enemy_bonus": 7,
  "enemy_damage": 25,
  "stage_page": "boss_stage_2",
  "success_page": "boss_stage_2",
  "failure_page": "wounded"
}
```

Boss design expectations (from the system guidance):

- mini-boss: exactly 3 stages
- final boss: exactly 5 stages

### 7.4 Avoid these common action bugs

#### Double-damage bug
Don’t apply damage twice for the same failure.

- Damage should live in the **action object** (`enemy_damage` or `failure_damage`).
- Your failure page should not repeat that damage in `stat_mods`.

#### Action bypass
If your text describes unavoidable danger, don’t provide a “skip to safety” choice.
Either:

- route all choices into the action, or
- make the bypass itself a risky action.

The builder warns about both bugs at download time.

---

## 8) The “Analysis” modal (why it matters)

Click **Analysis** to run a deep pass over your game.

It will compute:

- counts of page types
- broken links
- action nodes missing success/failure
- overall branching/structure stats
- combat/dice/boss listings and total damage

Use it frequently while building.

---

## 9) Exporting your game (Download)

When you click **Download**, the builder exports `game.json` and does a few important cleanups:

- removes the builder-only `node_positions`
- removes builder workflow fields like `ready`
- removes auto-filled filenames that match default patterns
- normalizes item fields: `stat_mods` → `stats` inside items

You should always playtest the downloaded file, not just the in-builder state.

---

## 10) Put the game on disk (game folder layout)

Use this recommended layout (see `Guides/COMPLETE_PATH_REFERENCE.md`):

```
MY_GAME/
  game.json
  logo.png
  images/
    start.jpg
    ...
    special_pages/
      prologue.jpg
    animations/
      start.mp4
  audio/
    start.wav
    start_sfx.wav
  bezels/
    my_story_bezel.png
  action_bezel/
    my_action_bezel.png
  fonts/
    MyFont.ttf
```

Rules of thumb:

- If you don’t set `page.image`, the runtime will often look for `images/<page_id>.jpg`.
- Special pages commonly use `images/special_pages/<page_id>.jpg` (or `special_bg`).
- Audio can be per-page.
- Bezels and fonts are optional; theme defaults exist on the console.

---

## 11) Testing in the Web Player

Open the web player:

- `Future Version/play/index.html` (bezel-enabled web player)

Typical flow:

1. Load `game.json`
2. Provide assets (folder upload / insert cart style)
3. Play through your start page and branches

What to test:

- every choice link works
- gated choices behave correctly
- actions route to correct success/failure pages
- item pickups actually unlock later routes
- your endings are reachable

---

## 12) Testing on the physical console

The console runtime is:

- `Future Version/console.py`

Copy your `MY_GAME/` folder to the USB/cart and insert it.

The console searches for `game.json` on the USB and uses game assets first, then theme fallbacks on the Pi.

---

## 13) Animations (Ken Burns videos)

Dungeon Mastron supports smooth Ken Burns animations as pre-rendered MP4s.

Workflow:

1. In the builder, choose `animation_effect` per page (or leave random).
2. Click **Animations** to download `animation_manifest.json`.
3. Place `animation_manifest.json` in your game folder.
4. Run the generator script (see `Guides/Animation Guide/ANIMATION_IMPLEMENTATION_GUIDE.md`).
5. Generated videos go into `images/animations/`.

The console will prefer MP4s when present and fall back to still images otherwise.

---

## 14) AI-assisted creation (using `/ai/`)

The AI Companion template (`ai/index.md`) is a detailed “prompt spec” that tells an AI how to generate a complete Dungeon Mastron game.

Recommended workflow:

1. Ask the AI for a game using the template.
2. Paste the returned JSON into a file `game.json`.
3. **Upload** into the Visual Builder.
4. Use **Analysis** to find:
   - broken links
   - action routing errors
   - fake choices
   - locked pages that should be marked `locked`
5. Edit/rewrite inside the builder until it plays well.

Important: the AI template also includes narrative craft rules (text length, pacing, continuity). Use those as your checklist.

---

## 15) Practical “first real game” recipe (recommended)

If you want a reliable way to finish a first full game:

1. Build 30–60 placeholder nodes with **Build Mode**.
2. Decide:
   - 2 endings
   - 2 sanctuary moments
   - 2 armory moments
   - ~20% action pages
3. Connect a main spine first (start → middle → end), then add branches.
4. Only after it plays, add images/audio and polish.
5. Re-run **Analysis** until checks look clean.
6. Download `game.json` and test in Web Player.
7. Package a clean `MY_GAME/` folder.

---

## 16) Troubleshooting checklist

### Choice doesn’t go anywhere
- Ensure `choice.target` (or `choice.next_page`) matches an existing page ID.

### A “locked” choice is always selectable
- Add `requires_item` / `requires_flags` to the choice.
- Ensure you reference the internal item `name`.

### A “locked” choice never unlocks
- Verify you actually add that item/flag earlier.
- Verify item naming matches exactly.

### Console behavior differs from Builder/Web
- Re-test using the downloaded `game.json`.
- Verify your game folder paths match `Guides/COMPLETE_PATH_REFERENCE.md`.

### Weird difficulty spikes
- Check action damage values.
- Check that you didn’t accidentally double-apply damage on failure pages.
- Use the Analysis modal’s action listings.
