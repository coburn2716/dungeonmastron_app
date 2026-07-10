# Dungeon Mastron – Builder/Web Player/Console Reference (UI controls + JSON keys)

This is a working reference sheet that maps **what you see in the UI** → the **HTML element id** (and handler) → the **JSON key** written/read by the system.

Files covered:
- `game_builder.html` (authoring UI)
- `web_player.html` (browser runtime)
- `console.py` (Pi runtime)

---

## 1) `game_builder.html` – Settings Modal (Game Settings)

### 1.1 Live Preview controls (left column)

| UI label | HTML id | Type | Handler / notes |
|---|---:|---|---|
| Preview Page Image | `previewImageFile` | file | Browser preview only |
| Preview Story Bezel | `previewBezelFile` | file | Browser preview only |
| Preview Action Bezel | `previewActionBezelFile` | file | Browser preview only |
| Action State Preview | `actionStateSlider` | range | `oninput="updateActionPreview(this.value)"` (0=Game, 1=Rolling, 2=Failure, 3=Victory) |
| Your Monitor PPI / 2 | `monitorPPI` | number | `oninput="updatePPIInfo(); updatePreview();"` (preview scaling helper) |

Preview DOM elements (not user inputs, but useful references):
- `previewFrame`, `previewImage`, `previewNormalBezel`, `previewActionBezel`
- `previewChoices`, `previewMainText`, `previewStats`, `previewSep`, `previewItems`
- Action overlay preview: `actionOverlay`, `actionText`, `actionDice`

### 1.2 Game information

| UI label | HTML id | Type | JSON key written by `saveSettings()` |
|---|---:|---|---|
| Game Title | `settingsTitle` | text | `gameData.title` |
| Logo Filename | `settingsLogo` | text | `gameData.logo` |
| Start Page | `settingsStartPage` | select | `gameData.start_page` |

### 1.3 Player starting stats

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Health | `settingsHealth` | number | `gameData.player_stats.health` |
| Strength | `settingsStrength` | number | `gameData.player_stats.strength` |
| Luck | `settingsLuck` | number | `gameData.player_stats.luck` |

### 1.4 Theme

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Quick Preset | `settingsTheme` | select | `gameData.theme.preset` (via `loadPresetColors()`) |
| Background Color | `settingsColorBackground` | color | `gameData.theme.custom.background_color` (preview uses it immediately) |
| Primary Text Color | `settingsColorPrimary` | color | `gameData.theme.custom.primary_color` *(UI exists but is currently hidden via inline style)* |
| Accent Color | `settingsColorAccent` | color | `gameData.theme.custom.accent_color` *(hidden)* |
| Secondary Text | `settingsColorSecondary` | color | `gameData.theme.custom.secondary_color` *(hidden)* |

### 1.5 Bezels

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Story Bezel (Bottom UI only) | `settingsBezelBottom` | text | `gameData.bezels.bottom` |
| Action Bezel (Combat/Dice) | `settingsActionBezel` | text | `gameData.action_bezel` |

### 1.6 Font + colors

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Custom Font File (TTF) | `settingsFontFile` | text | `gameData.font_file` *(builder writes/reads this)* |
| Main Text Color | `settingsFontColorMain` | color | `gameData.font_colors.main` |
| Choices Color | `settingsFontColorChoices` | color | `gameData.font_colors.choices` |
| Stats Color | `settingsFontColorStats` | color | `gameData.font_colors.stats` |
| Items Color | `settingsFontColorItems` | color | `gameData.font_colors.items` |
| Separator Color | `settingsFontColorSeparator` | color | `gameData.font_colors.separator` |

Font sizes:

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Main font size | `settingsFontSizeMain` | number | `gameData.font_sizes.main` |
| Choices font size | `settingsFontSizeChoices` | number | `gameData.font_sizes.choices` |
| Stats font size | `settingsFontSizeStats` | number | `gameData.font_sizes.stats` |
| Items font size | `settingsFontSizeItems` | number | `gameData.font_sizes.items` |

### 1.7 Action colors + typography

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Action Text Color | `settingsActionTextColor` | color | `gameData.action_text_color` |
| Action Text Size | `settingsActionTextSize` | number | `gameData.action_text_size` |
| Action Dice Color | `settingsActionDice` | color | `gameData.action_colors.dice` |
| Action Dice Text | `settingsActionDiceText` | color | `gameData.action_colors.dice_text` |

### 1.8 Font positions (PI + WEB)

Each position has **a slider** and a **number input**.

