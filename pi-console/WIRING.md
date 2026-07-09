# 🔌 Dungeon Mastron - Complete Wiring Diagram

## 📍 GPIO Pin Configuration

### **Buttons (4 total):**
```
GPIO 5  (Pin 29) → Choice Button 1
GPIO 6  (Pin 31) → Choice Button 2
GPIO 13 (Pin 33) → Choice Button 3
GPIO 19 (Pin 35) → Action Button ⭐
```

**All buttons:** Active LOW (pull-up resistors enabled in software)

---

### **LEDs (9 total - 5-slot Dupont Housing):**

**Perfect sequence on Pins 36-40 (bottom right of GPIO header):**

```
┌─────────────────────────────────────┐
│  Pi 5 GPIO Header (Bottom Right)   │
├─────────────────────────────────────┤
│  Pin 35 → GPIO 19  (Action Button)  │
│  Pin 36 → GPIO 16  (Green LEDs) ────┐
│  Pin 37 → GPIO 26  (Blue LEDs)  ────┤
│  Pin 38 → GPIO 20  (Orange LEDs)────┤ 5-slot
│  Pin 39 → GND      (Ground)     ────┤ Dupont
│  Pin 40 → GPIO 21  (Red LEDs)   ────┘ Housing
└─────────────────────────────────────┘
```

**LED Color Mapping:**
- **GPIO 16** (Pin 36) → 2× **Green** LEDs (left + right frame)
- **GPIO 26** (Pin 37) → 2× **Blue** LEDs (left + right frame)
- **GPIO 20** (Pin 38) → 2× **Orange** LEDs (left + right frame)
- **GPIO 21** (Pin 40) → 3× **Red** LEDs (left frame + right frame + action button) ⭐

**Ground:** Pin 39 (common ground for ALL 9 LEDs)

---

## 🔧 Detailed LED Wiring

### **Each LED Color Group:**

**Green LEDs (GPIO 16):**
```
GPIO 16 (Pin 36) ──┬─→ Left Green LED (+) → (-) → 220Ω resistor ──┐
                   └─→ Right Green LED (+) → (-) → 220Ω resistor ─┤
                                                                   ├─→ GND (Pin 39)
```

**Blue LEDs (GPIO 26):**
```
GPIO 26 (Pin 37) ──┬─→ Left Blue LED (+) → (-) → 220Ω resistor ───┤
                   └─→ Right Blue LED (+) → (-) → 220Ω resistor ──┤
```

**Orange LEDs (GPIO 20):**
```
GPIO 20 (Pin 38) ──┬─→ Left Orange LED (+) → (-) → 220Ω resistor ─┤
                   └─→ Right Orange LED (+) → (-) → 220Ω resistor ┤
```

**Red LEDs (GPIO 21) - 3 LEDs total!:**
```
GPIO 21 (Pin 40) ──┬─→ Left Red LED (+) → (-) → 220Ω resistor ────┤
                   ├─→ Right Red LED (+) → (-) → 220Ω resistor ───┤
                   └─→ Action Button Red LED (+) → (-) → 220Ω ────┘
```

---

## 🎨 LED Color Usage Guide

| GPIO | Pin | Color | Count | When to Use |
|------|-----|-------|-------|-------------|
| 16 | 36 | 🟢 Green | 2 | Success, healing, victory, items found |
| 26 | 37 | 🔵 Blue | 2 | Normal gameplay, story, exploration |
| 20 | 38 | 🟠 Orange | 2 | Danger, warnings, death, game over |
| 21 | 40 | 🔴 Red | **3** | **ACTIONS ONLY** (combat, dice rolls) - Lights action button! |

---

## 🔘 Button Wiring

### **Each Button:**
```
GPIO Pin → Button Switch → Ground
           (pull-up enabled in software)
```

**All 4 buttons:**
```
GPIO 5  (Pin 29) ──→ [Button 1] ──→ GND (Pin 30 is nearby!)
GPIO 6  (Pin 31) ──→ [Button 2] ──→ GND (Pin 30 is nearby!)
GPIO 13 (Pin 33) ──→ [Button 3] ──→ GND (Pin 34 is nearby!)
GPIO 19 (Pin 35) ──→ [Action Button] ──→ GND (Pin 39 is nearby!)
```

**Convenient GND pins for buttons:**
- Pin 30 (GND) - between GPIO 5 and GPIO 6
- Pin 34 (GND) - next to GPIO 13
- Pin 39 (GND) - shared with LEDs, near GPIO 19

---

## 📦 Materials List

### **LEDs:**
- 3× Red LEDs (5mm, 20mA)
- 2× Orange LEDs (5mm, 20mA)
- 2× Blue LEDs (5mm, 20mA)
- 2× Green LEDs (5mm, 20mA)
**Total: 9 LEDs**

### **Resistors:**
- 9× 220Ω resistors (1/4W) - one per LED

### **Buttons:**
- 4× Momentary push buttons (normally open)

### **Connectors:**
- 1× 5-slot female dupont housing (for LED GPIOs + GND)
- 5× female dupont crimp pins
- 22 AWG wire (or jumper wires)

### **Optional:**
- Breadboard for testing
- Heat shrink tubing
- Electrical tape

---

## 🛠️ Assembly Steps

