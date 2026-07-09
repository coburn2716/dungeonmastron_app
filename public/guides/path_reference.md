# COMPLETE PATH REFERENCE (Terminal-style)

This guide shows the recommended on-disk layout for a Dungeon Mastron game.

## 1) USB game folder layout

Assume your USB is mounted as:

```
/media/dm/<USB_NAME>/
```

Your game lives in its own folder:

```
$ tree -a -L 3 /media/dm/<USB_NAME>/<GAME_FOLDER>
/media/dm/<USB_NAME>/<GAME_FOLDER>
├── game.json
├── logo.png                       # optional (referenced by game.json: "logo")
├── audio/
│   ├── start.wav                  # optional (per-page: speech_file/sound_file)
│   └── start_sfx.wav
├── images/
│   ├── start.jpg                  # default page image fallback: <page_id>.jpg
│   ├── animations_vertical/        # optional (per-page MP4 animations: <page_id>.mp4)
│   │   └── start.mp4
│   ├── animations_square/          # optional (per-page MP4 animations: <page_id>.mp4)
│   │   └── start.mp4
│   └── special_pages/
│       ├── the_end.jpg            # special_page background examples
│       └── prologue.jpg
├── bezels/
│   └── my_story_bezel.png         # 720×1280 PNG (normal/story bezel)
├── action_bezel/
│   └── my_action_bezel.png        # 720×1280 PNG (action bezel)
└── fonts/
    └── MyFont.ttf                 # optional (referenced by game.json: "font_file")
```

### Notes

```
game.json                      REQUIRED
images/<page_id>.jpg           common convention
images/special_pages/<file>    used when page.special_page=true
images/animations_vertical/<page_id>.mp4   optional per-page animation (vertical)
images/animations_square/<page_id>.mp4     optional per-page animation (square)
audio/<page_id>.wav            per-page speech_file default
audio/<page_id>_sfx.wav        per-page sound_file default
bezels/<file>.png              used by game.json: bezels.bottom
action_bezel/<file>.png        used by game.json: action_bezel
fonts/<file>.ttf               used by game.json: font_file
```

Recommended image format/sizes:

```
Bezels:        PNG, 720×1280
Page images:   JPG/PNG, 720×1280 (or larger; will be scaled/cropped)
Animations:    MP4 (H.264), match your target layout (e.g. 720×1280 or 1024×1024)
Audio:         WAV preferred
```

## 2) Pi / console default assets (theme fallbacks)

Theme defaults live on the device (used when your USB game doesn’t override them):

```
$ tree -a -L 3 /home/dm/dungeon_mastron/console_assets
/home/dm/dungeon_mastron/console_assets
├── bezels/
│   ├── fantasy_bezel.png
│   ├── fantasy_action_bezel.png
│   ├── scifi_bezel.png
│   └── ...
├── fonts/
│   ├── Spectral-SemiBold.ttf
│   ├── Orbitron-SemiBold.ttf
│   └── ...
└── images/
    ├── fantasy_sp_bg.jpg
    └── ...
```

## 3) Resolution rules (what wins)

```
1) If game.json explicitly points to a file and it exists in the USB game folder, use it.
2) Otherwise fall back to theme defaults on the Pi (if available).
3) Otherwise use built-in defaults (if any).
```

## 4) Quick “does my cart look correct?” checklist

