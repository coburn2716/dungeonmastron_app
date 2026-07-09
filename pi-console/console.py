# Dungeon Mastron © Artifextron
# Community-shared source files. Official development and releases remain with Artifextron.

#!/usr/bin/env python3
"""
Dungeon Mastron Console - Choose Your Own Adventure Game System
Main console application
"""

DUNGEON_MASTRON_LICENSE_TEXT = """DUNGEON MASTRON LICENSE

Copyright (c) 2026 Artifextron, Henrik Åberg
All Rights Reserved.

================================================================================
TERMS AND CONDITIONS
================================================================================

This software and content (Dungeon Mastron Console, Web Player, Game Builder, 
and AI Companion) is proprietary material made available in source 
form for transparency and personal use.

PERMISSIONS
-----------
You are permitted to:

  ✓ Use this software to play games
  ✓ Use this software to create games with the included Game Builder
  ✓ Use the AI Companion to create games with AI assistants
  ✓ Modify this software and templates for personal, private, non-commercial use
  ✓ Study and learn from the source code and templates
  ✓ Create, distribute, and sell games made with the Game Builder or AI Companion
    (you own full rights to your created games)

RESTRICTIONS
------------
You may NOT:

  ✗ Distribute this software or templates (original or modified versions)
  ✗ Publish, share, or make available any fork, derivative, or modified template
  ✗ Use this software or templates for commercial purposes
  ✗ Sublicense, sell, rent, or lease this software or templates
  ✗ Remove or modify this license or copyright notices
  ✗ Use this software to create competing products or services
  ✗ Reverse engineer this software (beyond what's visible in source)

GAME OWNERSHIP AND PLAYBACK
---------------------------
Games created using the Dungeon Mastron Game Builder or AI Companion 
are owned entirely by their creators. You may distribute, sell, or license 
your games freely.

However, games are designed to be played using official Dungeon Mastron players:
- Dungeon Mastron Web Player (free)
- Dungeon Mastron Console (console.py on Raspberry Pi)

Creating alternative players or software that executes Dungeon Mastron game 
files requires written permission from the copyright holder.

Attribution to Dungeon Mastron is appreciated but not required when 
distributing your games.

ATTRIBUTION
-----------
When sharing games or content created with this software, you should credit:
"Created with Dungeon Mastron / www.dungeonmastron.com"

DISCLAIMER
----------
THIS SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE COPYRIGHT
HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE
USE OF THIS SOFTWARE.

ENFORCEMENT
-----------
Violations of this license may result in:
- DMCA takedown notices
- Cease and desist orders
- Legal action for damages

If you're unsure whether your use case is permitted, please contact the
copyright holder before proceeding.

================================================================================
For questions or licensing inquiries: [dungeonmastron@gmail.com / Henrik Åberg]
Project website: www.dungeonmastron.com
================================================================================
"""

import os
import sys
import subprocess  # For command-line audio playback

import json
import time
import random
import pygame
import pyudev
import cv2  # OpenCV for video playback
import numpy as np
from pathlib import Path
from threading import Thread, Timer
from gpiozero import Button
from signal import pause

# Configuration
SCREEN_WIDTH = 720
SCREEN_HEIGHT = 1280

# Asset base (on-device). Override with env var DUNGEON_MASTRON_ASSETS if needed.
ASSETS_BASE_PATH = Path(os.environ.get("DUNGEON_MASTRON_ASSETS", "/home/dm/dungeon_mastron/console_assets"))
ASSETS_FONTS_DIR = ASSETS_BASE_PATH / "fonts"
ASSETS_BEZELS_DIR = ASSETS_BASE_PATH / "bezels"
ASSETS_IMAGES_DIR = ASSETS_BASE_PATH / "images"

THEME_BEZEL_FILES = {
    "fantasy": "fantasy_bezel.png",
    "scifi": "scifi_bezel.png",
    "steampunk": "steampunk_bezel.png",
    "horror": "horror_bezel.png",
}

THEME_FONT_FILES = {
    "fantasy": "Spectral-SemiBold.ttf",
    "scifi": "Orbitron-SemiBold.ttf",
    "steampunk": "PlayfairDisplay-SemiBold.ttf",
    "horror": "SpecialElite-Regular.ttf",
}

DEFAULT_FONT_SIZES = {"main": 20, "choices": 20, "stats": 20, "items": 18}

DEFAULT_FONT_COLORS = {
    "main": (232, 227, 217),
    "choices": (217, 119, 87),
    "stats": (232, 227, 217),
    "items": (232, 227, 217),
    "separator": (232, 227, 217),
}

# Default action element colors (combat, dice rolls, victory/defeat screens)
DEFAULT_ACTION_COLORS = {
    "border": (217, 119, 87),      # Action panel border (accent)
    "background": (28, 28, 28),    # Action panel background (dark)
    "dice": (255, 255, 255),       # Dice fill color (white)
    "dice_text": (0, 0, 0),        # Dice number color (black)
    "victory": (34, 139, 34),      # Victory/success background (green)
    "failure": (178, 34, 34),      # Failure/defeat background (red)
}

# Default action panel Y position (% from top of screen, default 30%)
DEFAULT_ACTION_POSITION_Y = 30.0

# Default action panel height (pixels, default 180px)
DEFAULT_ACTION_PANEL_HEIGHT = 180

# Default action element Y positions (pixels from panel top)
DEFAULT_ACTION_TEXT_Y = 50      # Rolling text position
DEFAULT_ACTION_DICE_Y = 90      # Dice position
DEFAULT_ACTION_RESULT_Y = 80    # Victory/Failure text position
DEFAULT_ACTION_TEXT_SIZE = 20   # Font size in pixels (6-30 range)
DEFAULT_ACTION_TEXT_COLOR = (255, 255, 255)  # White text
# Default action dice size (px) for rendered die
DEFAULT_ACTION_DICE_SIZE = 120

BUTTON_PINS = {
    'choice1': 5,
    'choice2': 6,
    'choice3': 13,
    'action': 19    # Moved back to GPIO 19 for user's preferred layout
}
# NeoPixel configuration - Adafruit NeoPixel Jewels (7 LEDs each, RGBW)
# CRITICAL: Audio uses PWM0 (GPIO 18/12), so use PWM1 (GPIO 13/19) or PCM (GPIO 21)
# Supported NeoPixel pins: 10(SPI), 12(PWM0), 13(PWM1), 18(PWM0), 19(PWM1), 21(PCM)
# Action button moved from GPIO 19 Ã†â€™Ãƒâ€šÃ‚Â¢Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ GPIO 26 to free PWM1
# LED Configuration - Simple GPIO LEDs (Pi 5 compatible!)
# 5-slot dupont housing: Physical pins 36-40 (GPIO 16, 26, 20, GND, 21)
# Perfect sequence: all 4 LED GPIOs + GND in a row!
LED_PINS = {
    'green': 16,    # Pin 36 - Success, healing, victory, items found
    'blue': 26,     # Pin 37 - Normal gameplay, story, exploration  
    'orange': 20,   # Pin 38 - Danger, warnings, death, game over
    'red': 21       # Pin 40 - ACTIONS ONLY (combat/dice) + under action button!
                    # Pin 39 - GND (common ground for all LEDs)
}
USB_MOUNT_BASE = "/media/dm"
ASSETS_PATH = Path(__file__).parent / "console_assets"

# Bezel Layout Configuration (PORTRAIT SPLIT)
# The desktop/display is expected to be rotated to portrait externally.
# Screen is 720x1280 in portrait (because the physical panel is 1280x720 landscape).
#
# Top area: page image window.
# Bottom area: ONE single "main bezel" that contains choices (top-left), stats (top-right),
# story text (center), and items/inventory (bottom).
#
# NOTE: If you provide a custom bezel image via game.json -> bezels.bottom,
# this bezel image should already include the visual frames/backgrounds for these areas.

DEBUG_LAYOUT = False  # set True to draw semi-transparent debug rectangles

# Top image window (tweakable)
IMAGE_AREA_WIDTH = 720
IMAGE_AREA_HEIGHT = int(SCREEN_HEIGHT * 0.48)  # ~48% of screen height
IMAGE_AREA_X = (SCREEN_WIDTH - IMAGE_AREA_WIDTH) // 2
IMAGE_AREA_Y = 0

# Main UI panel occupies remaining lower area
UI_PANEL_X = IMAGE_AREA_X
UI_PANEL_Y = IMAGE_AREA_Y + IMAGE_AREA_HEIGHT
UI_PANEL_WIDTH = IMAGE_AREA_WIDTH
UI_PANEL_HEIGHT = SCREEN_HEIGHT - UI_PANEL_Y

# Main bezel (kept naming for compatibility with existing code)
BOTTOM_BEZEL_X = UI_PANEL_X
BOTTOM_BEZEL_Y = UI_PANEL_Y
BOTTOM_BEZEL_WIDTH = UI_PANEL_WIDTH
BOTTOM_BEZEL_HEIGHT = UI_PANEL_HEIGHT

# --- Content regions inside the main bezel ---
# Top band inside bezel: centered choices + (optional) top ornament space
TOP_BAND_Y = BOTTOM_BEZEL_Y + 34
TOP_BAND_HEIGHT = 140

# Choices (centered, stacked)
CHOICES_Y = TOP_BAND_Y + 34
CHOICE_LINE_HEIGHT = 30

# Story text area (big central block) - centered panel with more side padding
TEXT_AREA_X = BOTTOM_BEZEL_X + 70  # Centered with 580px width
TEXT_AREA_Y = TOP_BAND_Y + TOP_BAND_HEIGHT + 18
TEXT_AREA_WIDTH = BOTTOM_BEZEL_WIDTH - 140  # 580px wide (was 600px)
# Items/inventory bar (bottom)
INVENTORY_HEIGHT = 64
INVENTORY_X = BOTTOM_BEZEL_X + 80
INVENTORY_WIDTH = BOTTOM_BEZEL_WIDTH - 160
INVENTORY_Y = BOTTOM_BEZEL_Y + BOTTOM_BEZEL_HEIGHT - INVENTORY_HEIGHT - 24

# Text area height fills the space above inventory
TEXT_AREA_HEIGHT = (INVENTORY_Y - 18) - TEXT_AREA_Y

# Theme definitions# Theme definitions# Theme definitions
THEMES = {
    'fantasy': {
        'name': 'Fantasy',
        'bg_dark': (28, 28, 28),        # #1C1C1C
        'bg_medium': (44, 44, 44),      # #2C2C2C
        'text_primary': (232, 227, 217), # #E8E3D9
        'text_secondary': (184, 179, 169), # #B8B3A9
        'accent': (217, 119, 87),       # #D97757
        'accent_dark': (198, 93, 59),   # #C65D3B
        'font': 'serif'
    },
    'scifi': {
        'name': 'Sci-Fi',
        'bg_dark': (10, 22, 40),        # #0A1628
        'bg_medium': (15, 30, 55),      # #0F1E37
        'text_primary': (0, 255, 255),   # #00FFFF (cyan)
        'text_secondary': (100, 200, 255), # #64C8FF
        'accent': (0, 136, 255),        # #0088FF
        'accent_dark': (0, 100, 200),   # #0064C8
        'font': 'monospace'
    },
    'horror': {
        'name': 'Horror',
        'bg_dark': (18, 8, 8),          # #120808
        'bg_medium': (30, 15, 15),      # #1E0F0F
        'text_primary': (204, 204, 204), # #CCCCCC
        'text_secondary': (160, 160, 160), # #A0A0A0
        'accent': (139, 0, 0),          # #8B0000 (dark red)
        'accent_dark': (100, 0, 0),     # #640000
        'font': 'sans-serif'
    },
    'steampunk': {
        'name': 'Steampunk',
        'bg_dark': (44, 24, 16),        # #2C1810
        'bg_medium': (60, 35, 25),      # #3C2319
        'text_primary': (212, 165, 116), # #D4A574 (brass)
        'text_secondary': (180, 140, 100), # #B48C64
        'accent': (184, 134, 11),       # #B8860B (dark goldenrod)
        'accent_dark': (139, 101, 8),   # #8B6508
        'font': 'serif'
    }
}


# Bezel Drawing Functions
def draw_fantasy_bottom_bezel(surface, theme):
    """Draw SIMPLE bezel - testing only"""
    pygame.draw.rect(surface, theme.get('bg_medium', (44, 44, 44)), (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y, BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT))
    pygame.draw.rect(surface, theme.get('accent', (217, 119, 87)), (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y, BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT), 4)

    if DEBUG_LAYOUT:
        # light text panel
        pygame.draw.rect(surface, (240, 235, 220), (TEXT_AREA_X, TEXT_AREA_Y, TEXT_AREA_WIDTH, TEXT_AREA_HEIGHT))
        # inventory bar
        pygame.draw.rect(surface, (50, 45, 40), (INVENTORY_X, INVENTORY_Y, INVENTORY_WIDTH, INVENTORY_HEIGHT))



def draw_scifi_bottom_bezel(surface, theme):
    """Draw SIMPLE bezel - testing only"""
    pygame.draw.rect(surface, theme.get('bg_medium', (44, 44, 44)), (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y, BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT))
    pygame.draw.rect(surface, theme.get('accent', (217, 119, 87)), (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y, BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT), 4)

    if DEBUG_LAYOUT:
        # light text panel
        pygame.draw.rect(surface, (240, 235, 220), (TEXT_AREA_X, TEXT_AREA_Y, TEXT_AREA_WIDTH, TEXT_AREA_HEIGHT))
        # inventory bar
        pygame.draw.rect(surface, (50, 45, 40), (INVENTORY_X, INVENTORY_Y, INVENTORY_WIDTH, INVENTORY_HEIGHT))



def draw_horror_bottom_bezel(surface, theme):
    """Draw SIMPLE bezel - testing only"""
    pygame.draw.rect(surface, theme.get('bg_medium', (44, 44, 44)), (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y, BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT))
    pygame.draw.rect(surface, theme.get('accent', (217, 119, 87)), (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y, BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT), 4)

    if DEBUG_LAYOUT:
        # light text panel
        pygame.draw.rect(surface, (240, 235, 220), (TEXT_AREA_X, TEXT_AREA_Y, TEXT_AREA_WIDTH, TEXT_AREA_HEIGHT))
        # inventory bar
        pygame.draw.rect(surface, (50, 45, 40), (INVENTORY_X, INVENTORY_Y, INVENTORY_WIDTH, INVENTORY_HEIGHT))



def draw_steampunk_bottom_bezel(surface, theme):
    """Draw SIMPLE bezel - testing only"""
    pygame.draw.rect(surface, theme.get('bg_medium', (44, 44, 44)), (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y, BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT))
    pygame.draw.rect(surface, theme.get('accent', (217, 119, 87)), (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y, BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT), 4)

    if DEBUG_LAYOUT:
        # light text panel
        pygame.draw.rect(surface, (240, 235, 220), (TEXT_AREA_X, TEXT_AREA_Y, TEXT_AREA_WIDTH, TEXT_AREA_HEIGHT))
        # inventory bar
        pygame.draw.rect(surface, (50, 45, 40), (INVENTORY_X, INVENTORY_Y, INVENTORY_WIDTH, INVENTORY_HEIGHT))



def draw_stats_bezel(surface, theme, theme_name):
    """Draw SIMPLE stats bezel - testing only"""
    # Just draw basic rectangles - no fancy stuff
    pygame.draw.rect(surface, (60, 50, 40), (STATS_BEZEL_X, STATS_BEZEL_Y, STATS_BEZEL_WIDTH, STATS_BEZEL_HEIGHT))