| UI label | Slider id | Number input id | JSON keys written |
|---|---:|---:|---|
| Choices Y-Position (% from bottom) | `settingsPosChoices` | `settingsPosChoicesInput` | `font_positions` (Pi) + `font_positions_web` (Web) |
| Main Text Y-Position (% from bottom) | `settingsPosMain` | `settingsPosMainInput` | `font_positions` + `font_positions_web` |
| Stats Y-Position (% from bottom) | `settingsPosStats` | `settingsPosStatsInput` | `bottom_positions_percent` + `bottom_positions_percent_web` |
| Separator Y-Position (% from bottom) | `settingsPosSeparator` | `settingsPosSeparatorInput` | `bottom_positions_percent` + `bottom_positions_percent_web` |
| Items Y-Position (% from bottom) | `settingsPosItems` | `settingsPosItemsInput` | `bottom_positions_percent` + `bottom_positions_percent_web` |

Numeric input sync function:
- `syncPosFromInput(inputId, rangeId, valueSpanId)`

### 1.9 Text padding / layout

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Main Text Left/Right Padding (%) | `settingsMainTextPadding` | range | `main_text_padding` |
| Top Padding (% extra spacing) | `settingsMainTextTopPadding` | range | `main_text_top_padding` |
| Text Area Height (rows of text) | `settingsTextAreaRows` | range | `text_area_rows` |
| Main Text Max Height (px) | `settingsMainTextMaxHeight` | range | `main_text_max_height` *(present in UI; saved for backward compat)* |
| Text Shadow Opacity | `settingsTextShadowOpacity` | range | `text_shadow_opacity` *(used by preview styling)* |

### 1.10 Action element positions (PI + WEB)

| UI label | Slider id | Number input id | JSON keys written |
|---|---:|---:|---|
| Rolling Text Y Position (% from bottom) | `settingsActionTextY` | `settingsActionTextYInput` | `action_positions_percent` + `action_positions_percent_web` |
| Dice Y Position (% from bottom) | `settingsActionDiceY` | `settingsActionDiceYInput` | `action_positions_percent` + `action_positions_percent_web` |
| Result Text Y Position (% from bottom) | `settingsActionResultY` | `settingsActionResultYInput` | `action_positions_percent` + `action_positions_percent_web` |
| Dice Size (px) | `settingsActionDiceSize` | `settingsActionDiceSizeInput` | `action_styles.dice_size` + `action_styles_web.dice_size` |

Numeric input sync functions:
- `syncActionYFromInput(inputId, rangeId, valueSpanId)`
- `syncActionSizeFromInput(inputId, rangeId, valueSpanId)`

### 1.11 Stat Popup (GAIN / LOSS) (PI + WEB)

Shown in the web player as a floating stat change over the **image/video area** (positive floats up, negative floats down).

| UI label | HTML id | Type | JSON keys written |
|---|---:|---|---|
| Font Size (px) | `settingsStatPopupFontSize` | number | `stat_popup.font_size` (Pi) / `stat_popup_web.font_size` (Web) |
| Duration (ms) | `settingsStatPopupDuration` | number | `stat_popup.duration_ms` / `stat_popup_web.duration_ms` |
| Positive Color | `settingsStatPopupPositive` | color | `stat_popup.positive_color` / `stat_popup_web.positive_color` |
| Negative Color | `settingsStatPopupNegative` | color | `stat_popup.negative_color` / `stat_popup_web.negative_color` |
| Move Distance (px) | `settingsStatPopupMove` | number | `stat_popup.move_px` / `stat_popup_web.move_px` |

Notes:
- Position is currently hard-coded in the runtimes (center of the media area).
- Font family uses the game's **heading font** (web: `--font-heading`).
- Preview element: `previewStatFloatLayer` (shown on Action preview: Failure => negative, Victory => positive).

---

## 2) `game_builder.html` – Page Properties Panel (right panel)

Rendered dynamically by `showProperties(pageId)` into `#propertiesPanel`.

### 2.1 Page readiness

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Mark as Ready | `propReady` | checkbox | `page.ready` |

### 2.2 Page type

| UI label | HTML name | Values | JSON key |
|---|---:|---|---|
| Page Type radio group | `page_type_radio` | `normal`, `ending`, `sanctuary`, `armory`, `locked`, `game_over` | `page.page_type` |

### 2.3 Special page

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Special Page | `propSpecialPage` | checkbox | `page.special_page` |
| Continue Text (optional) | `propContinueText` | text | `page.continue_text` |
| Continue Text Color | `propContinueTextColor` | color | `page.continue_text_color` *(optional override; defaults to theme `font_colors.choices`)* |
| Continue Text Font Size | `propContinueTextSize` | number | `page.continue_text_size` *(optional override; defaults to theme `font_sizes.choices`)* |
| Full-Screen Background Image | `propSpecialBg` | text | `page.special_bg` |
| Text Box Padding (pixels): Top | `propPaddingTop` | number | `page.special_padding.top` |
| Text Box Padding (pixels): Bottom | `propPaddingBottom` | number | `page.special_padding.bottom` |
| Text Box Padding (pixels): Left | `propPaddingLeft` | number | `page.special_padding.left` |
| Text Box Padding (pixels): Right | `propPaddingRight` | number | `page.special_padding.right` |
| “Press button to continue” Y (px from top) | `propContinueY` | number | `page.continue_y` |