```
$ ls /media/dm/<USB_NAME>/<GAME_FOLDER>/
game.json  images/  audio/  bezels/  action_bezel/  fonts/  logo.png

$ jq '.title, .start_page, .bezels, .action_bezel, .font_file' /media/dm/<USB_NAME>/<GAME_FOLDER>/game.json
"My Game"
"start"
{"bottom":"my_story_bezel.png"}
"my_action_bezel.png"
"MyFont.ttf"
```
/media/dm/GAMENAME/action_bezel/custom_combat.png
```
- Format: PNG, 720×1280, 72 DPI
- Specified in: `game.json` → `action_bezel`

**Pi (Theme default):**
```
/home/dm/dungeon_mastron/console_assets/bezels/{theme}_action_bezel.png
```
- Examples:
  - `/home/dm/dungeon_mastron/console_assets/bezels/fantasy_action_bezel.png`
  - `/home/dm/dungeon_mastron/console_assets/bezels/scifi_action_bezel.png`

**Priority:** Custom (USB) → Theme (Pi) → None

---

### **2. IMAGES**

#### **Page Images (Regular pages):**

**USB (Custom per-game):**
```
/media/dm/GAMENAME/images/{page_id}.jpg
```
- Examples:
  - `/media/dm/GAMENAME/images/page_001.jpg`
  - `/media/dm/GAMENAME/images/page_002.jpg`
  - `/media/dm/GAMENAME/images/tavern_entrance.jpg`
- Format: JPG, 1280×720 (landscape)
- Auto-loaded if filename matches page ID

**Priority:** Custom (USB) → Black background

---

#### **Special Page Backgrounds (Prologue/Epilogue):**

**USB (Custom per-game):**
```
/media/dm/GAMENAME/images/special_pages/{page_id}.jpg
```
- Examples:
  - `/media/dm/GAMENAME/images/special_pages/prologue.jpg`
  - `/media/dm/GAMENAME/images/special_pages/epilogue.jpg`
  - `/media/dm/GAMENAME/images/special_pages/chapter_1.jpg`
- Format: JPG, 1280×720 (landscape)

**Pi (Theme default):**
```
/home/dm/dungeon_mastron/console_assets/images/{theme}_sp_bg.jpg
```
- Examples:
  - `/home/dm/dungeon_mastron/console_assets/images/fantasy_sp_bg.jpg`
  - `/home/dm/dungeon_mastron/console_assets/images/scifi_sp_bg.jpg`
- Format: JPG, 1280×720 (landscape)

**Priority:** Custom (USB) → Theme (Pi) → Black background

---

### **3. AUDIO**

**USB (Custom per-game):**
```
/media/dm/GAMENAME/audio/{page_id}.mp3
```
- Examples:
  - `/media/dm/GAMENAME/audio/prologue.mp3`
  - `/media/dm/GAMENAME/audio/page_001.mp3`
  - `/media/dm/GAMENAME/audio/tavern_entrance.mp3`
  - `/media/dm/GAMENAME/audio/combat_theme.mp3`
- Format: MP3
- Auto-loaded if filename matches page ID

**Pi (No theme defaults for audio):**
- Audio is always game-specific
- No shared audio assets

**Priority:** Custom (USB) → No audio

---

### **4. FONTS**

**USB (Custom per-game):**
```
/media/dm/GAMENAME/fonts/CustomFont.ttf
```
- Format: TTF
- Specified in: `game.json` → `theme.custom.font`

**Pi (Theme default):**
```
/home/dm/dungeon_mastron/console_assets/fonts/{theme_font}.ttf
```
- Examples:
  - `/home/dm/dungeon_mastron/console_assets/fonts/Spectral-SemiBold.ttf` (Fantasy)
  - `/home/dm/dungeon_mastron/console_assets/fonts/Orbitron-SemiBold.ttf` (Sci-fi)
  - `/home/dm/dungeon_mastron/console_assets/fonts/PlayfairDisplay-SemiBold.ttf` (Steampunk)
  - `/home/dm/dungeon_mastron/console_assets/fonts/SpecialElite-Regular.ttf` (Horror)
- Format: TTF

**Priority:** Custom (USB) → Theme (Pi) → System default

---

## 🎯 COMPLETE PATH PRIORITY SUMMARY

| Asset Type | USB Path | Pi Path | Priority |
|-----------|----------|---------|----------|
| **Normal Bezel** | `/media/dm/GAME/bezels/*.png` | `/home/dm/.../bezels/{theme}_bezel.png` | USB → Pi → None |
| **Action Bezel** | `/media/dm/GAME/action_bezel/*.png` | `/home/dm/.../bezels/{theme}_action_bezel.png` | USB → Pi → None |
| **Page Images** | `/media/dm/GAME/images/*.jpg` | N/A | USB → Black |
| **Special Pages** | `/media/dm/GAME/images/special_pages/*.jpg` | `/home/dm/.../images/{theme}_sp_bg.jpg` | USB → Pi → Black |
| **Audio** | `/media/dm/GAME/audio/*.mp3` | N/A | USB → None |
| **Fonts** | `/media/dm/GAME/fonts/*.ttf` | `/home/dm/.../fonts/{theme}.ttf` | USB → Pi → System |

---

## 📝 PATH VARIABLES IN CODE

### **console.py Constants:**
```python
# Pi asset directories
ASSETS_DIR = Path("/home/dm/dungeon_mastron/console_assets")
ASSETS_BEZELS_DIR = ASSETS_DIR / "bezels"
ASSETS_FONTS_DIR = ASSETS_DIR / "fonts"
ASSETS_IMAGES_DIR = ASSETS_DIR / "images"

# USB paths (set at runtime when game loads)
self.usb_path = Path("/media/dm/GAMENAME")  # Varies per game
```

### **USB Detection:**
```python
# Console searches for game.json in:
/media/dm/*/game.json