class SimpleLEDController:
    """Controls simple GPIO LEDs with PWM pulsing - Pi 5 compatible!
    
    4 color groups (9 LEDs total) for visual feedback:
    - Green (GPIO 16, Pin 36) - Success, healing, victory, items found
    - Blue (GPIO 26, Pin 37) - Normal gameplay, story, exploration
    - Orange (GPIO 20, Pin 38) - Danger, warnings, death, game over, alerts
    - Red (GPIO 21, Pin 40) - ACTIONS ONLY (combat, dice rolls, action button indicator)
    
    Red LEDs: 2 on console frame (left/right) + 1 under action button (3 total)
    All red LEDs flash together when action button is active!
    
    Other colors: 2 LEDs each on console frame (left/right)
    
    Perfect wiring: 5-slot dupont housing on pins 36-40 (4 GPIO + GND at pin 39)
    No special libraries needed - just gpiozero PWM!
    """
    
    def __init__(self, led_pins):
        from gpiozero import PWMLED
        
        self.leds = {}
        
        # Initialize each LED pair with PWM support
        for color, pin in led_pins.items():
            try:
                led = PWMLED(pin)
                self.leds[color] = led
                print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃ‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ LED initialized: {color} (2 LEDs) on GPIO {pin}")
            except Exception as e:
                print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Ã†â€™Ãƒâ€šÃ‚Â¯Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  Failed to initialize {color} LEDs on GPIO {pin}: {e}")
        
        if not self.leds:
            print("Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃ¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ No LEDs initialized!")
        
        # Turn all off on init
        self.off()
    
    def off(self):
        """Turn off all LEDs"""
        for led in self.leds.values():
            led.off()
    
    def set_color(self, color, brightness=1.0):
        """Set LEDs based on color name

        Args:
            color: 'red', 'orange', 'blue', 'green' (only 4 physical colors)
            brightness: 0.0 to 1.0
        """
        self.off()

        # Only support the 4 physical LED colors; otherwise stay off
        if color in self.leds:
            self.leds[color].value = brightness
    
    def pulse(self, color, speed=1.0):
        """Pulse LEDs with PWM (smooth breathing effect)
        
        Args:
            color: 'red', 'orange', 'blue', or 'green'
            speed: Pulse speed (higher = faster)
        """
        self.off()
        
        # Only pulse the specified color
        if color in self.leds:
            # Pulse from 0 to 1 brightness
            # Speed controls how fast (lower time = faster)
            self.leds[color].pulse(fade_in_time=1.0/speed, fade_out_time=1.0/speed)
    
    def blink(self, color, speed=1.0):
        """Blink LEDs on/off
        
        Args:
            color: 'red', 'orange', 'blue', or 'green'
            speed: Blink speed (higher = faster)
        """
        self.off()
        
        if color in self.leds:
            # Blink with specified speed
            self.leds[color].blink(on_time=0.3/speed, off_time=0.3/speed)
    
    def stop_effect(self):
        """Stop all LED effects"""
        self.off()


class GameEngine:
    """Handles game logic and state"""
    
    def __init__(self, game_data):
        self.game_data = game_data
        self.inventory = {}  # Changed to dict to store item objects with stats
        self.variables = {}
        self.pending_stat_popups = []  # [(text, positive_bool)] consumed by UI layer
        self.history = []
        
        # Initialize player stats from game data or defaults
        default_stats = {
            'strength': 0,
            'luck': 0,
            'health': 100
        }
        self.player_stats = game_data.get('player_stats', default_stats).copy()
        
        # Set starting page but don't collect items yet
        # (enter_page will be called after initialization)
        self.current_page = game_data.get('start_page', 'start')
        
        # Enter the starting page (apply stat_mods, collect items)
        self.enter_page(self.current_page)
    
    def get_current_page(self):
        """Get current page data"""
        pages = self.game_data.get('pages', {})
        return pages.get(self.current_page, {})
    
    def has_item(self, item_name, required_quantity=1):
        """Check if player has a specific item (with optional quantity check)"""
        if item_name not in self.inventory:
            return False
        
        # If quantity check is requested
        if required_quantity > 1:
            item = self.inventory[item_name]
            if isinstance(item, dict):
                # Check if item has quantity field
                quantity = item.get('quantity', 1)
                return quantity >= required_quantity
            else:
                # Simple string-based inventory
                return 1 >= required_quantity
        
        return True
    
    def get_stat(self, stat_name):
        """Get player stat value"""
        return self.player_stats.get(self.normalize_stat_key(stat_name), 0)

    def normalize_stat_key(self, stat_name):
        """Normalize stat keys across JSON variants (HP/health, STR/strength, LCK/luck)."""
        if stat_name is None:
            return ''
        s = str(stat_name).strip().lower()
        if s in ('hp', 'health', 'life'):
            return 'health'
        if s in ('str', 'strength', 'power'):
            return 'strength'
        if s in ('lck', 'luck'):
            return 'luck'
        return s
    
    def get_total_stat(self, stat_name):
        """Get total stat including item bonuses"""
        stat_key = self.normalize_stat_key(stat_name)
        total = self.player_stats.get(stat_key, 0)
        
        # Add bonuses from items
        # Support both 'stats' (correct) and 'stat_mods' (ChatGPT's usage) for compatibility
        for item_name, item_data in self.inventory.items():
            if isinstance(item_data, dict):
                item_stats = item_data.get('stats') or item_data.get('stat_mods')
                if item_stats:
                    total += item_stats.get(stat_key, 0)
        
        return total
    
    def get_inventory_items(self):
        """Get list of inventory items for display"""
        items_list = []
        for item_name, item_data in self.inventory.items():
            if isinstance(item_data, dict):
                items_list.append(item_data)
            else:
                # Fallback for old format
                items_list.append({'name': item_data, 'display_name': item_data})
        return items_list
    
    def check_death(self):
        """Check if player has died (health <= 0)"""
        if self.player_stats.get('health', 100) <= 0:
            # Player died - redirect to game over page
            return True
        return False
    
    def get_available_choices(self):
        """Get only choices that player can currently make based on requirements"""
        page = self.get_current_page()
        all_choices = page.get('choices', [])
        available = []
        
        for choice in all_choices:
            locked_reasons = []
            # Check if choice requires an item
            required_item = choice.get('requires_item') or choice.get('required_item')
            required_amount = choice.get('requires_amount', 1)
            required_items = choice.get('requires_items') or choice.get('required_items')

            items_to_check = []
            if required_item:
                items_to_check.append((required_item, required_amount))
            if isinstance(required_items, list):
                for it in required_items:
                    if it:
                        items_to_check.append((it, 1))

            for it, amt in items_to_check:
                if not self.has_item(str(it), amt):
                    locked_reasons.append(f"item:{it}")

            # Check if choice requires flags
            required_flags = choice.get('requires_flags')
            if required_flags:
                flags = required_flags if isinstance(required_flags, list) else [required_flags]
                for f in flags:
                    if not self.variables.get(str(f), False):
                        locked_reasons.append(f"flag:{f}")

            if locked_reasons:
                choice_copy = choice.copy()
                choice_copy['locked'] = True
                choice_copy['locked_reasons'] = locked_reasons
                available.append(choice_copy)
            else:
                available.append(choice)
        
        return available
    
    def make_choice(self, choice_index):
        """Process a choice and move to next page"""
        page = self.get_current_page()
        available_choices = self.get_available_choices()
        
        if choice_index < len(available_choices):
            choice = available_choices[choice_index]
            
            # Check if choice is locked
            if choice.get('locked'):
                return False
            
            # Handle item addition (enhanced system)
            # Support both single item (add_item) and multiple items (add_items)
            if 'add_item' in choice:
                item = choice['add_item']
                if isinstance(item, dict):
                    # Check if it's the new format: {"item_name": quantity}
                    if any(isinstance(v, (int, float)) for v in item.values()):
                        # Object format: {"healing_salve": 1}
                        for item_name, quantity in item.items():
                            display_name = item_name.replace('_', ' ').title()
                            self.inventory[item_name] = {
                                'name': item_name,
                                'display_name': display_name,
                                'quantity': quantity
                            }
                    elif 'name' in item:
                        # Enhanced format with stats: {"name": "sword", "display_name": "Magic Sword", "stats": {...}}
                        item_name = item.get('name')
                        self.inventory[item_name] = item
                    else:
                        # Unknown dict format, store as-is
                        print(f"Warning: Unknown add_item format: {item}")
                else:
                    # Old simple string format (backward compatible)
                    self.inventory[item] = {'name': item, 'display_name': item}
            
            # Support adding multiple items at once
            if 'add_items' in choice:
                items = choice['add_items']
                for item in items:
                    if isinstance(item, dict):
                        item_name = item.get('name')
                        self.inventory[item_name] = item
                    else:
                        self.inventory[item] = {'name': item, 'display_name': item}
            
            # Handle item removal
            if 'remove_item' in choice:
                item_to_remove = choice['remove_item']
                if item_to_remove in self.inventory:
                    del self.inventory[item_to_remove]
            
            # Handle stat modifications
            if 'modify_stats' in choice:
                for stat, value in choice['modify_stats'].items():
                    if stat in self.player_stats:
                        old_value = self.player_stats[stat]
                        self.player_stats[stat] += value
                        if value:
                            label = stat.upper() if stat != 'health' else 'HP'
                            sign = '+' if value > 0 else ''
                            self.pending_stat_popups.append((f"{sign}{value} {label}", value > 0))
            
            # Handle full game reset (clear inventory, reset stats)
            if choice.get('reset_game'):
                # Clear all items
                self.inventory = {}
                
                # Reset stats to starting values
                starting_stats = self.game_data.get('player_stats', {
                    'health': 100,
                    'strength': 0,
                    'luck': 0
                })
                self.player_stats = starting_stats.copy()
                
                # Clear history
                self.history = []
            
            # Check for death after stat changes
            if self.check_death():
                # Force redirect to game_over page if it exists
                if 'game_over' in self.game_data.get('pages', {}):
                    self.current_page = 'game_over'
                    return True
                # If no game_over page, cap health at 1 to prevent softlock
                self.player_stats['health'] = 1
            
            # Handle variable changes
            if 'set_variable' in choice:
                for var, value in choice['set_variable'].items():
                    self.variables[var] = value

            # Handle flags (boolean variables)
            if 'set_flags' in choice:
                flags = choice.get('set_flags')
                if flags:
                    if not isinstance(flags, list):
                        flags = [flags]
                    for f in flags:
                        self.variables[str(f)] = True
            
            # Add to history
            self.history.append({
                'page': self.current_page,
                'choice': choice_index
            })
            
            # Move to next page - support both 'next_page' and 'target' for compatibility
            next_page = choice.get('next_page') or choice.get('target')
            if next_page:
                self.enter_page(next_page)
                return True
        
        return False
    
    def collect_page_items(self):
        """Collect items from the current page (if any)"""
        page = self.get_current_page()
        
        # Support both single item (add_item) and multiple items (add_items)
        if 'add_item' in page:
            item = page['add_item']
            if isinstance(item, dict):
                # Check if it's the new format: {"item_name": quantity}
                if any(isinstance(v, (int, float)) for v in item.values()):
                    # Object format: {"healing_salve": 1}
                    for item_name, quantity in item.items():
                        display_name = item_name.replace('_', ' ').title()
                        self.inventory[item_name] = {
                            'name': item_name,
                            'display_name': display_name,
                            'quantity': quantity
                        }
                elif 'name' in item:
                    # Enhanced format with stats
                    item_name = item.get('name')
                    self.inventory[item_name] = item
                else:
                    # Unknown dict format, store as-is
                    print(f"Warning: Unknown add_item format: {item}")
            else:
                self.inventory[item] = {'name': item, 'display_name': item}
        
        # Support adding multiple items at once
        if 'add_items' in page:
            items = page['add_items']
            for item in items:
                if isinstance(item, dict):
                    item_name = item.get('name')
                    self.inventory[item_name] = item
                else:
                    self.inventory[item] = {'name': item, 'display_name': item}
        
        # NOTE: Item stats are NOT applied to player_stats here to avoid double-counting
        # Item bonuses are calculated on-the-fly by get_total_stat()
    
    def enter_page(self, page_id):
        """Handle page entry - apply stat mods, collect items, check death
        
        Args:
            page_id: The page ID to enter
            
        This method should be used instead of directly setting self.current_page
        to ensure all page-entry logic is executed properly.
        """
        if page_id not in self.game_data['pages']:
            print(f"ERROR: Page '{page_id}' not found!")
            return False
        
        # Update current page
        self.current_page = page_id
        page = self.game_data['pages'][page_id]
        
        # Apply page-level stat modifications (sanctuary healing, etc.)
        if 'stat_mods' in page:
            for stat, value in page['stat_mods'].items():
                stat_key = self.normalize_stat_key(stat)
                if stat_key in self.player_stats:
                    old_value = self.player_stats[stat_key]
                    self.player_stats[stat_key] += value
                    print(f"    {stat_key}: {old_value} â†’ {self.player_stats[stat_key]} ({value:+d})")
                    if value:
                        label = stat_key.upper() if stat_key != 'health' else 'HP'
                        sign = '+' if value > 0 else ''
                        self.pending_stat_popups.append((f"{sign}{value} {label}", value > 0))

        # Flags on enter (boolean variables)
        if 'set_flags_on_enter' in page:
            flags = page.get('set_flags_on_enter')
            if flags:
                if not isinstance(flags, list):
                    flags = [flags]
                for f in flags:
                    self.variables[str(f)] = True
        
        # Collect items from this page
        self.collect_page_items()
        
        # Check if player died (after applying stat mods and collecting items)
        if self.check_death():
            # Override with game_over page if player died
            if 'game_over' in self.game_data.get('pages', {}):
                self.current_page = 'game_over'
            else:
                # If no game_over page, cap at 1 health
                self.player_stats['health'] = 1
        
        return True
    
    def perform_action(self):
        """Perform action button behavior (dice roll, combat, etc)"""
        page = self.get_current_page()
        action = page.get('action', {})
        
        if not action:
            return None
        
        action_type = action.get('type', 'dice')
        
        if action_type == 'dice':
            # Roll dice with stat bonus
            dice_type = action.get('dice', 6)
            base_roll = random.randint(1, dice_type)
            
            # Add stat bonus (default to luck for dice actions)
            stat_name = action.get('stat_bonus', 'luck')
            stat_bonus = self.get_total_stat(stat_name)
            
            result = base_roll + stat_bonus
            target = action.get('target', 0)
            
            success = result >= target if target > 0 else True
            
            return {
                'type': 'dice',
                'base_roll': base_roll,
                'stat_bonus': stat_bonus,
                'result': result,
                'target': target,
                'success': success,
                'prompt': action.get('prompt', ''),  # Custom prompt text
                'failure_damage': action.get('failure_damage', 0),  # NEW: Damage on failure
                'success_page': action.get('success_page'),
                'failure_page': action.get('failure_page')
            }
        
        elif action_type == 'combat' or action_type == 'boss':
            # Combat roll with stat bonus
            base_player_roll = random.randint(1, 20)
            
            # Add stat bonus (default to strength if not specified)
            stat_bonus = 0
            stat_name = action.get('stat_bonus', 'strength')
            stat_bonus = self.get_total_stat(stat_name)
            
            player_roll = base_player_roll + stat_bonus + action.get('player_bonus', 0)
            enemy_roll = random.randint(1, 20) + action.get('enemy_bonus', 0)
            
            success = player_roll > enemy_roll
            
            return {
                'type': 'combat',
                'base_roll': base_player_roll,
                'stat_bonus': stat_bonus,
                'player_roll': player_roll,
                'enemy_roll': enemy_roll,
                'enemy_damage': action.get('enemy_damage', 0),  # NEW: Damage on failure
                'success': success,
                'success_page': action.get('success_page'),
                'failure_page': action.get('failure_page')
            }
        
        return None
    
    def process_action_result(self, result):
        """Move to appropriate page based on action result"""
        # Apply damage on failure (both combat and dice)
        if result and not result['success']:
            damage = 0
            
            # Combat damage
            if result.get('type') == 'combat':
                damage = result.get('enemy_damage', 0)
            
            # Dice roll damage (fall damage, trap damage, etc.)
            elif result.get('type') == 'dice':
                damage = result.get('failure_damage', 0)
            
            if damage > 0:
                self.player_stats['health'] -= damage

                # Enqueue a floating stat popup (match web player feedback)
                try:
                    self.pending_stat_popups.append((f"-{int(damage)} HP", False))
                except Exception:
                    pass
                
                # Check for death
                if self.check_death():
                    # Override failure page with game_over if player died
                    if 'game_over' in self.game_data.get('pages', {}):
                        self.enter_page('game_over')
                        return
                    # If no game_over page, cap at 1 health
                    self.player_stats['health'] = 1
        
        # Normal page transition
        if result and result['success']:
            next_page = result.get('success_page')
        else:
            next_page = result.get('failure_page')
        
        if next_page:
            self.enter_page(next_page)


