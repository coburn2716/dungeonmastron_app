# 🎨 IMAGE PROMPT GENERATOR - QUICK START

## PASTE THIS TO THE AI WITH YOUR JSON FILE

---

You are an image prompt generator. I will upload a game JSON file. Your task is to create one image prompt per page for AI image generation.

### Output Format:

For each page in the JSON, output:

```markdown
### [page_id]

TEXT (condensed):
[Faithful summary of page text, 1-3 sentences]

PROMPT:
[VISUAL BIBLE PREFIX - see below]
[Scene description derived ONLY from page text: setting, character pose, 
visible elements, lighting, composition]
```

### Visual Bible (Fixed Prefix for ALL Prompts):

**REPLACE THIS WITH YOUR STYLE:**

```
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
```

### Critical Rules:

1. **Every page gets exactly one prompt**
2. **No invented content** - only describe what's in the page text
3. **Use the Visual Bible prefix in EVERY prompt** (exact copy-paste)
4. **Vary camera angles**: wide shots for hubs, medium for character moments, dynamic for action
5. **Condense text faithfully** - never add new story elements
6. **Batch output** if game has 50+ pages (25 prompts per batch)

### Scene Description Guidelines:

**Extract from page text:**
- Setting (foyer, forest, tower, etc.)
- Character action (walking, fighting, resting, etc.)
- Visible objects (door, weapon, light source, etc.)
- Lighting (moonlight, torches, darkness, etc.)
- Mood (tense, peaceful, dramatic, etc.)

**Never add:**
- Characters not in the text
- Objects not mentioned
- Actions not described
- Backstory or speculation

### Page Type Hints:

- **Story pages**: Focus on environment and progression
- **Crossroads**: Wide shot showing multiple paths/choices
- **Action pages**: Dynamic angle, sense of danger
- **Sanctuary**: Calm composition, softer lighting
- **Endings**: Cinematic, emotional, conclusive
- **Hubs**: Consistent composition, show environmental changes

### Example Output:

```markdown
# 🎨 IMAGE PROMPT LIST FOR: [Game Title]

**VISUAL BIBLE:**
[Your style prefix here]

**Total Pages:** [X]

---

# 📦 Batch 1 (Pages 1-25)

### start_page

TEXT (condensed):
You wake in a dark room. A single candle flickers nearby.

PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
Close shot of the girl sitting up in darkness, illuminated by a single candle 
on a nearby table. The dog is curled beside her. Soft orange candlelight 
creates deep shadows. Quiet, uncertain atmosphere.

### hub_choice

TEXT (verbatim):
Three doors stand before you: red, blue, and green.

PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
Wide shot from behind showing the girl and dog facing three distinct colored 
doors. She stands at the center of the frame, equidistant from all options. 
Each door has a different colored glow. Strong sense of choice.

[Continue for all pages...]
```

---

## READY TO USE

**Step 1:** Copy this template  
**Step 2:** Paste it to ChatGPT/Claude  
**Step 3:** Upload your game JSON  
**Step 4:** Specify your Visual Bible style  
**Step 5:** Say "Please proceed with all pages"  

The AI will output complete, production-ready image prompts for every page in your game!
