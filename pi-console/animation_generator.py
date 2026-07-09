#!/usr/bin/env python3
"""
Dungeon Mastron Animation Generator
Generates Ken Burns style video animations for game pages using FFmpeg
"""

import json
import subprocess
import sys
from pathlib import Path
import random

# FFmpeg Ken Burns effect templates (FFmpeg 8.0 compatible)
# Using 'on' (frame number) instead of 't' (time)
# 420 frames at 30fps = 14 seconds (double length, same zoom/pan)
EFFECTS = {
    'zoom_in': {
        'name': 'Zoom In',
        'zoompan': "z='min(1.15,zoom+0.00107)':d=420:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    },
    'zoom_out': {
        'name': 'Zoom Out',
        'zoompan': "z='if(lte(zoom,1.0),1.15,max(1.0,zoom-0.00107))':d=420:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    },
    'zoom_pan_up': {
        'name': 'Zoom + Pan Up',
        'zoompan': "z='min(1.15,zoom+0.00107)':d=420:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)-on*0.05'"
    },
    'zoom_pan_up_right': {
        'name': 'Zoom + Pan Up-Right',
        'zoompan': "z='min(1.15,zoom+0.00107)':d=420:x='iw/2-(iw/zoom/2)+on*0.0335':y='ih/2-(ih/zoom/2)-on*0.0335'"
    },
    'zoom_pan_right': {
        'name': 'Zoom + Pan Right',
        'zoompan': "z='min(1.15,zoom+0.00107)':d=420:x='iw/2-(iw/zoom/2)+on*0.0665':y='ih/2-(ih/zoom/2)'"
    },
    'zoom_pan_down_right': {
        'name': 'Zoom + Pan Down-Right',
        'zoompan': "z='min(1.15,zoom+0.00107)':d=420:x='iw/2-(iw/zoom/2)+on*0.0335':y='ih/2-(ih/zoom/2)+on*0.0335'"
    },
    'zoom_pan_down': {
        'name': 'Zoom + Pan Down',
        'zoompan': "z='min(1.15,zoom+0.00107)':d=420:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+on*0.05'"
    },
    'zoom_pan_down_left': {
        'name': 'Zoom + Pan Down-Left',
        'zoompan': "z='min(1.15,zoom+0.00107)':d=420:x='iw/2-(iw/zoom/2)-on*0.0335':y='ih/2-(ih/zoom/2)+on*0.0335'"
    },
    'zoom_pan_left': {
        'name': 'Zoom + Pan Left',
        'zoompan': "z='min(1.15,zoom+0.00107)':d=420:x='iw/2-(iw/zoom/2)-on*0.0665':y='ih/2-(ih/zoom/2)'"
    },
    'zoom_pan_up_left': {
        'name': 'Zoom + Pan Up-Left',
        'zoompan': "z='min(1.15,zoom+0.00107)':d=420:x='iw/2-(iw/zoom/2)-on*0.0335':y='ih/2-(ih/zoom/2)-on*0.0335'"
    }
}

def check_ffmpeg():
    """Check if FFmpeg is installed"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ FFmpeg found")
            return True
    except FileNotFoundError:
        pass
    
    print("✗ FFmpeg not found!")
    print("\nPlease install FFmpeg:")
    print("  Mac: brew install ffmpeg")
    print("  Linux: sudo apt install ffmpeg")
    print("  Windows: Download from https://ffmpeg.org/")
    return False

def get_random_effect():
    """Get a random animation effect"""
    effect_keys = list(EFFECTS.keys())
    return random.choice(effect_keys)

def generate_video(image_path, output_path, effect_key):
    """Generate Ken Burns video using FFmpeg"""
    
    if effect_key == 'random':
        effect_key = get_random_effect()
    
    effect = EFFECTS.get(effect_key, EFFECTS['zoom_in'])
    
    print(f"  Effect: {effect['name']}")
    
    # FFmpeg command
    cmd = [
        'ffmpeg',
        '-loop', '1',  # Loop the image
        '-i', str(image_path),  # Input image
        '-vf', f"zoompan={effect['zoompan']}:s=1280x720:fps=30",  # Ken Burns filter
        '-c:v', 'libx264',  # H.264 codec
        '-preset', 'slow',  # Better compression
        '-crf', '23',  # Quality (23 = good balance)
        '-pix_fmt', 'yuv420p',  # Pi compatibility
        '-t', '14',  # 14 second duration (double length)
        '-y',  # Overwrite output
        str(output_path)
    ]
    
    # Run FFmpeg (suppress output for cleaner progress)
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        # Get file size
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"  ✓ Generated ({size_mb:.1f} MB)")
        return True
    else:
        print(f"  ✗ Failed: {result.stderr.split('n')[-2]}")
        return False

def main():
    print("=" * 60)
    print("DUNGEON MASTRON ANIMATION GENERATOR")
    print("=" * 60)
    print()
    
    # Check FFmpeg
    if not check_ffmpeg():
        sys.exit(1)
    
    # Find manifest file
    manifest_path = Path('animation_manifest.json')
    if not manifest_path.exists():
        print(f"\n✗ Manifest not found: {manifest_path}")
        print("\nPlease:")
        print("1. Run this script from your game folder")
        print("2. Make sure animation_manifest.json is in the same folder")
        sys.exit(1)
    
    # Load manifest
    print(f"\n📄 Loading manifest: {manifest_path}")
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    
    game_title = manifest.get('game_title', 'Unknown Game')
    pages = manifest.get('pages', [])
    
    print(f"Game: {game_title}")
    print(f"Pages: {len(pages)}")
    print()
    
    # Create animations directory
    animations_dir = Path('images/animations')
    animations_dir.mkdir(parents=True, exist_ok=True)
    print(f"✓ Output directory: {animations_dir}")
    print()
    
    # Generate videos
    print("Generating animations:")
    print("-" * 60)
    
    success_count = 0
    fail_count = 0
    
    for i, page_info in enumerate(pages, 1):
        page_id = page_info['pageId']
        image_name = page_info['imageName']
        effect = page_info.get('effect', 'random')
        
        # Check if source image exists
        image_path = Path('images') / image_name
        if not image_path.exists():
            print(f"[{i}/{len(pages)}] {page_id}")
            print(f"  ✗ Source image not found: {image_path}")
            print()
            fail_count += 1
            continue
        
        # Output video path
        video_name = Path(image_name).stem + '.mp4'
        output_path = animations_dir / video_name
        
        print(f"[{i}/{len(pages)}] {page_id}")
        print(f"  Image: {image_name}")
        
        # Generate video
        if generate_video(image_path, output_path, effect):
            success_count += 1
        else:
            fail_count += 1
        
        print()
    
    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✓ Success: {success_count} videos")
    if fail_count > 0:
        print(f"✗ Failed: {fail_count} videos")
    print(f"📁 Output: {animations_dir.absolute()}")
    print()
    
    if success_count > 0:
        print("✓ Animations ready!")
        print("Copy your game folder to USB and play on console.")
    
    if fail_count > 0:
        print("\n⚠️  Some videos failed to generate.")
        print("Check that all source images exist in images/ folder.")

if __name__ == '__main__':
    main()