### 2.4 Basic properties

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Display Name (optional) | `propDisplayName` | text | `page.display_name` |
| Page Text | `propText` | textarea | `page.text` |

### 2.5 Linked files

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Image Filename | `propImage` | text | `page.image` |
| Ken Burns Animation Effect | `propAnimationEffect` | select | `page.animation_effect` |
| Speech/Narration File | `propSpeech` | text | `page.speech_file` |
| Sound Effect File | `propSound` | text | `page.sound_file` |

### 2.6 LED effects

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| LED Color | `propLedColor` | select | `page.led_effect.color` |
| Effect Type | `propLedType` | select | `page.led_effect.type` |
| Animation Speed | `propLedSpeed` | number | `page.led_effect.speed` |

### 2.7 Add items (page-level)

| UI label | Control | JSON keys |
|---|---|---|
| Add Single Item | `button.btn-panel-action` → `addPageItem()` | `page.add_item` and/or `page.add_items[]` |
| Items list container | `pageItemsList` | (renders current `add_item/add_items`) |

### 2.8 Modify stats (page-level)

| UI label | Control | JSON key |
|---|---|---|
| + Add Stat Modification | button → `addStatMod()` | `page.stat_mods` *(NOTE: builder uses `stat_mods` for page-level, not `modify_stats`)* |
| Stat mods list container | `statModsList` | (renders current `stat_mods`) |

### 2.9 Action Button (page-level)

Action type selector:

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Action Type | `propActionType` | select | `page.action.type` (or deletes `page.action`) |

Common action fields:

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Action Name (display only) | `propActionName` | text | `page.action.action_name` |
| Button Text/Prompt | `propActionPrompt` | text | `page.action.prompt` |
| Stat Bonus (optional) | `propActionStatBonus` | select | `page.action.stat_bonus` |
| Success Page | `propActionSuccess` | select | `page.action.success_page` |
| Failure Page | `propActionFailure` | select | `page.action.failure_page` |
| Boss Stages (Node → Node) | `propActionStage` | select | `page.action.stage_page` |

Dice action fields (`page.action.type === "dice"`):

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Dice Type (d6, d20) | `propDiceType` | number | `page.action.dice` |
| Target Number | `propDiceTarget` | number | `page.action.target` |
| Failure Damage | `propDiceFailureDamage` | number | `page.action.failure_damage` |

Combat action fields (`page.action.type === "combat"`):

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Player Bonus | `propPlayerBonus` | number | `page.action.player_bonus` |
| Enemy Bonus | `propEnemyBonus` | number | `page.action.enemy_bonus` |
| Enemy Damage on Loss | `propEnemyDamage` | number | `page.action.enemy_damage` |

Boss action fields (`page.action.type === "boss"`):

| UI label | HTML id | Type | JSON key |
|---|---:|---|---|
| Player Bonus | `propBossPlayerBonus` | number | `page.action.player_bonus` |
| Enemy Bonus | `propBossEnemyBonus` | number | `page.action.enemy_bonus` |
| Enemy Damage on Loss | `propBossEnemyDamage` | number | `page.action.enemy_damage` |

Implementation note: when an action type is set, the builder forces `page.choices = []`.

### 2.10 Choices editor (page-level)

Shown only when no `page.action.type` is selected:

| UI element | HTML id | Notes |
|---|---:|---|
| Choices section wrapper | `choicesSection` | hidden when action type is set |
| + Add Choice button | (button) | calls `addChoiceUI()` |
| Choices list container | `choicesList` | rendered by `updateChoicesList()` |

Per-choice controls are generated dynamically and use handlers instead of stable ids.

Core choice fields:
- Choice Text: `<input onchange="updateChoice(i, 'text', this.value)">` → `choice.text`
- Next Page: `<select onchange="updateChoice(i, 'next_page', this.value)">` → `choice.next_page` (builder also reads `choice.target`)

Advanced options block:
- Requires Item checkbox: `id="choice-${i}-requires"` → `updateChoiceRequires(i, checked)` → sets `choice.requires_item`
- Add Item to Player button: `addChoiceItem(i)` → pushes to `choice.add_items[]`
- Modify Player Stats button: `addChoiceStatMod(i)` → updates `choice.modify_stats`
- Reset Entire Game checkbox: `id="choice-${i}-reset"` → `updateChoice(i, 'reset_game', checked)`

---

## 3) `web_player.html` – User-facing controls and DOM ids

### 3.1 Top bar buttons / inputs