# Once found, sets usb_path to that directory
```

---

## 🔧 COMMON PATH OPERATIONS

### **Check if Custom Asset Exists:**
```python
# Custom normal bezel
custom_bezel = usb_path / "bezels" / "custom_bottom.png"
if custom_bezel.exists():
    load_custom_bezel(custom_bezel)

# Custom page image
page_image = usb_path / "images" / f"{page_id}.jpg"
if page_image.exists():
    load_page_image(page_image)

# Custom audio
page_audio = usb_path / "audio" / f"{page_id}.mp3"
if page_audio.exists():
    play_audio(page_audio)
```

### **Fallback to Theme Default:**
```python
# Theme bezel
theme_bezel = ASSETS_BEZELS_DIR / f"{theme_name}_bezel.png"
if theme_bezel.exists():
    load_theme_bezel(theme_bezel)

# Theme special page background
theme_bg = ASSETS_IMAGES_DIR / f"{theme_name}_sp_bg.jpg"
if theme_bg.exists():
    load_theme_background(theme_bg)

# Theme font
theme_font = ASSETS_FONTS_DIR / f"{font_name}.ttf"
if theme_font.exists():
    load_theme_font(theme_font)
```

---

## 📤 UPLOAD COMMANDS

### **Upload to USB (from computer):**
```bash
# Copy game folder to USB
cp -r /path/to/MYGAME /Volumes/USBNAME/