class DungeonMastronConsole:
    """Main console application"""
    
    def __init__(self):
        # Initialize Pygame (NO audio/mixer - we use pure ALSA!)
        pygame.init()
        
        # Initialize clock for animations and fade transitions
        self.clock = pygame.time.Clock()
        
        self.screen = pygame.display.set_mode(
            (SCREEN_WIDTH, SCREEN_HEIGHT), 
            pygame.FULLSCREEN | pygame.HWSURFACE | pygame.DOUBLEBUF
        )
        pygame.display.set_caption("Dungeon Mastron")
        pygame.mouse.set_visible(False)
        
        # Load assets
        self.splash_image = self.load_image(ASSETS_PATH / "splash.jpg")
        self.insert_cart_image = self.load_image(ASSETS_PATH / "insert_cart.png")
        
        # Initialize hardware - BUTTONS FIRST (simple GPIO)
        self.buttons = {}
        for name, pin in BUTTON_PINS.items():
            btn = Button(pin, pull_up=True, bounce_time=0.1)
            self.buttons[name] = btn
        
        # Initialize LEDs
        print("Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â  Initializing LEDs...")
        self.leds = SimpleLEDController(LED_PINS)
        
        # CRITICAL: Wait for LED PWM to stabilize before enabling audio!
        # This prevents PWM interference with audio hardware
        print("Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃ¢â‚¬Å¡Ãƒâ€šÃ‚Â³ Waiting for LED PWM to stabilize...")
        time.sleep(0.5)  # 0.5 second delay - simple LEDs stabilize faster than NeoPixels
        
        # NOW initialize audio (after NeoPixels are stable)
        self.audio_available = True  # We'll use 'aplay' command
        self._audio_process = None  # Track current speech/narration playback
        self._sound_process = None  # Track current sound effect playback
        self._audio_timer = None    # Track delayed audio playback timer
        print("Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃ‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Audio enabled (using USB audio adapter)")
        print("   USB audio = ZERO GPIO/PWM = ZERO NeoPixel interference!")
        print("   (3.5mm jack shares PWM hardware with NeoPixels = causes noise)")
        
        # Auto-detect USB audio device
        print("\nÃ†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ¢â‚¬Â¦Ãƒâ€šÃ‚Â  Detecting USB audio device...")
        self.audio_device = self.detect_usb_audio()

        
        # MANUAL FALLBACK - Force USB audio if detection fails
        if not self.audio_device:
            print("Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Ã†â€™Ãƒâ€šÃ‚Â¯Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  Auto-detection failed - using manual USB audio...")
            self.audio_device = "plughw:2,0"  # Auto-detected: card 2
            print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Manually set: {self.audio_device}")
        if self.audio_device:
            print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃ‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ USB audio found: {self.audio_device}")
        else:
            print("Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Ã†â€™Ãƒâ€šÃ‚Â¯Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  No USB audio detected - will use system default")
            self.audio_device = None  # Use default
        
        # Test audio by listing available devices (quietly - don't activate hardware yet)
        print("\nÃ†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ¢â‚¬Â¦Ãƒâ€šÃ‚Â  All audio devices:")
        test_result = subprocess.run(['aplay', '-l'], capture_output=True, text=True)
        if test_result.returncode == 0:
            for line in test_result.stdout.split('\n')[:5]:  # First 5 lines
                if line.strip():
                    print(f"   {line}")
        
        # Game state
        self.current_game = None
        self.game_engine = None
        self.usb_path = None
        self.needs_redraw = False
        self.pending_action_result = None  # Store action result for main thread
        self.pending_choice = None  # Store choice for main thread (fade transitions)
        self.awaiting_action_continue = False
        self.pending_action_continue = False
        self._action_continue_result = None
        self.usb_check_pending = False  # Flag: USB inserted, need to check for game
        self.usb_unload_pending = False  # Flag: USB removed, need to unload game
        self.theme = THEMES['fantasy']  # Default theme
        self.action_colors = DEFAULT_ACTION_COLORS.copy()  # Action element colors
        self.action_bezel = None  # Optional action bezel image
        
        # Text scrolling state
        self.text_scroll_offset = 0  # Current scroll position (in lines)
        self.text_scroll_max = 0     # Maximum scroll (total lines - visible lines)
        self.text_scroll_timer = 0   # Timer for auto-scroll
        self.text_all_lines = []     # All text lines for current page
        
        # Audio state
        self.current_speech = None  # Currently playing speech
        self.current_sound = None   # Currently playing sound effect
        
        self.last_page_id = None  # Track page changes to reset animation
        
        # Video playback state (for Ken Burns video animations)
        self.video_capture = None  # Current video being played
        self.video_frame = None    # Current video frame (pygame surface)
        self.current_video_page = None  # Track which page's video is loaded
        
        self.image_cache = {}  # Cache for loaded/scaled images (page images + bezels)
        self.font_cache = {}
        # UI state
        self.configure_fonts('fantasy')# Setup button callbacks
        self.buttons['choice1'].when_pressed = lambda: self.handle_choice(0)
        self.buttons['choice2'].when_pressed = lambda: self.handle_choice(1)
        self.buttons['choice3'].when_pressed = lambda: self.handle_choice(2)
        self.buttons['action'].when_pressed = self.handle_action
        
        # USB monitoring
        self.context = pyudev.Context()
        self.monitor = pyudev.Monitor.from_netlink(self.context)
        self.monitor.filter_by(subsystem='block', device_type='partition')
        self.observer = pyudev.MonitorObserver(self.monitor, self.usb_callback)
        self.observer.start()
    
    def detect_usb_audio(self):
        """Auto-detect USB audio device"""
        try:
            result = subprocess.run(['aplay', '-l'], capture_output=True, text=True)
            if result.returncode != 0:
                return None
            
            # Look for USB audio device
            for line in result.stdout.split('\n'):
                if 'USB' in line and 'card' in line:
                    # Extract card number (e.g., "card 2:")
                    import re
                    match = re.search(r'card (\d+):', line)
                    if match:
                        card_num = match.group(1)
                        # Use "plughw" instead of "hw" - auto-converts mono to stereo!
                        return f"plughw:{card_num},0"
            
            return None
        except:
            return None
    
    def load_image(self, path):
        """Load and scale image to screen size"""
        try:
            image = pygame.image.load(str(path))
            return pygame.transform.scale(image, (SCREEN_WIDTH, SCREEN_HEIGHT))
        except:
            # Return black screen if image not found
            surface = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            surface.fill((0, 0, 0))
            return surface


    def load_asset_image(self, path, *, size=None, mode="stretch"):
        """Load an image with caching.

        - size: (w, h) or None
        - mode:
            - "stretch": scale exactly to size
            - "cover": scale to cover size (maintain aspect ratio, crop when blitted via blit_cover)
        """
        try:
            key = (str(path), size, mode)
            if key in self.image_cache:
                return self.image_cache[key]

            img = pygame.image.load(str(path))
            # Convert for faster blitting
            img = img.convert_alpha() if img.get_alpha() is not None else img.convert()

            if size is not None and mode == "stretch":
                img = pygame.transform.smoothscale(img, size)

            self.image_cache[key] = img
            return img
        except Exception:
            return None

    def blit_cover(self, dest_surface, image, dest_rect):
        """Scale 'image' to cover dest_rect while preserving aspect ratio, then center-crop."""
        try:
            iw, ih = image.get_width(), image.get_height()
            dw, dh = dest_rect.width, dest_rect.height
            if iw <= 0 or ih <= 0 or dw <= 0 or dh <= 0:
                return

            scale = max(dw / iw, dh / ih)
            sw, sh = int(iw * scale), int(ih * scale)
            scaled = pygame.transform.smoothscale(image, (sw, sh))
            
            # Center crop
            x_offset = (sw - dw) // 2
            y_offset = (sh - dh) // 2
            crop_rect = pygame.Rect(x_offset, y_offset, dw, dh)
            
            dest_surface.blit(scaled, dest_rect, crop_rect)
        except Exception as e:
            print(f"Error in blit_cover: {e}")
            pass

    def resolve_font_path(self):
        """Resolve active TTF path based on per-game override or theme preset."""
        # Get theme preset string from theme dictionary
        theme_data = (self.current_game or {}).get("theme", {})
        if isinstance(theme_data, dict):
            theme_name = theme_data.get("preset", "fantasy")
        else:
            theme_name = str(theme_data) if theme_data else "fantasy"

        font_file = None
        if self.current_game:
            font_file = self.current_game.get("font_file") or (self.current_game.get("fonts", {}) or {}).get("ttf")
        if not font_file:
            font_file = THEME_FONT_FILES.get(theme_name, THEME_FONT_FILES["fantasy"])

        # USB first
        if self.usb_path:
            p = self.usb_path / "fonts" / font_file
            if p.exists():
                return p

        # On-device assets
        p = ASSETS_FONTS_DIR / font_file
        if p.exists():
            return p

        return None


    def resolve_bezel_path(self):
        """Resolve active bezel PNG path based on per-game override or theme preset."""
        # Get theme preset string from theme dictionary
        theme_data = (self.current_game or {}).get("theme", {})
        if isinstance(theme_data, dict):
            theme_name = theme_data.get("preset", "fantasy")
        else:
            theme_name = str(theme_data) if theme_data else "fantasy"

        bezel_file = None
        if self.current_game:
            bezels = self.current_game.get("bezels", {}) or {}
            bezel_file = bezels.get("bottom")
        if not bezel_file:
            bezel_file = THEME_BEZEL_FILES.get(theme_name)

        if not bezel_file:
            return None

        if self.usb_path:
            p = self.usb_path / "bezels" / bezel_file
            if p.exists():
                return p

        p = ASSETS_BEZELS_DIR / bezel_file
        if p.exists():
            return p

        return None

    def get_font_size(self, role):
        sizes = (self.current_game or {}).get("font_sizes") or {}
        default_size = DEFAULT_FONT_SIZES.get(role, 20)
        try:
            v = int(sizes.get(role, default_size))
            return max(10, min(72, v))
        except Exception:
            return default_size

    def get_font_color(self, role):
        colors = (self.current_game or {}).get("font_colors") or {}
        default_rgb = DEFAULT_FONT_COLORS.get(role, (255, 255, 255))
        val = colors.get(role)
        if isinstance(val, str):
            # Call as method with self, not standalone function
            rgb = self.hex_to_rgb(val)
            # If conversion failed (returns black), use default
            if rgb == (0, 0, 0) and val != "#000000":
                return default_rgb
            return rgb
        if isinstance(val, (list, tuple)) and len(val) == 3:
            try:
                return (int(val[0]), int(val[1]), int(val[2]))
            except Exception:
                return default_rgb
        return default_rgb
    
    def get_text_shadow_opacity(self):
        """Get text shadow opacity (0-100) from game data, default 85"""
        opacity = (self.current_game or {}).get("text_shadow_opacity", 85)
        try:
            return max(0, min(100, int(opacity)))
        except:
            return 85
    
    def get_main_text_padding(self):
        """Get main text horizontal padding (% from sides), default 11"""
        padding = (self.current_game or {}).get("main_text_padding", 11)
        try:
            return max(0, min(25, float(padding)))
        except:
            return 11
    
    def get_main_text_top_padding(self):
        """Get main text top padding (% extra spacing), default 0"""
        padding = (self.current_game or {}).get("main_text_top_padding", 0)
        try:
            return max(0, min(10, float(padding)))
        except:
            return 0
    
    def get_main_text_max_height(self):
        """Get maximum height for main text area (pixels), default 500"""
        height = (self.current_game or {}).get("main_text_max_height", 500)
        try:
            return max(200, min(800, int(height)))
        except:
            return 500
    
    def get_text_area_rows(self):
        """Get number of text rows for main text area, default 14"""
        rows = (self.current_game or {}).get("text_area_rows", 14)
        try:
            return max(10, min(24, int(rows)))
        except:
            return 14
    
    def get_font_position(self, role):
        """Get Y position as % from bottom (0=bottom, 100=top)."""
        positions = (self.current_game or {}).get("font_positions") or {}
        legacy_bottom = (self.current_game or {}).get("bottom_positions_percent") or (self.current_game or {}).get("bottom_pixel_positions") or {}

        defaults_pct = {
            "choices": 48.0,
            "main": 39.0,
            "stats": 10.0,
            "separator": 6.0,
            "items": 3.0,
        }

        val = None
        if role in positions:
            val = positions.get(role)
        elif role in legacy_bottom:
            val = legacy_bottom.get(role)

        try:
            fval = float(val)
        except Exception:
            fval = None

        # If legacy pixels-from-bottom provided (>100), convert to %
        if fval is not None and fval > 100:
            fval = max(0.0, min(100.0, (fval / SCREEN_HEIGHT) * 100.0))

        # Clamp and fall back
        if fval is None:
            fval = defaults_pct.get(role, 0.0)
        else:
            fval = max(0.0, min(100.0, fval))

        return fval

    def get_font(self, role):
        """Get font for a specific role with robust fallback"""
        ttf_path = self.resolve_font_path()
        size = self.get_font_size(role)
        
        key = (str(ttf_path) if ttf_path else "default", size)
        if key in self.font_cache:
            return self.font_cache[key]
        
        # Try to load the font
        try:
            if ttf_path and ttf_path.exists():
                f = pygame.font.Font(str(ttf_path), size)
            else:
                f = pygame.font.Font(None, size)
        except Exception as e:
            print(f"Font load error for {role}: {e}, using default")
            f = pygame.font.Font(None, size)
        
        self.font_cache[key] = f
        return f

    def usb_callback(self, action, device):
        """Handle USB insertion/removal
        
        Args:
            action: 'add' or 'remove' 
            device: pyudev device object
        """
        if action == 'add':
            print(f"[USB] USB detected - flagging for game check...")
            # Don't load game here! (wrong thread for pygame)
            # Set flag for main loop to check
            self.usb_check_pending = True
        elif action == 'remove':
            print(f"[USB-OUT] USB removed - flagging for unload...")
            self.usb_unload_pending = True
    
    def check_for_game(self):
        """Check mounted USB devices for game data"""
        print(f"[CHECK] check_for_game() called")
        print(f"   Looking in: {USB_MOUNT_BASE}")
        
        try:
            if not os.path.exists(USB_MOUNT_BASE):
                print(f"   ÃƒÂ¢Ã‚ÂÃ…â€™ USB mount base doesn't exist: {USB_MOUNT_BASE}")
                return False
            
            print(f"   ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ USB mount base exists")
            devices = os.listdir(USB_MOUNT_BASE)
            print(f"   Found {len(devices)} device(s): {devices}")
            
            for device in devices:
                device_path = Path(USB_MOUNT_BASE) / device
                print(f"   ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â Checking device: {device_path}")
                
                game_file = device_path / "game.json"
                print(f"      Looking for: {game_file}")
                
                if game_file.exists():
                    print(f"      ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FOUND game.json!")
                    self.load_game(device_path)
                    return True
                else:
                    print(f"      ÃƒÂ¢Ã‚ÂÃ…â€™ No game.json found")
                    # Show what IS in the directory
                    try:
                        contents = list(device_path.iterdir())
                        print(f"      Directory contents ({len(contents)} items):")
                        for item in contents[:5]:
                            print(f"         - {item.name}")
                        if len(contents) > 5:
                            print(f"         ... and {len(contents) - 5} more")
                    except Exception as e:
                        print(f"      ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â  Can't list directory: {e}")
            
            print(f"   ÃƒÂ¢Ã‚ÂÃ…â€™ No game.json found in any device")
        except Exception as e:
            print(f"   ÃƒÂ¢Ã‚ÂÃ…â€™ Error checking for game: {e}")
            import traceback
            traceback.print_exc()
        
        return False
    

    def configure_fonts(self, theme_name: str):
        """Configure fonts per theme.
        
        This sets up fallback fonts for parts of the UI that haven't migrated
        to the get_font() system yet (like splash screens).
        Main game text now uses get_font() which properly supports theme fonts
        and custom overrides.
        """
        # Get the theme's font file
        font_file = THEME_FONT_FILES.get(theme_name, THEME_FONT_FILES["fantasy"])
        font_path = None

        # 1) Try USB first
        try:
            if self.usb_path:
                usb_font = Path(self.usb_path) / "fonts" / font_file
                if usb_font.exists():
                    font_path = str(usb_font)
        except Exception:
            pass

        # 2) Try console_assets
        if font_path is None:
            try:
                asset_font = ASSETS_FONTS_DIR / font_file
                if asset_font.exists():
                    font_path = str(asset_font)
            except Exception:
                pass

        # Set up fallback fonts (for splash, loading, etc)
        # Main game text uses get_font() system now
        if font_path:
            try:
                self.font_small = pygame.font.Font(font_path, 20)
                self.font_medium = pygame.font.Font(font_path, 28)
                self.font_large = pygame.font.Font(font_path, 40)
            except Exception:
                # Fall back to pygame default if font load fails
                self.font_large = pygame.font.Font(None, 54)
                self.font_medium = pygame.font.Font(None, 40)
                self.font_small = pygame.font.Font(None, 28)
        else:
            # No custom font found, use pygame default
            self.font_large = pygame.font.Font(None, 54)
            self.font_medium = pygame.font.Font(None, 40)
            self.font_small = pygame.font.Font(None, 28)

    def load_game(self, usb_path):
        """Load game from USB cart"""
        print(f"[LOAD] Starting game load from: {usb_path}")
        try:
            game_file = usb_path / "game.json"
            print(f"[LOAD] Reading game.json...")
            with open(game_file, 'r') as f:
                self.current_game = json.load(f)

            # Stat popup config (Pi runtime)
            sp = (self.current_game or {}).get('stat_popup', {}) or {}
            self.stat_popup_cfg = {
                'font_size': int(sp.get('font_size', 24) or 24),
                'positive_color': sp.get('positive_color', '#86efac') or '#86efac',
                'negative_color': sp.get('negative_color', '#fca5a5') or '#fca5a5',
                'duration_ms': int(sp.get('duration_ms', 900) or 900),
                'move_px': int(sp.get('move_px', 26) or 26),
            }
            self._active_stat_popup = None
            
            # BACKWARD COMPATIBILITY: normalize positions to % from bottom
            fp = self.current_game.get('font_positions', {}) or {}
            bp_px = self.current_game.get('bottom_pixel_positions', {}) or {}
            bp_pct = self.current_game.get('bottom_positions_percent', {}) or {}

            def clamp_pct(v, default):
                try:
                    n = float(v)
                    return max(0.0, min(100.0, n))
                except Exception:
                    return default

            # Convert legacy pixels-from-bottom to % if present
            if bp_px and not bp_pct:
                self.current_game['bottom_positions_percent'] = {}
                for k, v in bp_px.items():
                    try:
                        self.current_game['bottom_positions_percent'][k] = clamp_pct((float(v) / SCREEN_HEIGHT) * 100.0, 0.0)
                    except Exception:
                        pass

            # Convert legacy top-based font_positions entries
            if 'bottom_positions_percent' not in self.current_game:
                self.current_game['bottom_positions_percent'] = {}

            default_bottoms = {
                'stats': (122 / SCREEN_HEIGHT) * 100.0,
                'separator': (81 / SCREEN_HEIGHT) * 100.0,
                'items': (41 / SCREEN_HEIGHT) * 100.0,
            }

            for key, default_bottom in default_bottoms.items():
                if key in fp and key not in self.current_game['bottom_positions_percent']:
                    try:
                        top_pct = float(fp[key])
                        self.current_game['bottom_positions_percent'][key] = clamp_pct(100.0 - top_pct, default_bottom)
                    except Exception:
                        pass

            def bottom_from_maybe_top(val, default_bottom):
                try:
                    n = float(val)
                except Exception:
                    return default_bottom
                if n > 100:
                    # pixels from top
                    return clamp_pct(((SCREEN_HEIGHT - n) / SCREEN_HEIGHT) * 100.0, default_bottom)
                # percent from top
                return clamp_pct(100.0 - n, default_bottom)

            choices_bottom = bottom_from_maybe_top(fp.get('choices', 52.0), 48.0)
            main_bottom = bottom_from_maybe_top(fp.get('main', 61.0), 39.0)

            self.current_game['font_positions'] = {
                'choices': choices_bottom,
                'main': main_bottom,
                'stats': self.current_game['bottom_positions_percent'].get('stats', clamp_pct((float(bp_px.get('stats', 122)) / SCREEN_HEIGHT) * 100.0, 10.0)),
                'separator': self.current_game['bottom_positions_percent'].get('separator', clamp_pct((float(bp_px.get('separator', 81)) / SCREEN_HEIGHT) * 100.0, 6.0)),
                'items': self.current_game['bottom_positions_percent'].get('items', clamp_pct((float(bp_px.get('items', 41)) / SCREEN_HEIGHT) * 100.0, 3.0))
            }
            self.current_game['bottom_positions_percent'] = {
                'stats': self.current_game['font_positions']['stats'],
                'separator': self.current_game['font_positions']['separator'],
                'items': self.current_game['font_positions']['items']
            }

            if 'bottom_pixel_positions' in self.current_game:
                del self.current_game['bottom_pixel_positions']

            print(f"[COMPAT] Normalized positions to % from bottom")
            
            print(f"[OK] JSON loaded successfully")
            self.usb_path = usb_path
            print(f"[GAME] Creating game engine...")
            self.game_engine = GameEngine(self.current_game)
            print(f"[OK] Game engine created")
            
            # Load theme - handle both string and dict formats
            theme_value = self.current_game.get("theme", "fantasy")
            if isinstance(theme_value, str):
                theme_name = theme_value
            elif isinstance(theme_value, dict):
                theme_name = theme_value.get("preset", "fantasy")
            else:
                theme_name = "fantasy"
            self.theme = THEMES.get(theme_name, THEMES['fantasy']).copy()
            print(f"[RENDER] Loading theme: {theme_name}")
            self.configure_fonts(theme_name)
            
            # Apply custom colors if present (override preset)
            # Get custom theme settings if theme is a dict
            theme_value = self.current_game.get('theme', {})
            if isinstance(theme_value, dict):
                custom_theme = theme_value.get('custom', {})
            else:
                custom_theme = {}
            if custom_theme:
                # Convert hex colors to RGB tuples
                if 'primary_color' in custom_theme:
                    self.theme['text_primary'] = self.hex_to_rgb(custom_theme['primary_color'])
                if 'accent_color' in custom_theme:
                    self.theme['accent'] = self.hex_to_rgb(custom_theme['accent_color'])
                    # Also update accent_dark (slightly darker version)
                    r, g, b = self.hex_to_rgb(custom_theme['accent_color'])
                    self.theme['accent_dark'] = (max(0, r-20), max(0, g-20), max(0, b-20))
                if 'background_color' in custom_theme:
                    self.theme['bg_dark'] = self.hex_to_rgb(custom_theme['background_color'])
                    # Also update bg_medium (slightly lighter version)
                    r, g, b = self.hex_to_rgb(custom_theme['background_color'])
                    self.theme['bg_medium'] = (min(255, r+20), min(255, g+20), min(255, b+20))
                if 'secondary_color' in custom_theme:
                    self.theme['text_secondary'] = self.hex_to_rgb(custom_theme['secondary_color'])
                if 'font' in custom_theme:
                    self.theme['font'] = custom_theme['font']
            
            # Load action colors if present (overrides defaults)
            self.action_colors = DEFAULT_ACTION_COLORS.copy()
            action_colors = self.current_game.get('action_colors', {})
            if action_colors:
                if 'border' in action_colors:
                    self.action_colors['border'] = self.hex_to_rgb(action_colors['border'])
                if 'background' in action_colors:
                    self.action_colors['background'] = self.hex_to_rgb(action_colors['background'])
                if 'dice' in action_colors:
                    self.action_colors['dice'] = self.hex_to_rgb(action_colors['dice'])
                if 'dice_text' in action_colors:
                    self.action_colors['dice_text'] = self.hex_to_rgb(action_colors['dice_text'])
                if 'victory' in action_colors:
                    self.action_colors['victory'] = self.hex_to_rgb(action_colors['victory'])
                if 'failure' in action_colors:
                    self.action_colors['failure'] = self.hex_to_rgb(action_colors['failure'])
            
            print(f"[IMAGE] Loading action bezel (if specified)...")
            # Load action bezel if specified
            self.action_bezel = None
            action_bezel_file = self.current_game.get('action_bezel')
            
            # If no action bezel specified in JSON, auto-load based on theme
            if not action_bezel_file:
                # Auto-detect theme-based action bezel
                theme_action_bezel = f"{theme_name}_action_bezel.png"
                print(f"   No action bezel in JSON, trying theme default: {theme_action_bezel}")
                
                # Try console_assets first
                from pathlib import Path
                ASSETS_BEZELS_DIR = Path("/home/dm/dungeon_mastron/console_assets/bezels")
                action_bezel_path = ASSETS_BEZELS_DIR / theme_action_bezel
                if action_bezel_path.exists():
                    try:
                        self.action_bezel = self.load_asset_image(action_bezel_path, size=(SCREEN_WIDTH, SCREEN_HEIGHT))
                        print(f"   ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Auto-loaded action bezel: {action_bezel_path}")
                    except Exception as e:
                        print(f"   ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Failed to load action bezel: {e}")
                else:
                    print(f"   ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¹ÃƒÂ¯Ã‚Â¸Ã‚Â No action bezel found, will use normal bezel for actions")
            else:
                # Manual action bezel specified in JSON
                action_bezel_path = usb_path / "action_bezel" / action_bezel_file
                if action_bezel_path.exists():
                    try:
                        self.action_bezel = self.load_asset_image(action_bezel_path, size=(SCREEN_WIDTH, SCREEN_HEIGHT))
                        print(f"   ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Action bezel loaded: {action_bezel_file}")
                    except Exception as e:
                        print(f"   ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Failed to load action bezel: {e}")
            
                    except Exception as e:
                        print(f"[WARNING]Ãƒâ€šÃ‚Â  Failed to load action bezel: {e}")
            
            # LED effect for game loaded
            print(f"[LED] Pulsing green LED...")
            self.leds.pulse('green', 2.0)
            time.sleep(2)
            
            print(f"[OK] Game loaded: {self.current_game.get('title', 'Unknown')}")
            print(f"[OK] Theme: {self.theme['name']}")
            if custom_theme:
                print(f"[OK] Custom colors applied!")
            
        except Exception as e:
            print("=" * 70)
            print(f"[ERROR] CRITICAL ERROR LOADING GAME:")
            print(f"   Error: {e}")
            print(f"   Type: {type(e).__name__}")
            import traceback
            print(f"   Traceback:")
            traceback.print_exc()
            print("=" * 70)
            self.current_game = None
            self.game_engine = None
    
    def hex_to_rgb(self, hex_color):
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def unload_game(self):
        """Unload current game"""
        # Release video capture if active
        self.release_video()
        
        self.current_game = None
        self.game_engine = None
        self.usb_path = None
        
        # Clear caches
        if hasattr(self, 'special_bg_cache'):
            self.special_bg_cache.clear()
            self.special_bg_current_page = None
        
        self.leds.off()
    
    def handle_choice(self, choice_index):
        """Handle choice button press (runs in GPIO thread)"""
        if not self.game_engine:
            return

        # If we're waiting for the player to acknowledge an action result,
        # any choice button acts as "Continue".
        if getattr(self, 'awaiting_action_continue', False):
            self.pending_action_continue = True
            return
        
        page = self.game_engine.get_current_page()
        choices = page.get('choices', [])
        
        print(f"[BUTTON] Button {choice_index+1} pressed (page: {self.game_engine.current_page})")
        
        # Special page handling: any button advances to first choice
        if page.get('special_page') and len(choices) > 0:
            print(f"   Special page detected - using first choice")
            choice_index = 0  # Always use first choice on special pages
        
        if choice_index < len(choices):
            # Button feedback
            self.leds.blink('blue', 3.0)
            time.sleep(0.3)
            
            print(f"   [OK] Choice queued: {choice_index}")
            # Queue the choice for main thread to handle
            # (Can't do fade here - pygame must run in main thread!)
            self.pending_choice = choice_index
        else:
            print(f"   [WARNING]Ãƒâ€šÃ‚Â  Invalid choice index {choice_index} (only {len(choices)} choices)")
    
    def handle_action(self):
        """Handle action button press"""
        if not self.game_engine:
            return

        # If we're waiting for the player to acknowledge an action result,
        # Action acts as "Continue".
        if getattr(self, 'awaiting_action_continue', False):
            self.pending_action_continue = True
            return
        
        page = self.game_engine.get_current_page()
        
        # Special page handling: action button can also advance
        if page.get('special_page'):
            print("[BUTTON] Action button pressed on special page - advancing...")
            choices = page.get('choices', [])
            if len(choices) > 0:
                self.pending_choice = 0  # Use first choice
            return
        
        if not page.get('action'):
            return
        
        # Perform action
        result = self.game_engine.perform_action()
        
        if result:
            # Queue result for main thread to display (can't draw from GPIO thread!)
            self.pending_action_result = result
    
    def apply_page_effects(self):
        """Apply LED effects based on current page"""
        if not self.game_engine:
            return
        
        page = self.game_engine.get_current_page()
        led_effect = page.get('led_effect', {})
        
        if not led_effect:
            self.leds.off()
            return
        
        effect_type = led_effect.get('type', 'solid')
        color = led_effect.get('color', 'white')
        speed = led_effect.get('speed', 1.0)
        
        if effect_type == 'solid':
            brightness = led_effect.get('brightness', 1.0)
            self.leds.set_color(color, brightness)
        elif effect_type == 'pulse':
            self.leds.pulse(color, speed)
        elif effect_type == 'blink':
            self.leds.blink(color, speed)
        elif effect_type == 'off':
            self.leds.off()
    
    def fade_to_black(self, duration=0.2):
        """Fade current screen to black"""
        if not hasattr(self, 'screen') or not self.screen:
            return
        
        # Create a copy of current screen
        original_surface = self.screen.copy()
        
        # Number of frames for smooth transition (60fps * duration)
        num_frames = int(60 * duration)
        
        for i in range(num_frames):
            # Calculate alpha (0 = transparent, 255 = opaque)
            alpha = int((i / num_frames) * 255)
            
            # Draw original screen
            self.screen.blit(original_surface, (0, 0))
            
            # Create black overlay with increasing opacity
            black_overlay = pygame.Surface(self.screen.get_size())
            black_overlay.fill((0, 0, 0))
            black_overlay.set_alpha(alpha)
            self.screen.blit(black_overlay, (0, 0))
            
            # Update display
            pygame.display.flip()
            self.clock.tick(60)  # 60 FPS
    
    def hold_black(self, duration=0.15):
        """Hold on solid black screen for a brief pause"""
        if not hasattr(self, 'screen') or not self.screen:
            return
        
        # Fill screen with black
        self.screen.fill((0, 0, 0))
        pygame.display.flip()
        
        # Hold for duration
        time.sleep(duration)
    
    def fade_from_black(self, duration=0.3):
        """Fade from black to current screen"""
        if not hasattr(self, 'screen') or not self.screen:
            return
        
        # Redraw the new page content (but don't display yet)
        self.draw_game_page()  # Fixed: use correct method name
        new_surface = self.screen.copy()
        
        # Number of frames for smooth transition
        num_frames = int(60 * duration)
        
        for i in range(num_frames):
            # Calculate alpha (start at 255, decrease to 0)
            alpha = int(((num_frames - i) / num_frames) * 255)
            
            # Draw new page
            self.screen.blit(new_surface, (0, 0))
            
            # Create black overlay with decreasing opacity
            black_overlay = pygame.Surface(self.screen.get_size())
            black_overlay.fill((0, 0, 0))
            black_overlay.set_alpha(alpha)
            self.screen.blit(black_overlay, (0, 0))
            
            # Update display
            pygame.display.flip()
            self.clock.tick(60)  # 60 FPS
    
    def draw_d20_dice(self, surface, center_x, center_y, number, size=200, dice_color=None, number_color=None):
        """Draw a beautiful D20 dice with a number"""
        # Use custom colors if provided, otherwise use action colors
        if dice_color is None:
            dice_color = self.action_colors.get('dice', (255, 255, 255))
        if number_color is None:
            number_color = self.action_colors.get('dice_text', (0, 0, 0))
        
        shadow_color = (50, 50, 50)
        
        # Draw shadow
        shadow_points = []
        for i in range(6):
            angle = i * (360 / 6) + 30
            rad = (angle * 3.14159) / 180
            x = center_x + int((size // 2 + 5) * pygame.math.Vector2(1, 0).rotate(angle).x)
            y = center_y + int((size // 2 + 5) * pygame.math.Vector2(1, 0).rotate(angle).y)
            shadow_points.append((x, y))
        
        pygame.draw.polygon(surface, shadow_color, shadow_points)
        
        # Draw hexagon (simple D20 representation)
        points = []
        for i in range(6):
            angle = i * (360 / 6) + 30
            rad = (angle * 3.14159) / 180
            x = center_x + int((size // 2) * pygame.math.Vector2(1, 0).rotate(angle).x)
            y = center_y + int((size // 2) * pygame.math.Vector2(1, 0).rotate(angle).y)
            points.append((x, y))
        
        pygame.draw.polygon(surface, dice_color, points)
        pygame.draw.polygon(surface, (200, 200, 200), points, 4)
        
        # Draw number in center
        font_size = size // 2
        dice_font = pygame.font.Font(None, font_size)
        number_surf = dice_font.render(str(number), True, number_color)
        number_rect = number_surf.get_rect(center=(center_x, center_y))
        surface.blit(number_surf, number_rect)

    def get_action_dice_size(self):
        styles = self.current_game.get('action_styles') or {}
        try:
            size = float(styles.get('dice_size', DEFAULT_ACTION_DICE_SIZE))
        except Exception:
            size = DEFAULT_ACTION_DICE_SIZE
        # Keep in a reasonable range
        size = max(90, min(160, size))
        return int(size)
    
    def show_action_result(self, result):
        """Display enhanced action result with visual dice rolling"""
        action_type = result['type']
        
        # Get action colors
        bg_color = self.action_colors.get('background', (28, 28, 28))
        border_color = self.action_colors.get('border', (217, 119, 87))
        
        # Get action panel Y position (% from top, default 30%)
        action_y_percent = self.current_game.get('action_position_y', DEFAULT_ACTION_POSITION_Y)
        panel_top_y = int(SCREEN_HEIGHT * (action_y_percent / 100.0))
        
        # Get action panel height (pixels, default 180px)
        panel_height = self.current_game.get('action_panel_height', DEFAULT_ACTION_PANEL_HEIGHT)
        
        # Get action element Y positions (now % from bottom; support legacy %/px from top)
        ap = self.current_game.get('action_positions_percent', {}) or {}

        def action_pct_top(key, legacy_key, fallback_bottom_pct):
            raw = ap.get(key)
            if raw is None:
                raw = self.current_game.get(legacy_key)
            try:
                val = float(raw)
            except Exception:
                val = None

            if val is None:
                bottom_pct = fallback_bottom_pct
            elif val > 100:
                # pixels from top -> convert to % top
                return max(0.0, min(100.0, (val / SCREEN_HEIGHT) * 100.0))
            else:
                # assume % from bottom -> convert to top
                bottom_pct = max(0.0, min(100.0, val))
            return 100.0 - bottom_pct

        action_text_y_percent = action_pct_top('text', 'action_text_y', 90.0)
        action_dice_y_percent = action_pct_top('dice', 'action_dice_y', 82.0)
        action_result_y_percent = action_pct_top('result', 'action_result_y', 85.0)
        
        # Get text styling
        text_size = self.current_game.get('action_text_size', DEFAULT_ACTION_TEXT_SIZE)
        text_color_hex = self.current_game.get('action_text_color', '#FFFFFF')
        text_color = self.hex_to_rgb(text_color_hex)
        
        # Create action font
        action_font = pygame.font.Font(None, text_size)
        
        # Calculate absolute Y positions from percentages
        center_x = SCREEN_WIDTH // 2
        text_y = int(SCREEN_HEIGHT * (action_text_y_percent / 100.0))
        dice_y = int(SCREEN_HEIGHT * (action_dice_y_percent / 100.0))
        result_y = int(SCREEN_HEIGHT * (action_result_y_percent / 100.0))

        # Dice size
        dice_size = self.get_action_dice_size()
        
        # Define panel rect
        panel_rect = pygame.Rect(0, panel_top_y, SCREEN_WIDTH, panel_height)
        
        if action_type == 'combat':
            # === COMBAT SEQUENCE ===
            
            # Draw game page ONCE and save it
            self.draw_game_page()
            background = self.screen.copy()  # Save the rendered page
            
            # Get action colors and positioning
            bg_color = self.action_colors.get('background', (28, 28, 28))
            border_color = self.action_colors.get('border', (217, 119, 87))
            action_y_percent = self.current_game.get('action_position_y', DEFAULT_ACTION_POSITION_Y)
            panel_top_y = int(SCREEN_HEIGHT * (action_y_percent / 100.0))
            panel_height = self.current_game.get('action_panel_height', DEFAULT_ACTION_PANEL_HEIGHT)
            panel_rect = pygame.Rect(0, panel_top_y, SCREEN_WIDTH, panel_height)
            
            action_text_y_percent = action_pct_top('text', 'action_text_y', 90.0)
            action_dice_y_percent = action_pct_top('dice', 'action_dice_y', 82.0)
            text_size = self.current_game.get('action_text_size', DEFAULT_ACTION_TEXT_SIZE)
            text_color_hex = self.current_game.get('action_text_color', '#FFFFFF')
            text_color = self.hex_to_rgb(text_color_hex)
            action_font = pygame.font.Font(None, text_size)
            center_x = SCREEN_WIDTH // 2
            text_y = int(SCREEN_HEIGHT * (action_text_y_percent / 100.0))
            dice_y = int(SCREEN_HEIGHT * (action_dice_y_percent / 100.0))
            
            # Step 1: Show enemy roll immediately (no wait)
            enemy_roll = result['enemy_roll']
            
            self.screen.blit(background, (0, 0))
            
            # Draw action bezel if present, otherwise draw panel
            if self.action_bezel:
                self.screen.blit(self.action_bezel, (0, 0))
            else:
                pygame.draw.rect(self.screen, bg_color, panel_rect)
                pygame.draw.rect(self.screen, border_color, panel_rect, 3)
            
            text = f"The Enemy Rolled {enemy_roll}"
            text_surf = action_font.render(text, True, text_color)
            text_rect = text_surf.get_rect(center=(center_x, text_y))
            self.screen.blit(text_surf, text_rect)
            
            self.draw_d20_dice(self.screen, center_x, dice_y, enemy_roll, dice_size)
            
            pygame.display.flip()
            time.sleep(1.5)  # Shorter wait
            
            # Step 2: Rolling animation for player (smooth - no redraw!)
            for frame in range(12):
                # Start with saved background
                self.screen.blit(background, (0, 0))
                
                # Draw action bezel if present, otherwise draw overlay panel
                if self.action_bezel:
                    self.screen.blit(self.action_bezel, (0, 0))
                else:
                    pygame.draw.rect(self.screen, bg_color, panel_rect)
                    pygame.draw.rect(self.screen, border_color, panel_rect, 3)
                
                # Show rolling text
                roll_text = "Rolling..."
                roll_surf = action_font.render(roll_text, True, text_color)
                roll_rect = roll_surf.get_rect(center=(center_x, text_y))
                self.screen.blit(roll_surf, roll_rect)
                
                # Animate dice with random numbers
                random_num = random.randint(1, 20)
                self.draw_d20_dice(self.screen, center_x, dice_y, random_num, dice_size)
                
                pygame.display.flip()
                time.sleep(0.1)
            
            # Step 3: Show player result
            base_roll = result.get('base_roll', 0)
            stat_bonus = result.get('stat_bonus', 0)
            player_roll = result['player_roll']
            
            self.screen.blit(background, (0, 0))
            
            # Draw action bezel if present, otherwise draw panel
            if self.action_bezel:
                self.screen.blit(self.action_bezel, (0, 0))
            else:
                pygame.draw.rect(self.screen, bg_color, panel_rect)
                pygame.draw.rect(self.screen, border_color, panel_rect, 3)
            
            # Build result text
            if stat_bonus > 0:
                result_text = f"You Rolled {base_roll} + {stat_bonus} = {player_roll}"
            else:
                result_text = f"You Rolled {player_roll}"
            
            result_surf = action_font.render(result_text, True, text_color)
            result_rect = result_surf.get_rect(center=(center_x, text_y))
            self.screen.blit(result_surf, result_rect)
            
            # Draw final dice
            self.draw_d20_dice(self.screen, center_x, dice_y, base_roll, dice_size)
            
            pygame.display.flip()
            time.sleep(2.0)
            
            # Done! No victory/defeat overlay - go straight to fade
        
        elif action_type == 'dice':
            # === DICE ROLL SEQUENCE ===
            
            # Draw game page ONCE and save it
            self.draw_game_page()
            background = self.screen.copy()  # Save the rendered page
            
            target = result.get('target', 0)
            base_roll = result.get('base_roll', result['result'])
            stat_bonus = result.get('stat_bonus', 0)
            final_result = result['result']
            
            # Step 1: Rolling animation (start immediately - prompt already on page!)
            for frame in range(12):
                # Start with saved background
                self.screen.blit(background, (0, 0))
                
                # Draw action bezel if present, otherwise draw panel
                # Get action colors and positioning (same as draw_game_page)
                bg_color = self.action_colors.get('background', (28, 28, 28))
                border_color = self.action_colors.get('border', (217, 119, 87))
                action_y_percent = self.current_game.get('action_position_y', DEFAULT_ACTION_POSITION_Y)
                panel_top_y = int(SCREEN_HEIGHT * (action_y_percent / 100.0))
                panel_height = self.current_game.get('action_panel_height', DEFAULT_ACTION_PANEL_HEIGHT)
                panel_rect = pygame.Rect(0, panel_top_y, SCREEN_WIDTH, panel_height)
                
                action_text_y_percent = action_pct_top('text', 'action_text_y', 90.0)
                action_dice_y_percent = action_pct_top('dice', 'action_dice_y', 82.0)
                text_size = self.current_game.get('action_text_size', DEFAULT_ACTION_TEXT_SIZE)
                text_color_hex = self.current_game.get('action_text_color', '#FFFFFF')
                text_color = self.hex_to_rgb(text_color_hex)
                action_font = pygame.font.Font(None, text_size)
                center_x = SCREEN_WIDTH // 2
                text_y = int(SCREEN_HEIGHT * (action_text_y_percent / 100.0))
                dice_y = int(SCREEN_HEIGHT * (action_dice_y_percent / 100.0))
                
                if self.action_bezel:
                    self.screen.blit(self.action_bezel, (0, 0))
                else:
                    pygame.draw.rect(self.screen, bg_color, panel_rect)
                    pygame.draw.rect(self.screen, border_color, panel_rect, 3)
                
                roll_text = "Rolling..."
                roll_surf = action_font.render(roll_text, True, text_color)
                roll_rect = roll_surf.get_rect(center=(center_x, text_y))
                self.screen.blit(roll_surf, roll_rect)
                
                random_num = random.randint(1, 20)
                self.draw_d20_dice(self.screen, center_x, dice_y, random_num, dice_size)
                
                pygame.display.flip()
                time.sleep(0.1)
            
            # Step 2: Show result
            self.screen.blit(background, (0, 0))
            
            # Draw action bezel if present, otherwise draw panel
            if self.action_bezel:
                self.screen.blit(self.action_bezel, (0, 0))
            else:
                pygame.draw.rect(self.screen, bg_color, panel_rect)
                pygame.draw.rect(self.screen, border_color, panel_rect, 3)
            
            if stat_bonus > 0:
                result_text = f"Rolled {base_roll} + {stat_bonus} = {final_result}"
            else:
                result_text = f"Rolled {final_result}"
            
            result_surf = action_font.render(result_text, True, text_color)
            result_rect = result_surf.get_rect(center=(center_x, text_y))
            self.screen.blit(result_surf, result_rect)
            
            self.draw_d20_dice(self.screen, center_x, dice_y, base_roll, dice_size)
            
            pygame.display.flip()
            
            # Done! No success/failure overlay - go straight to fade

        # Prompt for continue (stay on result screen until a button is pressed)
        try:
            hint_font = pygame.font.Font(None, 28)
            hint_color = self.get_font_color('choices') if hasattr(self, 'get_font_color') else (232, 227, 217)
            hint = "Press any button to continue"
            hint_surf = hint_font.render(hint, True, hint_color)
            hint_rect = hint_surf.get_rect(center=(SCREEN_WIDTH // 2, int(SCREEN_HEIGHT * 0.92)))
            self.screen.blit(hint_surf, hint_rect)
            pygame.display.flip()
        except Exception:
            pass
    
    def draw_splash(self):
        """Draw splash screen"""
        self.screen.blit(self.splash_image, (0, 0))
        pygame.display.flip()
    
    def draw_insert_cart(self):
        """Draw insert cart screen"""
        self.screen.blit(self.insert_cart_image, (0, 0))
        pygame.display.flip()
    
    def draw_game_logo(self):
        """Draw game logo screen"""
        if not self.current_game or not self.usb_path:
            return
        
        logo_path = self.usb_path / self.current_game.get('logo', 'logo.png')
        
        if logo_path.exists():
            logo = self.load_image(logo_path)
            self.screen.blit(logo, (0, 0))
        else:
            # Draw title text if no logo - use theme colors
            self.screen.fill(self.theme['bg_dark'])
            title = self.current_game.get('title', 'Unknown Game')
            text_surf = self.font_large.render(title, True, self.theme['accent'])
            text_rect = text_surf.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2))
            self.screen.blit(text_surf, text_rect)
        
        pygame.display.flip()
    
    def hex_to_rgb(self, hex_color):
        """Convert hex color string to RGB tuple"""
        try:
            hex_color = hex_color.lstrip('#')
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        except:
            return (0, 0, 0)  # Default to black on error

    def draw_stat_popup(self, dt=0.016):
        if not self.game_engine:
            return

        now = time.time()

        # Promote next queued popup if none active
        pending = getattr(self.game_engine, 'pending_stat_popups', None)
        if self._active_stat_popup is None and pending:
            text, positive = pending.pop(0)
            cfg = getattr(self, 'stat_popup_cfg', {}) or {}
            self._active_stat_popup = {
                'text': text,
                'positive': bool(positive),
                'start': now,
                'duration': max(100, int(cfg.get('duration_ms', 900))),
                'move': int(cfg.get('move_px', 26)),
                'font_size': max(10, int(cfg.get('font_size', 24))),
                'pos_color': cfg.get('positive_color', '#86efac'),
                'neg_color': cfg.get('negative_color', '#fca5a5'),
            }

        p = self._active_stat_popup
        if not p:
            return

        elapsed_ms = (now - p['start']) * 1000.0
        t = elapsed_ms / float(p['duration'])
        if t >= 1.0:
            self._active_stat_popup = None
            return

        # ease-out
        t_eased = 1 - (1 - t) * (1 - t)
        alpha = max(0, min(255, int(255 * (1 - t))))
        move = p['move'] * t_eased
        dy = -move if p['positive'] else move

        color_hex = p['pos_color'] if p['positive'] else p['neg_color']
        rgb = self.hex_to_rgb(color_hex)
        font = pygame.font.Font(None, p['font_size'])
        surf = font.render(p['text'], True, rgb)
        surf = surf.convert_alpha()
        surf.set_alpha(alpha)

        cx = IMAGE_AREA_X + (IMAGE_AREA_WIDTH // 2)
        cy = IMAGE_AREA_Y + (IMAGE_AREA_HEIGHT // 2)
        rect = surf.get_rect(center=(cx, int(cy + dy)))
        self.screen.blit(surf, rect)
    
    def draw_special_page(self, page, dt=0.016):
        """Draw special story page (Prologue/Epilogue/Special Section)
        
        Full-screen background with centered text box and scrolling text.
        """
        # Get padding settings (defaults if not specified)
        padding = page.get('special_padding', {})
        pad_top = padding.get('top', 100)
        pad_bottom = padding.get('bottom', 150)
        pad_left = padding.get('left', 150)
        pad_right = padding.get('right', 150)
        
        # Get "Press button" Y position
        continue_y = page.get('continue_y', 680)
        
        # Fill background
        self.screen.fill((0, 0, 0))
        
        # Draw full-screen background image WITH CACHING
        bg_filename = None
        cache_key = None
        
        try:
            if self.usb_path:
                # Get current page ID for auto-loading
                current_page_id = self.game_engine.current_page if self.game_engine else None
                
                # Initialize cache if needed
                if not hasattr(self, 'special_bg_cache'):
                    self.special_bg_cache = {}
                    self.special_bg_current_page = None
                
                # Determine background filename
                bg_filename = page.get('special_bg') or page.get('image')
                
                # If no custom background specified, auto-load theme background
                if not bg_filename:
                    # Get current theme
                    theme_value = self.current_game.get('theme', 'fantasy')
                    theme_name = theme_value if isinstance(theme_value, str) else theme_value.get('preset', 'fantasy') if isinstance(theme_value, dict) else 'fantasy'
                    
                    # Try theme-specific background first: steampunk_sp_bg.jpg
                    theme_bg = f"{theme_name}_sp_bg.jpg"
                    
                    # Check if theme background exists in console_assets/images
                    theme_bg_path = ASSETS_IMAGES_DIR / theme_bg
                    if theme_bg_path.exists():
                        bg_filename = theme_bg
                    elif current_page_id:
                        # Fallback: page_id.jpg (e.g., prologue.jpg, epilogue.jpg)
                        bg_filename = f"{current_page_id}.jpg"
                
                if bg_filename:
                    # Try video for special page first
                    stem = Path(bg_filename).stem
                    video_used = False
                    if self.usb_path:
                        video_path = self.usb_path / "images" / "special_pages" / f"{stem}.mp4"
                        if video_path.exists():
                            if self.current_video_page != f"special_{current_page_id}":
                                self.load_video(video_path, f"special_{current_page_id}")
                            frame = self.get_video_frame()
                            if frame:
                                vw, vh = frame.get_size()
                                target_w, target_h = SCREEN_WIDTH, SCREEN_HEIGHT
                                scale = max(target_w / vw, target_h / vh)
                                new_w, new_h = int(vw * scale), int(vh * scale)
                                scaled = pygame.transform.scale(frame, (new_w, new_h))
                                crop_x = (new_w - target_w) // 2
                                crop_y = (new_h - target_h) // 2
                                self.screen.blit(scaled, (0, 0), pygame.Rect(crop_x, crop_y, target_w, target_h))
                                video_used = True
                            else:
                                print("[WARNING] Special video frame failed, falling back to image")
                    if not video_used:
                        cache_key = f"special_{current_page_id}_{bg_filename}"
                        # Only LOAD image if page changed
                        if current_page_id != self.special_bg_current_page:
                            self.special_bg_current_page = current_page_id
                            print(f"Â°Ã…Â¸Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ Auto-loading special page background: {bg_filename}")
                            
                            if cache_key not in self.special_bg_cache:
                                theme_bg_path = ASSETS_IMAGES_DIR / bg_filename
                                if theme_bg_path.exists():
                                    print(f"[RENDER] Loading theme special background: {theme_bg_path}")
                                    bg_path = theme_bg_path
                                else:
                                    bg_path = self.usb_path / "images" / "special_pages" / bg_filename
                                    print(f"ÃƒÂ°Ã…Â¸Ã¢â‚¬â€œÃ‚Â¼ÃƒÂ¯Ã‚Â¸Ã‚Â Loading custom special background: {bg_path}")
                                if bg_path.exists():
                                    bg_img = self.load_asset_image(bg_path, mode="cover")
                                    if bg_img is not None:
                                        bg_img = pygame.transform.scale(bg_img, (SCREEN_WIDTH, SCREEN_HEIGHT))
                                        self.special_bg_cache[cache_key] = bg_img
                                        print(f"[OK] Special page background loaded and cached: {bg_filename}")
                                else:
                                    print(f"[WARNING]Â  Special page background not found: {bg_path}")
                                    self.special_bg_cache[cache_key] = None
                        if cache_key in self.special_bg_cache:
                            cached_img = self.special_bg_cache[cache_key]
                            if cached_img is not None:
                                self.screen.blit(cached_img, (0, 0))
        except Exception as e:
            print(f"[ERROR] Special page background error: {e}")
        
        # Calculate text box dimensions
        text_x = pad_left
        text_y = pad_top
        text_width = SCREEN_WIDTH - pad_left - pad_right
        text_height = SCREEN_HEIGHT - pad_top - pad_bottom
        
        # NO text box background or border for special pages
        # Text renders directly on the full-screen background image
        
        # Render text with scrolling
        try:
            text = page.get('text', '')
            if text:
                # Use main font
                font = self.get_font('main')
                text_color = self.get_font_color('main')
                
                # Word wrap text to fit in text box
                # Handle paragraph breaks (\n\n) by adding empty lines
                paragraphs = text.split('\n\n')
                lines = []
                max_text_width = text_width - 40  # Padding inside text box
                
                print(f"[SPECIAL] Found {len(paragraphs)} paragraphs in special page text")
                
                for para_idx, paragraph in enumerate(paragraphs):
                    # Word wrap each paragraph
                    words = paragraph.split(' ')
                    current_line = ""
                    
                    for word in words:
                        test_line = current_line + word + " "
                        test_surf = font.render(test_line, True, text_color)
                        if test_surf.get_width() > max_text_width:
                            if current_line:
                                lines.append(current_line.strip())
                                current_line = word + " "
                            else:
                                lines.append(word)
                                current_line = ""
                        else:
                            current_line = test_line
                    
                    if current_line:
                        lines.append(current_line.strip())
                    
                    # Add empty line between paragraphs (except after last paragraph)
                    if para_idx < len(paragraphs) - 1:
                        lines.append('')  # Empty line for paragraph spacing
                        print(f"[SPECIAL] Added empty line after paragraph {para_idx + 1}")
                
                # Calculate scrolling
                line_height = 24
                max_visible_lines = int(text_height / line_height) - 2
                
                # Initialize scroll state if needed
                if not hasattr(self, 'special_text_lines') or self.special_text_lines != lines:
                    self.special_text_lines = lines
                    self.special_scroll_offset = 0
                    self.special_scroll_timer = 0
                    self.special_scroll_max = max(0, len(lines) - max_visible_lines)
                
                # Auto-scroll if text overflows
                if self.special_scroll_max > 0:
                    self.special_scroll_timer += dt
                    if self.special_scroll_timer >= 2.0:  # Wait 2 seconds before scrolling
                        scroll_speed = 1.5
                        scroll_progress = (self.special_scroll_timer - 2.0) / scroll_speed
                        new_offset = min(self.special_scroll_max, int(scroll_progress))
                        self.special_scroll_offset = new_offset
                        
                        # Reset when reached bottom
                        if self.special_scroll_offset >= self.special_scroll_max:
                            if self.special_scroll_timer >= (2.0 + (self.special_scroll_max * scroll_speed) + 3.0):
                                self.special_scroll_timer = 0
                                self.special_scroll_offset = 0
                
                # Draw visible lines with clipping
                clip_rect = pygame.Rect(text_x, text_y, text_width, text_height)
                self.screen.set_clip(clip_rect)
                
                current_y = text_y + 20
                visible_lines = lines[self.special_scroll_offset:self.special_scroll_offset + max_visible_lines]
                
                for line in visible_lines:
                    if current_y + line_height <= text_y + text_height:
                        # Render line (even if empty - for paragraph spacing)
                        if line:  # Only render if not empty
                            line_surf = font.render(line, True, text_color)
                            self.screen.blit(line_surf, (text_x + 20, current_y))
                        # Always advance Y position (including for empty lines)
                        current_y += line_height
                
                self.screen.set_clip(None)
        except Exception as e:
            print(f"[ERROR] Special page text error: {e}")
        
        # Draw "Press button to continue" text
        try:
            continue_text = page.get('continue_text') or "Press any button to continue..."

            # Continue Text styling: optional per-page overrides, otherwise inherit theme defaults
            default_size = self.get_font_size('choices')
            try:
                size_override = int(page.get('continue_text_size')) if page.get('continue_text_size') is not None else None
            except Exception:
                size_override = None
            cont_size = size_override if (isinstance(size_override, int) and 8 <= size_override <= 80) else default_size

            ttf_path = self.resolve_font_path()
            try:
                continue_font = pygame.font.Font(str(ttf_path), cont_size) if ttf_path else pygame.font.Font(None, cont_size)
            except Exception:
                continue_font = pygame.font.Font(None, cont_size)

            cont_color_val = page.get('continue_text_color')
            continue_color = self.hex_to_rgb(cont_color_val) if isinstance(cont_color_val, str) else self.get_font_color('choices')
            continue_surf = continue_font.render(continue_text, True, continue_color)
            continue_x = (SCREEN_WIDTH - continue_surf.get_width()) // 2
            self.screen.blit(continue_surf, (continue_x, continue_y))
        except Exception as e:
            print(f"[ERROR] Special page continue text error: {e}")
    
    def load_video(self, video_path, page_id):
        """Load video for Ken Burns animation playback"""
        try:
            # Release previous video if exists
            if self.video_capture is not None:
                self.video_capture.release()
                self.video_capture = None
            
            # Load new video
            print(f"[VIDEO] Loading animation: {video_path}")
            cap = cv2.VideoCapture(str(video_path))
            
            if not cap.isOpened():
                print(f"[WARNING] Failed to open video: {video_path}")
                return False
            
            self.video_capture = cap
            self.current_video_page = page_id
            print(f"[VIDEO] Animation loaded successfully")
            return True
            
        except Exception as e:
            print(f"[ERROR] Video loading error: {e}")
            if self.video_capture is not None:
                self.video_capture.release()
                self.video_capture = None
            return False
    
    def get_video_frame(self):
        """Get current video frame as pygame surface"""
        if self.video_capture is None:
            return None
        
        try:
            ret, frame = self.video_capture.read()
            
            if not ret:
                # Video ended - hold on last frame (don't loop)
                # Get last frame by seeking to end-1
                total_frames = int(self.video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
                if total_frames > 1:
                    self.video_capture.set(cv2.CAP_PROP_POS_FRAMES, total_frames - 1)
                    ret, frame = self.video_capture.read()
                
                if not ret:
                    return None
            
            # Convert BGR (OpenCV) to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Rotate 90 degrees COUNTER-CLOCKWISE (landscape 1280x720 -> portrait 720x1280)
            frame_rgb = cv2.rotate(frame_rgb, cv2.ROTATE_90_COUNTERCLOCKWISE)
            
            # Convert to pygame surface WITHOUT swapaxes
            frame_surface = pygame.surfarray.make_surface(frame_rgb)
            
            return frame_surface
            
        except Exception as e:
            print(f"[ERROR] Video frame error: {e}")
            return None
    
    def release_video(self):
        """Release current video capture"""
        if self.video_capture is not None:
            self.video_capture.release()
            self.video_capture = None
            self.current_video_page = None
            print(f"[VIDEO] Released video capture")
    
    def draw_game_page(self, dt=0.016):
        """Draw current game page WITH THEMED BEZELS
        
        Args:
            dt: Delta time in seconds (default 0.016 = ~60fps)
        """
        if not self.game_engine:
            return
        
        page = self.game_engine.get_current_page()
        
        current_page_id = self.game_engine.current_page
        
        # Handle audio for ALL pages (special and normal) when page changes
        if current_page_id != self.last_page_id:
            # Cancel any pending audio timer from previous page
            if hasattr(self, '_audio_timer') and self._audio_timer:
                self._audio_timer.cancel()
            
            # Play audio after 0.5 second delay
            self._audio_timer = Timer(0.5, self.play_page_audio, args=[page])
            self._audio_timer.start()
            print(f"[TIMER] Audio scheduled to play in 0.5 seconds...")
            
            self.last_page_id = current_page_id
        
        # Check if this is a special page (Prologue/Epilogue/Story Section)
        if page.get('special_page'):
            self.draw_special_page(page, dt)
            return
        
        # Always fill background
        self.screen.fill(self.theme.get('bg_dark', (28, 28, 28)))
        
        # Draw each section - failures are caught but don't stop rendering
        
        # Get current page ID for auto-loading
        
        try:
            # Draw page image/video
            # Priority: 1. Video animation, 2. Static image (pre-rendered cover)
            # Auto-load image if not specified (like audio does)
            image_file = page.get('image')
            
            # Auto-load if image is None, empty, or missing
            if not image_file and current_page_id:
                # Auto-load: page_id.jpg
                image_file = f"{current_page_id}.jpg"
            
            if self.usb_path and image_file:
                # Extract filename without extension for video check
                image_name = Path(image_file).stem
                
                # Check for video animation FIRST (highest priority)
                video_path = self.usb_path / "images" / "animations" / f"{image_name}.mp4"
                
                if video_path.exists():
                    # VIDEO FOUND - Use pre-rendered animation
                    if current_page_id != self.current_video_page:
                        if self.load_video(video_path, current_page_id):
                            print(f"[VIDEO] Using animation for {current_page_id}")
                    
                    video_frame = self.get_video_frame()
                    if video_frame:
                        content_rect = pygame.Rect(IMAGE_AREA_X, IMAGE_AREA_Y, IMAGE_AREA_WIDTH, IMAGE_AREA_HEIGHT)
                        
                        # Scale video to fill image area while preserving aspect ratio
                        video_width, video_height = video_frame.get_size()
                        target_width, target_height = content_rect.width, content_rect.height
                        scale_x = target_width / video_width
                        scale_y = target_height / video_height
                        scale = max(scale_x, scale_y)
                        new_width = int(video_width * scale)
                        new_height = int(video_height * scale)
                        scaled_frame = pygame.transform.scale(video_frame, (new_width, new_height))
                        crop_x = (new_width - target_width) // 2
                        crop_y = (new_height - target_height) // 2
                        crop_rect = pygame.Rect(crop_x, crop_y, target_width, target_height)
                        self.screen.blit(scaled_frame, content_rect, crop_rect)
                    else:
                        print(f"[WARNING] Video frame failed, using static image")
                        video_path = None  # Force fallback
                
                # No video or video failed - use STATIC IMAGE
                if not video_path or not video_path.exists():
                    if self.video_capture is not None:
                        self.release_video()
                    
                    page_img_path = self.usb_path / "images" / image_file
                    
                    if page_img_path.exists():
                        img = self.load_asset_image(page_img_path, mode="cover")
                        if img is not None:
                            content_rect = pygame.Rect(IMAGE_AREA_X, IMAGE_AREA_Y, IMAGE_AREA_WIDTH, IMAGE_AREA_HEIGHT)
                            self.blit_cover(self.screen, img, content_rect)
        except Exception as e:
            print(f"[ERROR] Error drawing image/video: {e}")
            import traceback
            traceback.print_exc()

        # Stat popup overlay (over the image/video area)
        self.draw_stat_popup(dt)
        
        try:
            # Draw bezel
            if self.current_game and 'theme' in self.current_game:
                theme_value = self.current_game.get('theme', 'fantasy')
                theme_name = theme_value if isinstance(theme_value, str) else theme_value.get('preset', 'fantasy') if isinstance(theme_value, dict) else 'fantasy'
            else:
                theme_name = 'fantasy'
            # Draw themed bezel
            self.draw_themed_bottom_bezel(theme_name)
        except Exception as e:
            print(f"[ERROR] Error drawing bezel: {e}")
            import traceback
            traceback.print_exc()
        
        try:
            # Get positioning from JSON - all as % from bottom
            choices_y_percent_bottom = self.get_font_position('choices')
            main_y_percent_bottom = self.get_font_position('main')
            stats_y_percent_bottom = self.get_font_position('stats')
            items_y_percent_bottom = self.get_font_position('items')
            separator_y_percent_bottom = self.get_font_position('separator')
            
            # Get padding settings - GAME BUILDER COMPATIBILITY
            main_text_padding_percent = self.get_main_text_padding()
            main_text_top_padding_percent = self.get_main_text_top_padding()
            text_area_rows = self.get_text_area_rows()
            
            # Convert to pixel positions (percent from bottom => top = 100 - val)
            DYNAMIC_CHOICES_Y = int(SCREEN_HEIGHT * ((100.0 - choices_y_percent_bottom) / 100.0))
            DYNAMIC_MAIN_Y_BASE = int(SCREEN_HEIGHT * ((100.0 - main_y_percent_bottom) / 100.0))
            DYNAMIC_MAIN_Y = DYNAMIC_MAIN_Y_BASE + int(SCREEN_HEIGHT * (main_text_top_padding_percent / 100.0))
            
            # Bottom elements: convert % from bottom to pixels-from-top
            DYNAMIC_STATS_Y = SCREEN_HEIGHT - int(SCREEN_HEIGHT * (stats_y_percent_bottom / 100.0))
            DYNAMIC_ITEMS_Y = SCREEN_HEIGHT - int(SCREEN_HEIGHT * (items_y_percent_bottom / 100.0))
            DYNAMIC_SEPARATOR_Y = SCREEN_HEIGHT - int(SCREEN_HEIGHT * (separator_y_percent_bottom / 100.0))
            
            # Calculate text area with padding - GAME BUILDER COMPATIBILITY
            padding_px = int(SCREEN_WIDTH * (main_text_padding_percent / 100.0))
            DYNAMIC_TEXT_AREA_X = padding_px
            DYNAMIC_TEXT_AREA_WIDTH = SCREEN_WIDTH - (padding_px * 2)
            
            # Calculate height based on rows (font size Ã— line height Ã— rows)
            main_font_size = self.get_font_size('main')
            line_height_multiplier = 1.35  # Standard line height
            calculated_height = int(main_font_size * line_height_multiplier * text_area_rows)
            
            # Use calculated height but limit by available space
            available_height = DYNAMIC_STATS_Y - DYNAMIC_MAIN_Y - 20
            DYNAMIC_TEXT_AREA_HEIGHT = min(calculated_height, available_height)
            
            #             # Draw text with auto-scrolling for overflow
            # Draw text with auto-scrolling for overflow
            text = page.get('text', '')
            main_font = self.get_font('main')
            main_color = self.get_font_color('main')
            
            if 'text_color' in page:
                main_color = self.hex_to_rgb(page.get('text_color'))
            
            # Word wrap to create all lines - conservative to prevent overflow
            # Handle paragraph breaks (\n\n) by adding empty lines
            paragraphs = text.split('\n\n')
            lines = []
            
            print(f"[TEXT] Found {len(paragraphs)} paragraphs in text")
            
            # Use minimal margin (60px total = 30px each side) for maximum text width
            max_text_width = DYNAMIC_TEXT_AREA_WIDTH - 40
            
            for para_idx, paragraph in enumerate(paragraphs):
                # Word wrap each paragraph
                words = paragraph.split()
                current_line = []
                
                for word in words:
                    test_line = ' '.join(current_line + [word])
                    text_surf = main_font.render(test_line, True, main_color)
                    if text_surf.get_width() > max_text_width:
                        if current_line:
                            lines.append(' '.join(current_line))
                        current_line = [word]
                    else:
                        current_line.append(word)
                
                if current_line:
                    lines.append(' '.join(current_line))
                
                # Add empty line between paragraphs (except after last paragraph)
                if para_idx < len(paragraphs) - 1:
                    lines.append('')  # Empty line for paragraph spacing
                    print(f"[TEXT] Added empty line after paragraph {para_idx + 1}")
            
            # DEBUG: Print line info ONLY when text changes (new page)
            current_text_hash = hash(text)
            if not hasattr(self, '_last_text_hash') or self._last_text_hash != current_text_hash:
                print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Text rendering (NEW PAGE):")
                print(f"   Total lines wrapped: {len(lines)}")
                print(f"   Max text width: {max_text_width}px")
                if len(lines) > 0:
                    print(f"   First line: '{lines[0][:60]}'")
                    if len(lines) > 1:
                        print(f"   Last line: '{lines[-1][:60]}'")
                self._last_text_hash = current_text_hash
            
            # Calculate how many lines fit in the visible area
            line_height = 22  # Reduced from 24 to fit more lines
            max_visible_lines = int(DYNAMIC_TEXT_AREA_HEIGHT / line_height) - 2  # Extra safety margin
            
            
            
            # Store all lines for scrolling
            if lines != getattr(self, 'text_all_lines', []):
                # New text - reset scroll
                self.text_all_lines = lines
                self.text_scroll_offset = 0
                self.text_scroll_timer = 0
                self.text_scroll_max = max(0, len(lines) - max_visible_lines)
                
                # Reset debug flag for new page
                if hasattr(self, '_debug_text_area_printed'):
                    delattr(self, '_debug_text_area_printed')
            
            # Auto-scroll if text overflows
            if self.text_scroll_max > 0:
                self.text_scroll_timer += dt  # Time-based scrolling (FPS-independent)
                if self.text_scroll_timer >= 2.0:  # Wait 2 seconds before scrolling
                    # Scroll one line every 1.5 seconds
                    scroll_speed = 1.5
                    scroll_progress = (self.text_scroll_timer - 2.0) / scroll_speed
                    new_offset = min(self.text_scroll_max, int(scroll_progress))
                    
                    self.text_scroll_offset = new_offset
                    
                    # Reset when reached bottom
                    if self.text_scroll_offset >= self.text_scroll_max:
                        # Pause at bottom for 3 seconds, then reset
                        if self.text_scroll_timer >= (2.0 + (self.text_scroll_max * scroll_speed) + 3.0):
                            self.text_scroll_timer = 0
                            self.text_scroll_offset = 0
            
            # Draw visible lines with scroll offset - CLIP TO TEXT AREA!
            text_y = DYNAMIC_MAIN_Y + 10
            visible_lines = lines[self.text_scroll_offset:self.text_scroll_offset + max_visible_lines]
            
            # Set clipping rectangle to prevent text bleeding over stats
            clip_rect = pygame.Rect(DYNAMIC_TEXT_AREA_X, DYNAMIC_MAIN_Y, DYNAMIC_TEXT_AREA_WIDTH, DYNAMIC_TEXT_AREA_HEIGHT)
            self.screen.set_clip(clip_rect)
            
            for line in visible_lines:
                # Only draw if we're still within the text area
                if text_y + line_height <= DYNAMIC_MAIN_Y + DYNAMIC_TEXT_AREA_HEIGHT:
                    # Render line (even if empty - for paragraph spacing)
                    if line:  # Only render if not empty
                        text_surf = main_font.render(line, True, main_color)
                        self.screen.blit(text_surf, (DYNAMIC_TEXT_AREA_X + 20, text_y))
                    # Always advance Y position (including for empty lines)
                    text_y += line_height
                else:
                    break  # Stop drawing - we've reached the bottom
            
            # Clear clipping rectangle
            self.screen.set_clip(None)
        except Exception as e:
            print(f"[ERROR] Failed to draw main text: {e}")
            import traceback
            traceback.print_exc()
        
        try:
            # Draw stats
            stats_font = self.get_font('stats')
            stats_color = self.get_font_color('stats')
            
            hp = self.game_engine.get_stat('health')
            str_total = self.game_engine.get_total_stat('strength')
            luck_total = self.game_engine.get_total_stat('luck')
            stats_text = f"HP: {hp} | STR: {str_total} | LCK: {luck_total}"
            stats_surf = stats_font.render(stats_text, True, stats_color)
            
            # Position by bottom edge (like CSS) to match preview
            stats_y = DYNAMIC_STATS_Y - stats_surf.get_height()
            stats_x = (SCREEN_WIDTH - stats_surf.get_width()) // 2
            self.screen.blit(stats_surf, (stats_x, stats_y))
        except Exception as e:
            print(f"[ERROR] Failed to draw stats: {e}")
        
        try:
            # Draw separator (centered on screen)
            sep_color = self.get_font_color('separator')
            line_y = DYNAMIC_SEPARATOR_Y
            pygame.draw.line(self.screen, sep_color, (padding_px, line_y), (SCREEN_WIDTH - padding_px, line_y), 2)
        except Exception as e:
            print(f"[ERROR] Failed to draw separator: {e}")
        
        try:
            # Draw inventory
            items_font = self.get_font('items')
            items_color = self.get_font_color('items')
            
            inventory = self.game_engine.get_inventory_items()
            if inventory:
                parts = ["Items:"]
                for item in inventory:
                    # Use display_name if available, fallback to name
                    item_name = item.get('display_name', item.get('name', 'Item'))
                    parts.append(f"[{item_name}]")
                inv_text = " ".join(parts)
            else:
                inv_text = "Items: (none)"
            
            inv_surf = items_font.render(inv_text, True, items_color)
            inv_x = (SCREEN_WIDTH - inv_surf.get_width()) // 2
            # Position by bottom edge (like CSS) to match preview
            inv_y = DYNAMIC_ITEMS_Y - inv_surf.get_height()
            self.screen.blit(inv_surf, (inv_x, inv_y))
        except Exception as e:
            print(f"[ERROR] Failed to draw items: {e}")
            import traceback
            traceback.print_exc()
        
        try:
            # Draw choices
            choices_font = self.get_font('choices')
            choices_color = self.get_font_color('choices')
            choices = self.game_engine.get_available_choices()
            
            # Use 1.25 line height to match preview (CSS line-height multiplies font-size, not rendered height)
            font_size = self.get_font_size('choices')
            choice_line_height = int(font_size * 1.25)
            print(f"[CHOICES] Font size: {font_size}px, Line height (1.25x): {choice_line_height}px")
            if choices:
                choice_y = DYNAMIC_CHOICES_Y
                for i, choice in enumerate(choices[:3]):
                    button_label = f"[{i+1}]"
                    choice_text = choice.get('text', '')
                    display_text = f"{button_label} {choice_text}"
                    text_surf = choices_font.render(display_text, True, choices_color)
                    choice_x = (SCREEN_WIDTH - text_surf.get_width()) // 2
                    self.screen.blit(text_surf, (choice_x, choice_y + i * choice_line_height))
        except Exception as e:
            print(f"[ERROR] Failed to draw choices: {e}")
        
        try:
            # Draw action panel if page has an action (ready state)
            page = self.game_engine.get_current_page()
            action = page.get('action', {})
            
            if action:
                # Get action colors
                bg_color = self.action_colors.get('background', (28, 28, 28))
                border_color = self.action_colors.get('border', (217, 119, 87))
                
                # Get action panel Y position (% from top, default 30%)
                action_y_percent = self.current_game.get('action_position_y', DEFAULT_ACTION_POSITION_Y)
                panel_top_y = int(SCREEN_HEIGHT * (action_y_percent / 100.0))

                # Get action panel height (pixels, default 180px)
                panel_height = self.current_game.get('action_panel_height', DEFAULT_ACTION_PANEL_HEIGHT)

                # Get action element Y positions (% from bottom)
                ap = self.current_game.get('action_positions_percent', {}) or {}

                def action_pct_top_in_panel(key, legacy_key, fallback_bottom_pct):
                    raw = ap.get(key)
                    if raw is None:
                        raw = self.current_game.get(legacy_key)
                    try:
                        val = float(raw)
                    except Exception:
                        val = None
                    if val is None:
                        bottom_pct = fallback_bottom_pct
                    elif val > 100:
                        # legacy pixels from top -> convert to % from top
                        return max(0.0, min(100.0, (val / SCREEN_HEIGHT) * 100.0))
                    else:
                        bottom_pct = max(0.0, min(100.0, val))
                    return 100.0 - bottom_pct

                action_text_y_percent = action_pct_top_in_panel('text', 'action_text_y', 90.0)
                action_dice_y_percent = action_pct_top_in_panel('dice', 'action_dice_y', 82.0)
                
                # Get text styling
                text_size = self.current_game.get('action_text_size', DEFAULT_ACTION_TEXT_SIZE)
                text_color_hex = self.current_game.get('action_text_color', '#FFFFFF')
                text_color = self.hex_to_rgb(text_color_hex)
                dice_size = self.get_action_dice_size()
                
                # Create action font
                action_font = pygame.font.Font(None, text_size)
                
                # Calculate absolute Y positions
                center_x = SCREEN_WIDTH // 2
                text_y = int(SCREEN_HEIGHT * (action_text_y_percent / 100.0))
                dice_y = int(SCREEN_HEIGHT * (action_dice_y_percent / 100.0))
                
                # Define panel rect
                panel_rect = pygame.Rect(0, panel_top_y, SCREEN_WIDTH, panel_height)
                
                # Draw action bezel if present, otherwise draw panel
                if self.action_bezel:
                    self.screen.blit(self.action_bezel, (0, 0))
                else:
                    pygame.draw.rect(self.screen, bg_color, panel_rect)
                    pygame.draw.rect(self.screen, border_color, panel_rect, 3)
                
                # Show prompt text or default
                action_type = action.get('type', 'dice')
                
                if action_type == 'dice':
                    target = action.get('target', 0)
                    prompt = action.get('prompt', f"Roll {target}+ For Success")
                    if not prompt or prompt == "":
                        prompt = f"Roll {target}+ For Success"
                elif action_type == 'combat':
                    prompt = "Press Action to Fight"
                
                prompt_surf = action_font.render(prompt, True, text_color)
                prompt_rect = prompt_surf.get_rect(center=(center_x, text_y))
                self.screen.blit(prompt_surf, prompt_rect)
                
                # Draw dice in ready state (showing "?" or neutral)
                # For dice rolls, show the dice type (d6, d20, etc)
                if action_type == 'dice':
                    dice_type = action.get('dice', 20)
                    # Show dice with "?" to indicate ready state
                    self.draw_d20_dice(self.screen, center_x, dice_y, "?", dice_size)
                elif action_type == 'combat':
                    # Show d20 with "?" for combat
                    self.draw_d20_dice(self.screen, center_x, dice_y, "?", dice_size)
        except:
            pass
        
        # ALWAYS FLIP THE DISPLAY
        pygame.display.flip()
    
    def play_page_audio(self, page):
        """Play speech and sound effects using aplay (pure ALSA, no SDL)"""
        if not hasattr(self, 'audio_available') or not self.audio_available:
            return
        
        if not self.usb_path:
            return
        
        # Get current page ID for debugging
        page_id = self.game_engine.current_page if self.game_engine else "unknown"
        print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â½Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµ Page '{page_id}' - Checking for audio...")
        
        # REDUCE LED PWM activity during audio to minimize interference
        # Stop any animated effects and use static color
        if hasattr(self, 'leds'):
            self.leds.stop_effect()  # Stop animations
            self.leds.set_color('white', 0.3)  # Static dim white
        
        # Stop previous audio IMMEDIATELY
        if hasattr(self, '_audio_process') and self._audio_process:
            try:
                print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂºÃ‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œ Stopping previous audio (PID: {self._audio_process.pid})...")
                # Use kill() for immediate termination, not terminate()
                self._audio_process.kill()
                # Wait for process to actually die (max 0.5 seconds)
                try:
                    self._audio_process.wait(timeout=0.5)
                    print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃ‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Previous audio stopped")
                except:
                    print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Ã†â€™Ãƒâ€šÃ‚Â¯Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Audio process didn't stop cleanly")
                    pass
                self._audio_process = None
            except:
                pass
        
        # Stop previous SOUND EFFECT audio IMMEDIATELY
        if hasattr(self, '_sound_process') and self._sound_process:
            try:
                print(f"Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ Stopping previous sound effect (PID: {self._sound_process.pid})...")
                self._sound_process.kill()
                try:
                    self._sound_process.wait(timeout=0.5)
                    print(f"[OK] Previous sound effect stopped")
                except:
                    print(f"[WARNING]Ãƒâ€šÃ‚Â Sound effect process didn't stop cleanly")
                    pass
                self._sound_process = None
            except:
                pass
        
        # Get audio files with auto-loading support
        speech_file = page.get('speech_file', '')
        sound_file = page.get('sound_file', '')
        
        # Auto-load speech file: {page_id}.wav if not specified
        if not speech_file:
            speech_file = f"{page_id}.wav"
        
        # Auto-load sound file: {page_id}_sfx.wav if not specified
        if not sound_file:
            sound_file = f"{page_id}_sfx.wav"
        
        print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ¢â‚¬Å¡Ãƒâ€šÃ‚Â Page '{page_id}' audio files:")
        print(f"   - speech_file: '{speech_file}'")
        print(f"   - sound_file: '{sound_file}'")
        
        # Play speech - USE USB AUDIO (auto-detected) to avoid PWM interference!
        # USB audio is completely separate from NeoPixel GPIO/PWM hardware
        if speech_file:
            speech_path = self.usb_path / "audio" / speech_file
            print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ¢â‚¬Å¡Ãƒâ€šÃ‚Â DEBUG: Looking for audio file: {speech_path}")
            print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ¢â‚¬Å¡Ãƒâ€šÃ‚Â DEBUG: File exists? {speech_path.exists()}")
            if speech_path.exists():
                try:
                    # Use USB audio device (or default if not found)
                    device = self.audio_device if hasattr(self, 'audio_device') and self.audio_device else "default"
                    if device == "default":
                        cmd = ['aplay', str(speech_path)]
                    else:
                        cmd = ['aplay', '-D', device, str(speech_path)]
                    
                    print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ¢â‚¬Å¡Ãƒâ€šÃ‚Â DEBUG: Running command: {' '.join(cmd)}")
                    
                    self._audio_process = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,  # Capture output for debugging
                        stderr=subprocess.PIPE
                    )
                    print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ¢â‚¬Â¦Ãƒâ€šÃ‚Â  Playing speech: {speech_file} Ã†â€™Ãƒâ€šÃ‚Â¢Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ USB audio ({device})")
                    
                    # Check for immediate errors (non-blocking)
                    import select
                    import time
                    time.sleep(0.1)  # Slightly longer wait
                    if self._audio_process.poll() is not None:
                        # Process died - show error
                        stdout = self._audio_process.stdout.read().decode()
                        stderr = self._audio_process.stderr.read().decode()
                        print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃ¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ aplay output: {stdout}")
                        print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃ¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ aplay error: {stderr}")
                    else:
                        print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃ‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Audio process running (PID: {self._audio_process.pid})")
                    
                except Exception as e:
                    print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃ¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Audio error: {e}")
                    import traceback
                    traceback.print_exc()
        
        # Play sound effect - USE USB AUDIO (auto-detected)
        if sound_file:
            sound_path = self.usb_path / "audio" / sound_file
            if sound_path.exists():
                try:
                    # Use USB audio device (or default if not found)
                    device = self.audio_device if hasattr(self, 'audio_device') and self.audio_device else "default"
                    if device == "default":
                        cmd = ['aplay', str(sound_path)]
                    else:
                        cmd = ['aplay', '-D', device, str(sound_path)]
                    
                    # Store the sound process so we can kill it on page change
                    self._sound_process = subprocess.Popen(
                        cmd,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.PIPE
                    )
                    print(f"Ã†â€™Ãƒâ€šÃ‚Â°Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃ¢â‚¬Â¦Ãƒâ€šÃ‚Â  Playing sound: {sound_file} Ã†â€™Ãƒâ€šÃ‚Â¢Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ USB audio ({device})")
                except Exception as e:
                    print(f"Ã†â€™Ãƒâ€šÃ‚Â¢Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃ¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Audio error: {e}")

    
    def draw_themed_bottom_bezel(self, theme_name):
        """Draw themed bottom bezel with simple decorations"""
        x, y = BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y
        w, h = BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT
        
        if theme_name == 'fantasy':
            # Brown base
            pygame.draw.rect(self.screen, (60, 50, 40), (x, y, w, h))
            # Border
            pygame.draw.rect(self.screen, self.theme['accent'], (x, y, w, h), 4)
            # Corner circles (simple decoration)
            corner_r = 15
            pygame.draw.circle(self.screen, self.theme['accent'], (x+corner_r, y+corner_r), corner_r)
            pygame.draw.circle(self.screen, (60, 50, 40), (x+corner_r, y+corner_r), corner_r-4)
            pygame.draw.circle(self.screen, self.theme['accent'], (x+w-corner_r, y+corner_r), corner_r)
            pygame.draw.circle(self.screen, (60, 50, 40), (x+w-corner_r, y+corner_r), corner_r-4)
            pygame.draw.circle(self.screen, self.theme['accent'], (x+corner_r, y+h-corner_r), corner_r)
            pygame.draw.circle(self.screen, (60, 50, 40), (x+corner_r, y+h-corner_r), corner_r-4)
            pygame.draw.circle(self.screen, self.theme['accent'], (x+w-corner_r, y+h-corner_r), corner_r)
            pygame.draw.circle(self.screen, (60, 50, 40), (x+w-corner_r, y+h-corner_r), corner_r-4)
            
        elif theme_name == 'scifi':
            # Dark metallic base
            pygame.draw.rect(self.screen, (15, 25, 35), (x, y, w, h))
            # Cyan border
            pygame.draw.rect(self.screen, self.theme['accent'], (x, y, w, h), 3)
            # Corner squares (simple decoration)
            corner_s = 12
            pygame.draw.rect(self.screen, self.theme['accent'], (x+8, y+8, corner_s, corner_s))
            pygame.draw.rect(self.screen, self.theme['accent'], (x+w-8-corner_s, y+8, corner_s, corner_s))
            pygame.draw.rect(self.screen, self.theme['accent'], (x+8, y+h-8-corner_s, corner_s, corner_s))
            pygame.draw.rect(self.screen, self.theme['accent'], (x+w-8-corner_s, y+h-8-corner_s, corner_s, corner_s))
            
        elif theme_name == 'horror':
            # Very dark base
            pygame.draw.rect(self.screen, (12, 8, 8), (x, y, w, h))
            # Dark red border
            pygame.draw.rect(self.screen, self.theme['accent'], (x, y, w, h), 5)
            # Blood drips at top (simple)
            drip_color = self.theme['accent']
            for i in range(6):
                pygame.draw.circle(self.screen, drip_color, (x+100+i*150, y+10), 4)
                pygame.draw.rect(self.screen, drip_color, (x+98+i*150, y+10, 4, 15))
            
        elif theme_name == 'steampunk':
            # Brass base
            pygame.draw.rect(self.screen, (50, 35, 25), (x, y, w, h))
            # Brass border
            pygame.draw.rect(self.screen, self.theme['accent'], (x, y, w, h), 6)
            # Rivet dots (simple decoration)
            rivet_color = (139, 101, 8)
            for i in range(10):
                pygame.draw.circle(self.screen, rivet_color, (x+60+i*80, y+12), 4)
                pygame.draw.circle(self.screen, rivet_color, (x+60+i*80, y+h-12), 4)
            for i in range(3):
                pygame.draw.circle(self.screen, rivet_color, (x+12, y+70+i*70), 4)
                pygame.draw.circle(self.screen, rivet_color, (x+w-12, y+70+i*70), 4)
        else:
            # Default fantasy
            pygame.draw.rect(self.screen, (60, 50, 40), (x, y, w, h))
            pygame.draw.rect(self.screen, self.theme['accent'], (x, y, w, h), 4)

    
    def draw_themed_bottom_bezel(self, theme_name):
        """Draw the appropriate themed bottom bezel"""
        # Draw bezel image (theme preset or game override)
        # Supports:
        #  - Fullscreen bezel (720x1280): blit at 0,0
        #  - Panel bezel (matches bottom panel): blit in panel
        #  - Overlay bezel (taller than panel): align bottom to screen and spill upward (for ornaments w/ alpha)
        try:
            bezel_path = self.resolve_bezel_path()
            if bezel_path and Path(bezel_path).exists():
                bezel_img_native = self.load_asset_image(Path(bezel_path), size=None, mode="stretch")
                if bezel_img_native is not None:
                    iw, ih = bezel_img_native.get_width(), bezel_img_native.get_height()

                    if iw == SCREEN_WIDTH and ih == SCREEN_HEIGHT:
                        # Fullscreen bezel
                        self.screen.blit(bezel_img_native, (0, 0))
                        return

                    if iw == BOTTOM_BEZEL_WIDTH and ih == BOTTOM_BEZEL_HEIGHT:
                        # Panel bezel
                        self.screen.blit(bezel_img_native, (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y))
                        return

                    if ih >= BOTTOM_BEZEL_HEIGHT:
                        # Overlay bezel (tall ornamental bezel)
                        if iw != SCREEN_WIDTH:
                            scale = SCREEN_WIDTH / max(1, iw)
                            new_h = int(ih * scale)
                            bezel_img = pygame.transform.smoothscale(bezel_img_native, (SCREEN_WIDTH, new_h))
                        else:
                            bezel_img = bezel_img_native
                        y = SCREEN_HEIGHT - bezel_img.get_height()
                        self.screen.blit(bezel_img, (0, y))
                        return

                    # Default: scale to panel size
                    bezel_img = pygame.transform.smoothscale(bezel_img_native, (BOTTOM_BEZEL_WIDTH, BOTTOM_BEZEL_HEIGHT))
                    self.screen.blit(bezel_img, (BOTTOM_BEZEL_X, BOTTOM_BEZEL_Y))
                    return
            else:
                print(f"[WARNING]Ãƒâ€šÃ‚Â  No bezel file found, using fallback drawing")
        except Exception as e:
            print(f"[ERROR] Error loading bezel: {e}")

        # Fallback to drawing bezel
        print(f"[RENDER] Drawing fallback bezel for theme: {theme_name}")
        if theme_name == 'fantasy':
            draw_fantasy_bottom_bezel(self.screen, self.theme)
        elif theme_name == 'scifi':
            draw_scifi_bottom_bezel(self.screen, self.theme)
        elif theme_name == 'horror':
            draw_horror_bottom_bezel(self.screen, self.theme)
        elif theme_name == 'steampunk':
            draw_steampunk_bottom_bezel(self.screen, self.theme)
        else:
            draw_fantasy_bottom_bezel(self.screen, self.theme)
        print(f"[OK] Fallback bezel drawn")
    
    def draw_text_in_area(self, text, x, y, width, height):
        """Draw text with word wrap in specified area"""
        try:
            words = text.split()
            lines = []
            current_line = []
            
            # Word wrap
            for word in words:
                test_line = ' '.join(current_line + [word])
                text_surf = self.font_small.render(test_line, True, (0, 0, 0))  # Black text on light background
                if text_surf.get_width() > width - 20:  # 10px margin on each side
                    if current_line:
                        lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    current_line.append(word)
            
            if current_line:
                lines.append(' '.join(current_line))
            
            # Draw lines (max lines that fit in height)
            line_height = 22
            max_lines = (height - 20) // line_height
            y_offset = y + 10  # Top margin
            
            for line in lines[:max_lines]:
                text_surf = self.font_small.render(line, True, (0, 0, 0))
                self.screen.blit(text_surf, (x + 10, y_offset))
                y_offset += line_height
        except Exception as e:
            print(f"Error drawing text in area: {e}")
    
    def draw_player_stats(self):
        """Draw player stats inside stats bezel"""
        if not self.game_engine:
            return
        
        try:
            # Draw stats in the stats text area (inside bezel)
            y = STATS_TEXT_Y + 10
            
            # Health
            health = self.game_engine.get_stat('health')
            health_text = f"HP: {health}"
            health_surf = self.font_small.render(health_text, True, (0, 0, 0))  # Black text
            self.screen.blit(health_surf, (STATS_TEXT_X + 10, y))
            y += 35
            
            # Strength (with item bonuses)
            str_base = self.game_engine.get_stat('strength')
            str_total = self.game_engine.get_total_stat('strength')
            if str_total > str_base:
                str_text = f"STR: {str_base}+{str_total - str_base}"
            else:
                str_text = f"STR: {str_total}"
            str_surf = self.font_small.render(str_text, True, (0, 0, 0))
            self.screen.blit(str_surf, (STATS_TEXT_X + 10, y))
            y += 35
            
            # Luck (with item bonuses)
            luck_base = self.game_engine.get_stat('luck')
            luck_total = self.game_engine.get_total_stat('luck')
            if luck_total > luck_base:
                luck_text = f"LCK: {luck_base}+{luck_total - luck_base}"
            else:
                luck_text = f"LCK: {luck_total}"
            luck_surf = self.font_small.render(luck_text, True, (0, 0, 0))
            self.screen.blit(luck_surf, (STATS_TEXT_X + 10, y))
        except Exception as e:
            print(f"Error drawing player stats: {e}")
    
    def draw_inventory(self):
        """Draw inventory items in inventory bar"""
        if not self.game_engine:
            return
        
        try:
            # Draw "Items:" label at start of inventory bar
            # Hide internal flag markers (e.g. "flag_q1") from the player-facing inventory UI.
            visible_items = []
            for item_name, item_data in self.game_engine.inventory.items():
                nm = str(item_name)
                disp = None
                if isinstance(item_data, dict):
                    disp = item_data.get('display_name') or item_data.get('name')
                    if item_data.get('hidden'):
                        continue
                if nm.lower().startswith('flag_') or (isinstance(disp, str) and disp.lower().startswith('flag_')):
                    continue
                visible_items.append((item_name, item_data))

            if visible_items:
                inv_label = self.font_small.render("Items:", True, (0, 0, 0))  # Black text
                self.screen.blit(inv_label, (INVENTORY_X + 10, INVENTORY_Y + 8))
                
                # Draw items horizontally in the bar
                x_offset = INVENTORY_X + 80
                for item_name, item_data in visible_items[:6]:  # Max 6 visible items
                    if isinstance(item_data, dict):
                        display_name = item_data.get('display_name', item_name)
                    else:
                        display_name = item_name
                    
                    # Draw item (no emoji to avoid rendering issues)
                    item_text = f"[{display_name}]"
                    item_surf = self.font_small.render(item_text, True, (0, 0, 0))  # Black text
                    self.screen.blit(item_surf, (x_offset, INVENTORY_Y + 8))
                    x_offset += item_surf.get_width() + 15
                    
                    # Stop if we're going to overflow the bar
                    if x_offset > INVENTORY_X + INVENTORY_WIDTH - 20:
                        break
        except Exception as e:
            print(f"Error drawing inventory: {e}")
    
    def run(self):
        """Main loop"""
        # Use existing self.clock (initialized in __init__)
        
        # Show splash with STATIC LED (not animated) to reduce audio interference
        self.draw_splash()
        self.leds.set_color('cyan', 0.5)  # Static cyan instead of pulsing
        time.sleep(5)
        
        # Check for game
        if not self.check_for_game():
            self.leds.set_color('orange', 0.5)
        
        last_state = None
        last_game_check = 0  # Track when we last checked for games
        
        while True:
            try:
                # Calculate delta time (in seconds) for smooth animation
                # CLAMP dt to prevent jumps if loop stalls (USB, IO, etc.)
                dt = self.clock.tick(60) / 1000.0  # 60 FPS target, dt in seconds
                dt = min(dt, 0.05)  # Cap at 50ms (prevent animation skips)
                
                # Handle pygame events
                for event in pygame.event.get():
                    if event.type == pygame.QUIT:
                        self.cleanup()
                        return
                    elif event.type == pygame.KEYDOWN:
                        if event.key == pygame.K_ESCAPE:
                            self.cleanup()
                            return
                
                # Check for USB insertion/removal (flagged by USB thread)
                if self.usb_check_pending:
                    self.usb_check_pending = False
                    print(f"[USB] Checking for game (main thread)...")
                    time.sleep(1)  # Wait for mount
                    self.check_for_game()
                
                if self.usb_unload_pending:
                    self.usb_unload_pending = False
                    print(f"[USB-OUT] Unloading game (main thread)...")
                    self.unload_game()
                
                # Determine state
                if not self.current_game:
                    state = 'insert_cart'
                    
                    # PERIODIC CHECK: If on insert_cart screen, check every 2 seconds
                    # This catches USB that was already inserted when console.py started
                    current_time = time.time()
                    if current_time - last_game_check > 2.0:
                        last_game_check = current_time
                        print(f"[CHECK] Periodic game check (insert_cart screen)...")
                        if self.check_for_game():
                            print(f"[OK] Game found on periodic check!")
                    
                elif not hasattr(self, 'game_logo_shown'):
                    state = 'game_logo'
                else:
                    state = 'playing'
                
                # Draw appropriate screen
                if state != last_state:
                    print(f"[GAME] State change: {last_state} Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ {state}")
                    if state == 'insert_cart':
                        self.draw_insert_cart()
                        pygame.display.flip()  # [OK] SHOW the insert cart screen!
                        self.leds.set_color('orange', 0.5)
                        delattr(self, 'game_logo_shown') if hasattr(self, 'game_logo_shown') else None
                
                elif state == 'game_logo':
                    print("[RENDER] Drawing game logo...")
                    self.draw_game_logo()
                    pygame.display.flip()  # [OK] SHOW the logo!
                    print("[OK] Game logo displayed")
                    self.apply_page_effects()
                    print("[TIMER] Waiting 3 seconds...")
                    
                    # Non-blocking 3 second delay that processes events
                    logo_start_time = time.time()
                    while time.time() - logo_start_time < 3.0:
                        # Process events to keep window responsive
                        for event in pygame.event.get():
                            if event.type == pygame.QUIT:
                                self.cleanup()
                                return
                            elif event.type == pygame.KEYDOWN:
                                if event.key == pygame.K_ESCAPE:
                                    self.cleanup()
                                    return
                        
                        # Keep display updated
                        pygame.display.flip()
                        time.sleep(0.016)  # ~60 FPS during wait
                    
                    print("[OK] Logo timeout complete")
                    self.game_logo_shown = True
                    
                    # Ensure window stays focused (in case file manager popup stole focus)
                    pygame.event.clear()  # Clear any pending events
                    pygame.display.flip()  # Final flip to ensure visibility
                
                elif state == 'playing':
                    # First transition to playing state
                    self.draw_game_page(dt)  # Pass dt!
                    pygame.display.flip()  # [OK] SHOW the first game page!
                
                last_state = state
            
                # Continuous redraw in playing state for text scrolling + Ken Burns animation
                # Pause redraw while waiting on action "Continue" so the result screen remains visible.
                if state == 'playing' and not getattr(self, 'awaiting_action_continue', False):
                    self.draw_game_page(dt)  # Pass dt!
                    pygame.display.flip()  # CRITICAL: Actually update the display!
                
                # Check for redraw requests (OUTSIDE the state change check!)
                if self.needs_redraw and state == 'playing':
                    self.needs_redraw = False
                
                # Check for pending action results (must happen in main thread!)
                if self.pending_action_result and state == 'playing':
                    result = self.pending_action_result
                    self.pending_action_result = None
                    
                    # Show result animation (safe in main thread)
                    self.show_action_result(result)

                    # Gate navigation on user "Continue" (parity with web player)
                    self.awaiting_action_continue = True
                    self.pending_action_continue = False
                    self._action_continue_result = result

                # If waiting for action continue, process it in main thread with fade
                if state == 'playing' and getattr(self, 'awaiting_action_continue', False) and getattr(self, 'pending_action_continue', False):
                    result = getattr(self, '_action_continue_result', None)
                    self.pending_action_continue = False
                    self.awaiting_action_continue = False
                    self._action_continue_result = None

                    if result:
                        self.fade_to_black(duration=0.2)
                        self.hold_black(duration=0.15)
                        self.game_engine.process_action_result(result)
                        self.apply_page_effects()
                        self.fade_from_black(duration=0.3)
                        self.needs_redraw = True
                
                # Check for pending choices (must happen in main thread for fade!)
                if self.pending_choice is not None and state == 'playing':
                    choice_index = self.pending_choice
                    self.pending_choice = None
                    
                    print(f"[BUTTON] Processing choice {choice_index} in main loop...")
                    
                    # Fade to black
                    self.fade_to_black()
                    
                    # Hold at black for beat
                    self.hold_black(duration=0.15)
                    
                    # Make choice (during black screen)
                    self.game_engine.make_choice(choice_index)
                    
                    print(f"   New page: {self.game_engine.current_page}")
                    
                    # Apply LED effect from new page
                    self.apply_page_effects()
                    
                    # Fade from black to new page
                    self.fade_from_black()
                    
                    # Redraw the screen
                    self.needs_redraw = True
            
            except Exception as e:
                print("=" * 70)
                print("[ERROR] CRITICAL ERROR IN MAIN LOOP:")
                print(f"   Error: {e}")
                print(f"   Type: {type(e).__name__}")
                import traceback
                print(f"   Traceback:")
                traceback.print_exc()
                print("=" * 70)
                
                # Try to continue instead of crashing
                print("[WARNING]Ãƒâ€šÃ‚Â  Attempting to continue...")
                time.sleep(0.1)  # Brief pause before next frame
    
    def cleanup(self):
        """Cleanup resources"""
        # Release video capture
        self.release_video()
        
        # Cancel any pending audio timer
        if hasattr(self, '_audio_timer') and self._audio_timer:
            try:
                self._audio_timer.cancel()
            except:
                pass
        
        # Stop any playing audio
        if hasattr(self, '_audio_process') and self._audio_process:
            try:
                self._audio_process.kill()
                try:
                    self._audio_process.wait(timeout=0.5)
                except:
                    pass
            except:
                pass
        
        # Stop any playing sound effects
        if hasattr(self, '_sound_process') and self._sound_process:
            try:
                self._sound_process.kill()
                try:
                    self._sound_process.wait(timeout=0.5)
                except:
                    pass
            except:
                pass
        
        self.observer.stop()
        self.leds.off()
        pygame.quit()


def main():
    """Main entry point"""
    # Ensure assets directory exists
    ASSETS_PATH.mkdir(parents=True, exist_ok=True)
    
    console = DungeonMastronConsole()
    
    try:
        console.run()
    except KeyboardInterrupt:
        console.cleanup()


if __name__ == "__main__":
    main()