| UI label | HTML id | Type | Notes |
|---|---:|---|---|
| Insert Cart | `pick-folder` | button | Uses directory picker; falls back to `asset-folder` upload |
| View: Screen / View: Console | `zoom-btn` | button | Toggles zoom mode and recalculates layout |

Hidden inputs:

| UI | HTML id | Type |
|---|---:|---|
| Load game.json | `game-file` | file input |
| Upload assets/folder | `asset-folder` | file input (webkitdirectory) |

### 3.2 Action + choices

| UI | DOM | Notes |
|---|---|---|
| Choices container | `#choices` | rendered by `renderChoices(page)` |
| Main text container | `#main-text` | rendered by `renderChoices(page)` |
| Action HUD overlay | `#action-hud` | contains dice + prompt + status |
| Action die SVG | `#hud-dice-svg` / `#hud-dice-text` | SVG hex dice |

### 3.3 Debug/overlay

| UI | HTML id |
|---|---:|
| Log panel | `log` |
| Overlay modal | `overlay`, `overlay-title`, `overlay-body`, `overlay-foot` |

### 3.4 JSON keys consumed by the web player (high level)

Top-level:
- `title`, `logo`, `start_page`
- `theme.preset`, `theme.custom.*`
- `player_stats` (health/strength/luck)
- `font_sizes`, `font_colors`
- `font_positions_web` / `font_positions`
- `bottom_positions_percent_web` / `bottom_positions_percent`
- `bottom_pixel_positions_web` / `bottom_pixel_positions` (legacy)
- `main_text_padding`, `main_text_top_padding`, `text_area_rows`, `main_text_max_height`
- `bezels.bottom`
- `action_bezel`
- `action_colors`, `action_text_size`, `action_text_color`
- `action_positions_percent_web` / `action_positions_percent`
- `action_styles_web` / `action_styles`
- `stat_popup_web` / `stat_popup`

Per-page:
- `text`, `choices[]`, `special_page`, `special_bg`, `special_padding`, `continue_y`
- `image`, `speech_file`, `sound_file`, `animation_effect`
- `led_effect`
- `add_item` / `add_items`
- `stat_mods`
- `action` (object, when using action pages)

---

## 4) `console.py` – JSON keys used (high level)

Console behavior generally mirrors the builder’s JSON model.

Top-level keys used:
- Theme + bezels (including theme default fallbacks)
- `action_bezel` is loaded from USB `action_bezel/<file>`
- Action rendering uses: `action_colors`, `action_text_color`, `action_text_size`, `action_positions_percent`
- Stat popup styling (Pi): `stat_popup` (`font_size`, `positive_color`, `negative_color`, `duration_ms`, `move_px`)

Per-page keys used:
- `special_page`, `special_bg`, `special_padding`, `continue_y`
- Auto-video for special pages: tries `images/special_pages/<stem>.mp4` first
- Ken Burns videos (non-special): `images/animations/<stem>.mp4` (if present)
- Action pages: expects `page.action` object with `type` (`dice`/`combat`/`boss`), bonuses/damage/targets, and success/failure routing.

---

## 5) JSON “feature” key cheat-sheet (things you asked to include)

### 5.1 Action (dice)
Stored on a page as:
```json
"action": {
  "type": "dice",
  "prompt": "Press Action to roll",
  "stat_bonus": "luck",
  "dice": 6,
  "target": 12,
  "failure_damage": 20,
  "success_page": "...",
  "failure_page": "..."
}
```

### 5.2 Action (combat)
```json
"action": {
  "type": "combat",
  "prompt": "Press Action to fight",
  "stat_bonus": "strength",
  "player_bonus": 0,
  "enemy_bonus": 6,
  "enemy_damage": 30,
  "success_page": "...",
  "failure_page": "..."
}
```

### 5.3 Page-level stat changes
Builder uses:
```json
"stat_mods": { "health": -10, "strength": 1, "luck": 2 }
```

Choice-level stat changes:
```json
"modify_stats": { "health": -10 }
```

### 5.4 Giving items

On a page:
```json
"add_item": { "name": "torch", "display_name": "Torch", "stats": {"luck": 1} }
```
or
```json
"add_items": [ { "name": "torch", "display_name": "Torch" } ]
```

On a choice:
```json
"add_item": { "name": "key", "display_name": "Temple Key" }
```
or
```json
"add_items": [ { "name": "key" } ]
```

### 5.5 Requirements / gating
```json
"requires_item": "temple_key",
"requires_amount": 1
```

### 5.6 Reset game
```json
"reset_game": true
```

---

## Notes / Known non-builder JSON variants

Your current `game.json` may contain older patterns such as:
- `"action": "damage"` and `"damage_amount": 30` (not the builder’s action object). This is a different mechanic than the builder’s `page.action.type` model.
