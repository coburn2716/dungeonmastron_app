# 🎨 COMPLETE WORKFLOW EXAMPLE

## How to Generate Image Prompts for Your Game

This document shows the COMPLETE process from game JSON to ready-to-use image prompts.

---

## STEP 1: Prepare Your Materials

**You need:**
1. ✅ Your game JSON file (e.g., `tower_game.json`)
2. ✅ The Image Prompt Generator template (from `IMAGE_PROMPT_GENERATOR_QUICK_START.md`)
3. ✅ A chosen Visual Bible (from `VISUAL_BIBLE_EXAMPLES.md`)

---

## STEP 2: Choose Your Visual Bible

**Example:** You're making a horror game, so you choose:

```
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
```

---

## STEP 3: Upload to AI

**Open ChatGPT or Claude and paste:**

```
I'm uploading a game JSON. Please generate image prompts following the 
IMAGE PROMPT GENERATOR TEMPLATE.

Visual Bible (use this exact prefix for ALL prompts):
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.

Output Format: Markdown list, batched by 25 prompts

Please proceed with all pages.
```

**Then upload:**
- The template file (`IMAGE_PROMPT_GENERATOR_QUICK_START.md`)
- Your game JSON file

---

## STEP 4: AI Generates Prompts

The AI will output something like this:

```markdown
# 🎨 IMAGE PROMPT LIST FOR: Tower of the Black Star

**VISUAL BIBLE:**
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.

**Total Pages:** 100
**Output Format:** Markdown list, batched by 25

---

# 📦 Batch 1 (Pages 1-25)

### common1_entry

TEXT (condensed):
A stone corridor stretches ahead, walls seeping moisture. Footsteps echo. 
The dog's ears flatten against its skull.

PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
Long shot down a narrow stone corridor. The girl and dog walk away from 
camera, small in the frame. Damp stone walls glisten with moisture. Their 
footsteps create ripples in shallow water on the floor. Dark shadows stretch 
ahead. Oppressive, claustrophobic atmosphere.

---

### common1_dice

TEXT (verbatim):
A grinding noise erupts. Stone gears turn in the walls. You must dodge!

PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
Dynamic angle showing the girl leaping sideways, dog scrambling beside her. 
Massive stone gears visible in the wall behind them, grinding and rotating. 
Dust falls from the ceiling. Sharp diagonal composition emphasizing motion 
and urgency. Tense, reactive moment.

---

### sanctuary_rest

TEXT (condensed):
A quiet alcove with a wooden bench. Moonlight streams through a cracked window. 
For a moment, the house holds its breath. The dog settles at your feet.

PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
Gentle medium shot of the girl sitting on a wooden bench in a small alcove. 
The dog lies curled at her feet. Soft moonlight pours through a cracked 
window, creating peaceful pools of light. Her posture shows exhaustion but 
relief. Calm, temporary respite from danger.

---

### boss_stage1

TEXT (condensed):
The Quilt Widow unfolds from the shadows—patchwork limbs stitched from rage 
and sorrow. Your dog barks a challenge. There is no escape.

PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
Wide dramatic shot. The girl and dog in defensive stance in foreground. 
Behind them, a massive figure emerges from darkness—a grotesque patchwork 
form of fabric and thread, vaguely humanoid but wrong. Dramatic lighting from 
single source creates sharp shadows. High tension, confrontational composition. 
Subtle horror aesthetic maintained.

---

[Continue for all 25 pages in batch...]
```

---

## STEP 5: Review and Save

**Check the output:**
- ✅ Every page has a prompt
- ✅ Visual Bible is identical in all prompts
- ✅ Scene descriptions match page text
- ✅ No invented story elements
- ✅ Camera angles varied appropriately

**Save the prompts:**
- Copy to a text file: `tower_game_image_prompts.md`
- Or keep in batches: `batch_1.md`, `batch_2.md`, etc.

---

## STEP 6: Generate Images

Now you can use these prompts with any AI image generator:

### DALL·E 3 (OpenAI)
1. Open ChatGPT with DALL·E access
2. Paste one prompt at a time
3. Download the generated image
4. Name it with the page_id (e.g., `common1_entry.png`)

### Midjourney
1. In Discord, use `/imagine`
2. Paste the full prompt
3. Add `--ar 16:9` at the end (aspect ratio)
4. Download when ready
5. Name it with page_id

### Stable Diffusion
1. Use Automatic1111, ComfyUI, or other interface
2. Paste prompt into positive prompt field
3. Set resolution to 16:9 (e.g., 1024x576)
4. Generate
5. Save with page_id name

---

## STEP 7: Organize Generated Images

