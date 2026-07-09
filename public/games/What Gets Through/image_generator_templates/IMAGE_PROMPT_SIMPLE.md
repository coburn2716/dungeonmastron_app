# IMAGE PROMPT GENERATOR - SIMPLE TEMPLATE

## INSTRUCTIONS

You are generating image prompts for a narrative game. I will upload a game JSON file. Your task: create one image prompt per page.

---

## OUTPUT FORMAT

For each page in the JSON, output this **exact structure**:

```markdown
### [page_id]

TEXT (condensed):
[The actual page text - use verbatim if short, condense faithfully if long.
NEVER add new story elements]

PROMPT:
[VISUAL BIBLE - see below]
[Scene description derived ONLY from the page text above]
```

---

## VISUAL BIBLE (Fixed Prefix)

**CRITICAL:** Every single prompt MUST start with this exact prefix:

```
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
```

**After the Visual Bible, add scene-specific description:**
- Setting/location from the text
- Character actions from the text
- Visible objects from the text
- Lighting cues from the text
- Mood from the text
- Camera angle (vary: wide/medium/close/dramatic)

---

## CRITICAL RULES

1. **Every page gets exactly one prompt**
2. **No invented content** - only describe what's in the page text
3. **Visual Bible is IDENTICAL in all prompts** (copy-paste, never modify)
4. **Text condensations must be faithful** - no new story beats
5. **Batch large games** - If 50+ pages, output 25 prompts per batch

---

## WHAT TO INCLUDE IN SCENE DESCRIPTIONS

✅ **Include:**
- Setting (foyer, corridor, forest, etc.)
- Character pose/action (sitting, walking, fighting, etc.)
- Visible objects (door, weapon, candle, etc.)
- Lighting (moonlight, torch, darkness, etc.)
- Spatial relationships (behind, facing, approaching, etc.)
- Camera angle (wide shot, close-up, over-shoulder, etc.)

❌ **Never add:**
- Characters not in the text
- Actions not in the text
- Objects not in the text
- Emotions not implied by the text
- Backstory or future events

---

## EXAMPLE OUTPUT

```markdown
# 📦 IMAGE PROMPT LIST — Batch 1 (Pages 1-25)

### awakening_foyer

TEXT (condensed):
The girl wakes on a cold floor inside a quiet, old house. Dust floats in 
moonlight. Her dog presses close, trembling. The house feels like it is 
holding its breath.

PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
The girl sits on a cold wooden floor in a dark foyer, just waking up, one 
hand braced behind her. Moonlight spills through an open doorway ahead, 
illuminating drifting dust motes. Her dog presses against her leg protectively. 
The old house interior shows peeling wallpaper, scuffed floors, and deep 
shadows. Quiet, tense stillness.

---

### entry_hall

TEXT (condensed):
The entry hall is wide and worn. A ceiling mural peels like drifting clouds. 
Three openings wait: a cloakroom curtain, a moonlit parlor door, and a glassy 
conservatory passage.

PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
Wide view of an old entry hall. The girl and her dog stand together, seen 
from behind, facing three distinct paths: a narrow cloakroom curtain to one 
side, a parlor door glowing faintly with moonlight, and a glass-lined 
conservatory corridor reflecting dim light. The ceiling mural peels into 
cloud-like shapes. Strong sense of choice and uncertainty.

---

### combat_page

TEXT (verbatim):
Something moves in the darkness. The dog growls. You must fight.

PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
Dynamic angle showing the girl in defensive stance, dog growling beside her. 
A dark shadowy form moves in the deep background, barely visible. Tense 
lighting with strong contrast. Sense of imminent danger.

---

[Continue for all pages in batch...]
```

---

## BATCHING INSTRUCTIONS

**If game has 50+ pages:**

Output in batches of 25 prompts:
```markdown
# 📦 IMAGE PROMPT LIST — Batch 1 (Pages 1-25)
[25 prompts]

# 📦 IMAGE PROMPT LIST — Batch 2 (Pages 26-50)
[25 prompts]

[Continue until all pages covered...]
```

Clearly label which pages are in each batch.

---

## BEFORE YOU START

When I upload the JSON, please:

1. Count total pages
2. Announce batch plan (e.g., "183 pages, will output in 8 batches of ~25")
3. Confirm Visual Bible to use
4. Proceed with Batch 1

---

## READY TO USE

**To use this template:**

1. Copy this entire file
2. Paste it to ChatGPT or Claude
3. Upload your game JSON
4. Say: "Please proceed with all pages"
5. Receive complete prompt list in batches

The AI will output production-ready image prompts for every single page in your game!