# Or individual files
cp game.json /Volumes/USBNAME/MYGAME/
cp images/*.jpg /Volumes/USBNAME/MYGAME/images/
cp audio/*.mp3 /Volumes/USBNAME/MYGAME/audio/
```

### **Upload to Pi (via SCP):**
```bash
# Theme bezels
scp fantasy_bezel.png dm@dm.local:/home/dm/dungeon_mastron/console_assets/bezels/
scp fantasy_action_bezel.png dm@dm.local:/home/dm/dungeon_mastron/console_assets/bezels/

# Special page backgrounds
scp fantasy_sp_bg.jpg dm@dm.local:/home/dm/dungeon_mastron/console_assets/images/

# Fonts
scp Spectral-SemiBold.ttf dm@dm.local:/home/dm/dungeon_mastron/console_assets/fonts/
```

---

## 🎮 EXAMPLE GAME SCENARIOS

### **Scenario 1: Minimal Game (Theme Defaults Only)**

**USB:**
```
/media/dm/ADVENTURE/
└── game.json  # Just {"title": "My Adventure", "theme": {"preset": "fantasy"}}
```

**Result:**
- Loads fantasy_bezel.png from Pi
- Loads fantasy_action_bezel.png from Pi
- Loads fantasy_sp_bg.jpg from Pi
- Loads Spectral font from Pi
- Uses fantasy colors
- ✅ Complete professional game!

---

### **Scenario 2: Custom Images + Audio**

**USB:**
```
/media/dm/ADVENTURE/
├── game.json
├── images/
│   ├── page_001.jpg
│   ├── page_002.jpg
│   └── page_003.jpg
└── audio/
    ├── page_001.mp3
    └── page_002.mp3
```

**Result:**
- Custom images/audio from USB
- Theme bezels/backgrounds from Pi
- Theme font from Pi
- ✅ Custom content + theme styling!

---

### **Scenario 3: Fully Custom Game**

**USB:**
```
/media/dm/ADVENTURE/
├── game.json
├── images/
│   ├── [all page images]
│   └── special_pages/
│       ├── prologue.jpg
│       └── epilogue.jpg
├── audio/
│   └── [all audio files]
├── bezels/
│   └── epic_frame.png
├── action_bezel/
│   └── combat_frame.png
└── fonts/
    └── EpicFont.ttf
```

**Result:**
- All custom assets from USB
- Nothing loaded from Pi
- ✅ Fully custom experience!

---

### **Scenario 4: Mix & Match**

**USB:**
```
/media/dm/ADVENTURE/
├── game.json
├── images/
│   └── special_pages/
│       └── prologue.jpg  # Custom prologue only
└── action_bezel/
    └── combat_frame.png  # Custom action bezel only
```

**Result:**
- Custom prologue background from USB
- Custom action bezel from USB
- Theme normal bezel from Pi
- Theme special page backgrounds (except prologue) from Pi
- Theme font from Pi
- ✅ Selective customization!

---

## 🎯 QUICK REFERENCE

### **Most Common Paths:**

**USB Game:**
```
/media/dm/GAMENAME/game.json          # REQUIRED
/media/dm/GAMENAME/images/*.jpg       # Page images
/media/dm/GAMENAME/audio/*.mp3        # Page audio
```

**Pi Theme Assets:**
```
/home/dm/dungeon_mastron/console_assets/bezels/{theme}_bezel.png
/home/dm/dungeon_mastron/console_assets/bezels/{theme}_action_bezel.png
/home/dm/dungeon_mastron/console_assets/images/{theme}_sp_bg.jpg
/home/dm/dungeon_mastron/console_assets/fonts/{theme}.ttf
```

---

## 💡 PATH TIPS

### **USB Naming:**
- Game folder name can be anything (e.g., MYGAME, ADVENTURE, SCIFI_QUEST)
- Console searches all USB drives for game.json
- Multiple games can be on one USB (separate folders)

### **Asset Naming:**
- Page images/audio: Match page ID exactly (e.g., `page_001.jpg`, `tavern.mp3`)
- Special pages: Go in `images/special_pages/` subdirectory
- Bezels: Can have any filename (specified in game.json)

### **Theme Names:**
- `fantasy` → Spectral font, fantasy bezels/backgrounds
- `scifi` → Orbitron font, sci-fi bezels/backgrounds
- `horror` → SpecialElite font, horror bezels/backgrounds
- `steampunk` → PlayfairDisplay font, steampunk bezels/backgrounds

---

## 📋 CHECKLIST

### **Before Creating Game:**
- [ ] Decide: Use theme defaults or custom assets?
- [ ] Create USB game folder
- [ ] Create subdirectories (images, audio, etc.)

### **Theme Assets on Pi:**
- [ ] Upload 8 bezel files (4 themes × 2 bezels)
- [ ] Upload 4 special page backgrounds
- [ ] Verify 4 fonts present

### **Game Assets on USB:**
- [ ] game.json created
- [ ] Page images added (if custom)
- [ ] Audio files added (if custom)
- [ ] Custom bezels added (if custom)

---

**This is your complete path reference!** 📁✨