**File structure:**
```
your_game/
├── game.json
├── images/
│   ├── common1_entry.png
│   ├── common1_dice.png
│   ├── sanctuary_rest.png
│   ├── boss_stage1.png
│   └── ...
└── prompts/
    ├── image_prompts_batch1.md
    ├── image_prompts_batch2.md
    └── ...
```

**Naming convention:**
- Images: `[page_id].png` or `[page_id].jpg`
- Matches exactly with your JSON page IDs
- Makes it easy to match images to pages

---

## STEP 8: Integrate with Game Builder

In the Game Builder, you can:

1. **Manual upload per page:**
   - Select a page
   - Click "Upload Image" in properties panel
   - Choose the matching `[page_id].png` file

2. **Batch upload (future feature):**
   - Upload all images at once
   - Auto-match by filename to page_id

3. **Animation generation:**
   - Images become source for Ken Burns animations
   - Use the "🎬 Generate Animations" button

---

## EXAMPLE: COMPLETE WORKFLOW IN PRACTICE

**Your game:** "Tower of the Black Star" (100 pages)

### Day 1: Setup
- ✅ Export `tower_game.json` from Game Builder
- ✅ Choose Visual Bible: Studio Ghibli horror
- ✅ Upload template + JSON to ChatGPT
- ✅ Receive 4 batches of 25 prompts each
- ✅ Save all batches to `prompts/` folder

### Day 2: Generate Images (Pages 1-25)
- Generate 25 images using DALL·E
- Takes ~2 hours (3-5 minutes per image)
- Save with page_id names
- Review quality

### Day 3: Generate Images (Pages 26-50)
- Continue with batch 2
- Maintain consistency by checking against batch 1
- Adjust prompts if needed for better results

### Day 4: Generate Images (Pages 51-75)
- Batch 3
- Look for any visual drift
- Regenerate if character design inconsistent

### Day 5: Generate Images (Pages 76-100)
- Final batch
- Boss encounters need extra attention
- Review entire image set

### Day 6: Integration
- Upload all images to Game Builder
- Match to correct pages
- Test game flow with images
- Generate Ken Burns animations

### Day 7: Polish
- Regenerate any low-quality images
- Ensure consistency across boss stages
- Final review of image-to-text matching

**Total time:** 1 week for 100 high-quality, consistent images

---

## TROUBLESHOOTING

### Problem: Character looks different across images
**Solution:** 
- Your Visual Bible might be too vague
- Add more specific character details to Visual Bible
- Regenerate all images with updated Visual Bible

### Problem: Some scenes don't match the text
**Solution:**
- Review the TEXT section in that prompt
- Verify it accurately reflects JSON text
- Adjust scene description if needed
- Regenerate that specific image

### Problem: Visual drift over many images
**Solution:**
- Take breaks between batches
- Start each session by reviewing previous batch
- Use first batch as reference throughout
- Consider generating in smaller batches (15 prompts)

### Problem: Action scenes aren't dynamic enough
**Solution:**
- Add more specific camera angles to prompts
- Use terms like "dramatic angle," "dynamic composition"
- Specify motion: "leaping," "dodging," "mid-swing"

### Problem: Some prompts are too long
**Solution:**
- AI image generators have character limits (~400-500 chars)
- If prompt is too long, condense scene description
- Keep Visual Bible intact, shorten only scene-specific part
- Focus on 2-3 key visual elements per scene

---

## BEST PRACTICES

**For consistent results:**
1. Generate all images in same session if possible
2. Use same AI generator throughout (don't mix DALL·E + Midjourney)
3. Save the seed number if generator supports it
4. Keep a reference image from batch 1
5. Review every 10 images for quality

**For quality:**
1. Don't rush - quality > speed
2. Regenerate if image doesn't feel right
3. Boss encounters deserve multiple attempts
4. Sanctuary pages should feel noticeably calmer
5. Ending pages should be most cinematic

**For efficiency:**
1. Generate in batches matching prompt batches
2. Name files immediately after generating
3. Keep prompts and images in same order
4. Use a spreadsheet to track progress:
   - Page ID | Prompt Status | Image Status | Notes

---

## FINAL RESULT

After following this workflow, you will have:

✅ 100 unique, high-quality images
✅ All visually consistent (same style, character, mood)
✅ Every image matches its page text
✅ Ready to integrate with Game Builder
✅ Ready for Ken Burns animation generation
✅ Professional, production-ready game assets

**Time investment:**
- Prompt generation: 30 minutes
- Image generation: 1-2 weeks (depending on game size)
- Integration: 1-2 days
- Total: ~2 weeks for 100-page game

**Worth it?** 
Absolutely. Consistent, professional visuals that elevate your game from text adventure to illustrated narrative experience.

---

## NEXT STEPS

1. Generate your prompts using the template
2. Start with first batch of images
3. Review quality before continuing
4. Maintain consistency throughout
5. Share your results!

**Good luck! 🎨🎮**
