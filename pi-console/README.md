# Dungeon Mastron — Pi Console

**`console.py`** is the Raspberry Pi hardware player for Dungeon Mastron — a Choose Your Own Adventure game engine with physical buttons, LED lighting, and USB game cartridges.

> **Status: Beta** — fully playable on Pi 5 hardware; the dev/headless mode is new as of v2.

---

## What It Is

The Pi Console runs `.json` game files created with the [Dungeon Mastron Game Builder](https://dungeonmastron.com). It renders a portrait-orientation story game on a 720×1280 display with:

- 3 choice buttons + 1 action button (GPIO)
- 4 groups of LED accent lighting (blue/green/orange/red)
- USB "game cartridge" loading (plug in a USB stick with a `game.json`)
- Ken Burns animation (via pre-rendered video on the USB stick)
- Speech narration and ambient SFX (`.mp3` or `.wav`, via aplay/mpg123)

---

## Hardware Required (Pi 5 Console Build)

See **`WIRING.md`** for the full pin-by-pin diagram.

| Component | Spec |
|-----------|------|
| Raspberry Pi 5 | 4 GB RAM or higher |
| Display | 7-inch portrait (720×1280) HDMI |
| Buttons | 4 × momentary push switches |
| LEDs | 9 total: 2× green, 2× blue, 2× orange, 3× red (see WIRING.md) |
| Resistors | 9 × 220Ω (one per LED) |
| USB stick | FAT32, contains `game.json` + optional `audio/`, `images/` |
| USB audio | Any USB audio adapter (recommended: avoids PWM/NeoPixel interference with 3.5 mm jack) |

**GPIO pins:**
- Choice 1 → GPIO 5 (pin 29)
- Choice 2 → GPIO 6 (pin 31)
- Choice 3 → GPIO 13 (pin 33)
- Action → GPIO 19 (pin 35)
- Green LEDs → GPIO 16 (pin 36)
- Blue LEDs → GPIO 26 (pin 37)
- Orange LEDs → GPIO 20 (pin 38)
- Red LEDs → GPIO 21 (pin 40)

---

## Running Without Hardware (Dev Mode)

You can develop, test, and debug games on any Linux/Mac/Windows machine — no Pi, no GPIO, no LEDs needed.

**Requirements:**
```bash
pip install pygame
# Optional but recommended for video / Ken Burns animations:
pip install opencv-python numpy
```

> `gpiozero` and `pyudev` are **not** needed in dev mode — they're gracefully mocked.

**Run in dev mode:**
```bash
# Load a game directly:
DM_GAME=/path/to/your/game/folder python3 console.py

# Example with the bundled sample game:
DM_GAME=../../my_games/the_tower_of_the_black_star python3 console.py

# Force dev mode explicitly (even if gpiozero is installed):
DM_DEV_MODE=1 DM_GAME=/path/to/game python3 console.py
```

Dev mode automatically activates if `gpiozero` cannot be imported (i.e. not on a Pi). You can also force it with `DM_DEV_MODE=1`.

**Keyboard controls in dev mode:**

| Key | Action |
|-----|--------|
| `1` | Choice button 1 |
| `2` | Choice button 2 |
| `3` | Choice button 3 |
| `SPACE` or `ENTER` | Action button (dice roll / combat) |
| `ESC` | Quit |

The window runs at half resolution (360×640) and is resizable. LED effects are silently no-ops.

---

## Loading Games (USB Cartridge Concept)

A Dungeon Mastron "game cartridge" is a USB stick with this structure:

```
/
├── game.json          ← required: the game definition
├── audio/
│   ├── start.mp3      ← narration for page "start" (mp3 or wav)
│   ├── start_sfx.mp3  ← ambient SFX for page "start"
│   └── ...
├── images/
│   ├── start.jpg      ← background image for page "start"
│   └── ...
├── fonts/             ← optional: custom .ttf font files
└── bezels/            ← optional: custom bezel .png files
```

- Insert the USB stick while the console is running → game loads automatically
- Remove the USB stick → game unloads, "Insert Cartridge" screen shown
- `game.json` is the game file exported by the Dungeon Mastron Game Builder

**Audio formats:** `.mp3` is the preferred format (smaller files, streaming-ready). The engine tries `.mp3` first, then falls back to `.wav`, so existing `.wav` libraries remain compatible.

---

## MP3 Audio Requirement

MP3 playback requires `mpg123` (recommended) or `ffplay` (fallback).

```bash
# Raspberry Pi / Debian:
sudo apt-get install mpg123

# macOS:
brew install mpg123
```

WAV files still work with `aplay` (ALSA, already on every Pi). `.mp3` and `.wav` files can be mixed freely — the engine auto-detects the format.

---

## Game Engine Feature Summary (v2)

This console engine is at **feature parity** with the web player (`public/play/index.html`):

| Feature | Status |
|---------|--------|
| Pages, choices, stat_mods, items | ✅ |
| Dice and combat actions | ✅ |
| `action.type: "boss"` (alias for combat) | ✅ |
| `requires_flags` / `set_flags` on choices | ✅ |
| `set_flags_on_enter` on pages | ✅ |
| `stat_popup` floating HP/stat indicators | ✅ |
| Stat key normalization (hp/health, str/strength, lck/luck) | ✅ |
| All 3 item formats (simple, enhanced, array) | ✅ |
| Accepts both `target` and `next_page` on choices | ✅ |
| Page-key whitespace trimming (prevents silent broken links) | ✅ |
| Tolerant theme fallback with warning (unknown → fantasy) | ✅ |
| MP3 audio + .wav/.mp3 automatic fallback | ✅ |
| Dev mode (no GPIO/hardware required) | ✅ |
| USB game cartridge hot-plug | ✅ (Pi only) |
| Ken Burns video animation | ✅ (requires opencv) |
| LED effects (blue/green/orange/red) | ✅ (Pi only) |

---

## License

**Dungeon Mastron License** — see `LICENSE` in this folder and the license text embedded at the top of `console.py`.

- ✅ Play games, create games, study the source, modify for personal use
- ❌ Redistribute this software, use commercially, create competing products

Games you create are yours. See the full license for details.

---

## Links

- Website: [dungeonmastron.com](https://dungeonmastron.com)
- Game Builder: [dungeonmastron.com/builder](https://dungeonmastron.com/builder)
- Web Player: [dungeonmastron.com/play](https://dungeonmastron.com/play)
- Wiring guide: [`WIRING.md`](./WIRING.md)
