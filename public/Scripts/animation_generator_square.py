#!/usr/bin/env python3
"""
Dungeon Mastron Animation Generator (Square 1024x1024)
Generates Ken Burns style MP4 animations at 1024x1024 using FFmpeg.

Usage: place alongside animation_manifest.json and run:
  python3 animation_generator_square.py
"""

import json
import subprocess
import sys
from pathlib import Path
import random

DURATION_SECONDS = 14
FPS = 30
DURATION_FRAMES = DURATION_SECONDS * FPS
# Use (on/(DURATION_FRAMES-1)) so motion stays continuous for the full clip.
ON_NORM = f"(on/{DURATION_FRAMES - 1})"
ZOOM_START = 1.0
ZOOM_END = 1.15
ZOOM_DELTA = ZOOM_END - ZOOM_START

# Render at higher internal resolution to reduce pixel-quantization "stepping",
# then downscale to the final output size.
INTERNAL_SIZE = 2048
OUTPUT_SIZE = 1024
_SCALE_FACTOR = INTERNAL_SIZE / OUTPUT_SIZE

# Pixel offsets (total over the full clip), expressed in INTERNAL_SIZE pixels.
# (Double the prior 1024-space travel since we render at 2048 then downscale.)
PAN_UP_PX = 42.0 * _SCALE_FACTOR
PAN_RIGHT_PX = 55.8 * _SCALE_FACTOR
PAN_DIAG_PX = 28.1 * _SCALE_FACTOR

EFFECTS = {
    'zoom_in': {
        'name': 'Zoom In',
        'zoompan': f"z='{ZOOM_START}+{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    },
    'zoom_out': {
        'name': 'Zoom Out',
        'zoompan': f"z='{ZOOM_END}-{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    },
    'zoom_pan_up': {
        'name': 'Zoom + Pan Up',
        'zoompan': f"z='{ZOOM_START}+{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)-{PAN_UP_PX}*{ON_NORM}'"
    },
    'zoom_pan_up_right': {
        'name': 'Zoom + Pan Up-Right',
        'zoompan': f"z='{ZOOM_START}+{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)+{PAN_DIAG_PX}*{ON_NORM}':y='ih/2-(ih/zoom/2)-{PAN_DIAG_PX}*{ON_NORM}'"
    },
    'zoom_pan_right': {
        'name': 'Zoom + Pan Right',
        'zoompan': f"z='{ZOOM_START}+{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)+{PAN_RIGHT_PX}*{ON_NORM}':y='ih/2-(ih/zoom/2)'"
    },
    'zoom_pan_down_right': {
        'name': 'Zoom + Pan Down-Right',
        'zoompan': f"z='{ZOOM_START}+{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)+{PAN_DIAG_PX}*{ON_NORM}':y='ih/2-(ih/zoom/2)+{PAN_DIAG_PX}*{ON_NORM}'"
    },
    'zoom_pan_down': {
        'name': 'Zoom + Pan Down',
        'zoompan': f"z='{ZOOM_START}+{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+{PAN_UP_PX}*{ON_NORM}'"
    },
    'zoom_pan_down_left': {
        'name': 'Zoom + Pan Down-Left',
        'zoompan': f"z='{ZOOM_START}+{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)-{PAN_DIAG_PX}*{ON_NORM}':y='ih/2-(ih/zoom/2)+{PAN_DIAG_PX}*{ON_NORM}'"
    },
    'zoom_pan_left': {
        'name': 'Zoom + Pan Left',
        'zoompan': f"z='{ZOOM_START}+{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)-{PAN_RIGHT_PX}*{ON_NORM}':y='ih/2-(ih/zoom/2)'"
    },
    'zoom_pan_up_left': {
        'name': 'Zoom + Pan Up-Left',
        'zoompan': f"z='{ZOOM_START}+{ZOOM_DELTA}*{ON_NORM}':d={DURATION_FRAMES}:x='iw/2-(iw/zoom/2)-{PAN_DIAG_PX}*{ON_NORM}':y='ih/2-(ih/zoom/2)-{PAN_DIAG_PX}*{ON_NORM}'"
    }
}


def check_ffmpeg():
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False


def get_random_effect():
    return random.choice(list(EFFECTS.keys()))


def generate_video(image_path, output_path, effect_key):
    if effect_key == 'random':
        effect_key = get_random_effect()
    effect = EFFECTS.get(effect_key, EFFECTS['zoom_in'])

    cmd = [
        'ffmpeg',
        '-loop', '1',
        '-i', str(image_path),
        '-vf', f"scale={INTERNAL_SIZE}:{INTERNAL_SIZE}:flags=lanczos,zoompan={effect['zoompan']}:s={INTERNAL_SIZE}x{INTERNAL_SIZE}:fps={FPS},scale={OUTPUT_SIZE}:{OUTPUT_SIZE}:flags=lanczos",
        '-r', str(FPS),
        '-vsync', 'cfr',
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        # Prefer decode-friendly H.264 for low-power devices (no B-frames, baseline profile).
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-x264-params', f'keyint={FPS}:min-keyint={FPS}:scenecut=0:bframes=0:ref=1',
        '-preset', 'slow',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-t', '14',
        '-y',
        str(output_path)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"  ✓ Generated ({size_mb:.1f} MB)")
        return True
    else:
        err_lines = result.stderr.splitlines()
        print(f"  ✗ Failed: {err_lines[-1] if err_lines else 'Unknown error'}")
        return False


def main():
    if not check_ffmpeg():
        print("FFmpeg not found. Please install FFmpeg.")
        sys.exit(1)

    manifest_path = Path('animation_manifest.json')
    if not manifest_path.exists():
        print(f"Manifest not found: {manifest_path}")
        sys.exit(1)

    with open(manifest_path, 'r') as f:
        manifest = json.load(f)

    game_title = manifest.get('game_title', 'Unknown Game')
    pages = manifest.get('pages', [])

    animations_dir = Path('images/animations_square')
    animations_dir.mkdir(parents=True, exist_ok=True)

    success = 0
    fail = 0
    for i, page_info in enumerate(pages, 1):
        page_id = page_info['pageId']
        image_name = page_info['imageName']
        effect = page_info.get('effect', 'random')
        image_path = Path('images') / image_name
        if not image_path.exists():
            print(f"[{i}/{len(pages)}] {page_id}\n  ✗ Source missing: {image_path}")
            fail += 1
            continue
        video_name = Path(image_name).stem + '.mp4'
        output_path = animations_dir / video_name
        print(f"[{i}/{len(pages)}] {page_id}\n  Image: {image_name}")
        if generate_video(image_path, output_path, effect):
            success += 1
        else:
            fail += 1
        print()

    print(f"Done. Success: {success}, Failed: {fail}, Output: {animations_dir}")


if __name__ == '__main__':
    main()