### **Step 1: Prepare Dupont Housing**
1. Cut 5 pieces of wire (~20cm each)
2. Strip both ends (~5mm)
3. Crimp female dupont pins on one end
4. Insert into 5-slot housing in order:
   - Slot 1: GPIO 16 (Green)
   - Slot 2: GPIO 26 (Blue)
   - Slot 3: GPIO 20 (Orange)
   - Slot 4: GND
   - Slot 5: GPIO 21 (Red)

### **Step 2: Wire LEDs**
**For each LED:**
1. Identify anode (+, longer leg) and cathode (-, shorter leg)
2. Connect anode to GPIO wire
3. Connect cathode to 220Ω resistor
4. Connect other end of resistor to common ground wire

**Series wiring example (Green):**
```
GPIO 16 wire → LED1 anode → LED1 cathode → 220Ω → LED2 anode → LED2 cathode → 220Ω → GND
```

**Parallel wiring example (Green):**
```
GPIO 16 wire ──┬─→ LED1 anode → LED1 cathode → 220Ω ──┐
               └─→ LED2 anode → LED2 cathode → 220Ω ──┴─→ GND
```

**Red has 3 LEDs (parallel wiring recommended):**
```
GPIO 21 wire ──┬─→ Left LED (+) → (-) → 220Ω ──┐
               ├─→ Right LED (+) → (-) → 220Ω ─┤
               └─→ Button LED (+) → (-) → 220Ω ┴─→ GND
```

### **Step 3: Wire Buttons**
1. Connect one terminal of button to GPIO pin
2. Connect other terminal to GND
3. Software pull-up resistors handle the rest!

### **Step 4: Connect to Pi**
1. **Power OFF Pi 5**
2. Connect 5-slot dupont housing to pins 36-40
3. Connect button wires to GPIO 5, 6, 13, 19
4. Connect button grounds to nearby GND pins
5. Double-check all connections!
6. Power ON Pi 5

---

## 🧪 Testing Procedure

### **Test 1: Individual LED Test**
```python
from gpiozero import PWMLED
import time

# Test each color
leds = {
    'green': PWMLED(16),
    'blue': PWMLED(26),
    'orange': PWMLED(20),
    'red': PWMLED(21)
}

for color, led in leds.items():
    print(f"Testing {color}...")
    led.on()
    time.sleep(1)
    led.off()
    time.sleep(0.5)

print("✅ All LEDs tested!")
```

### **Test 2: Button Test**
```python
from gpiozero import Button

buttons = {
    'Choice 1': Button(5, pull_up=True),
    'Choice 2': Button(6, pull_up=True),
    'Choice 3': Button(13, pull_up=True),
    'Action': Button(19, pull_up=True)
}

for name, btn in buttons.items():
    btn.when_pressed = lambda n=name: print(f"✅ {n} pressed!")

print("Press buttons to test...")
input("Press Enter to exit...")
```

### **Test 3: Action Button LED Test**
```python
from gpiozero import Button, PWMLED

action_btn = Button(19, pull_up=True)
red_led = PWMLED(21)

def on_action():
    print("🔴 Action button pressed - LED blinking!")
    red_led.blink(on_time=0.2, off_time=0.2)

action_btn.when_pressed = on_action

print("Press action button to test red LED...")
input("Press Enter to exit...")
```

---

## 📊 Pin Reference Table

| Function | GPIO | Physical Pin | Notes |
|----------|------|--------------|-------|
| Choice Button 1 | 5 | 29 | GND at pin 30 |
| Choice Button 2 | 6 | 31 | GND at pin 30 |
| Choice Button 3 | 13 | 33 | GND at pin 34 |
| Action Button | 19 | 35 | GND at pin 39 |
| Green LEDs | 16 | 36 | 5-slot dupont |
| Blue LEDs | 26 | 37 | 5-slot dupont |
| Orange LEDs | 20 | 38 | 5-slot dupont |
| Common GND | - | 39 | 5-slot dupont |
| Red LEDs | 21 | 40 | 5-slot dupont |

---

## ✅ Advantages of This Layout

✅ **Super clean wiring** - All LED GPIOs + GND in one 5-slot connector  
✅ **Easy to install** - Just plug in the dupont housing  
✅ **Easy to remove** - Unplug one connector, all LEDs disconnect  
✅ **No confusion** - Physical pin sequence matches wiring  
✅ **Buttons clustered** - GPIO 5, 6, 13, 19 are logically grouped  
✅ **Red at end** - Red (action) LED is last pin, easy to identify  
✅ **GND in middle** - Common ground for all 9 LEDs  

---

## 🎯 Visual Layout on Console

```
┌────────────────────────────────────────┐
│         Dungeon Mastron Console        │
├────────────────────────────────────────┤
│                                        │
│    🟢 ←─── Green LEDs ────→ 🟢        │  GPIO 16
│                                        │
│    🔵 ←─── Blue LEDs ─────→ 🔵        │  GPIO 26
│                                        │
│    🟠 ←─── Orange LEDs ───→ 🟠        │  GPIO 20
│                                        │
│    🔴 ←─── Red LEDs ──────→ 🔴        │  GPIO 21
│                                        │
│              (screen)                  │
│                                        │
│  [1]    [2]    [3]      [ACTION] 🔴   │
│  GPIO5  GPIO6  GPIO13   GPIO19         │
│  Choice Choice Choice   Action Button  │
│                                        │
└────────────────────────────────────────┘
```

**Red LED under action button lights up during combat/dice rolls!** ⭐

---

**All pins optimized for easy dupont housing assembly!** 🔌✨
