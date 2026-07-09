# 🎨 IMAGE PROMPT GENERATOR - README

## What is This?

This is a complete system for generating consistent, high-quality image prompts for your narrative games. Upload your game JSON + template to ChatGPT/Claude, and get back ready-to-use prompts for DALL·E, Midjourney, Stable Diffusion, etc.

---

## 📁 Which File Do I Need?

### **START HERE** → `IMAGE_PROMPT_GENERATOR_QUICK_START.md`

**Use this file when you're ready to generate prompts.**

Just paste this file + your game JSON to ChatGPT and you'll get prompts!

**What it does:**
- Instructions for the AI
- Output format examples
- Critical rules for consistency
- Ready to use immediately

**When to use:** Every time you want to generate prompts for a game

---

### **REFERENCE** → `IMAGE_PROMPT_GENERATOR_TEMPLATE.md`

**The complete, detailed reference documentation.**

**What it contains:**
- Full explanation of the system
- Detailed guidelines for scene descriptions
- Page type considerations
- Quality checklist
- Advanced usage tips

**When to use:** 
- When you need to understand HOW the system works
- When you want to customize the template
- As reference documentation

---

### **CHOOSE YOUR STYLE** → `VISUAL_BIBLE_EXAMPLES.md`

**15+ pre-made Visual Bible styles for different game genres.**

**What it contains:**
- Horror styles (Ghibli, Gothic, Pixel Art, Ink Wash)
- Fantasy styles (Oil Painting, Watercolor, Dark Fantasy)
- Sci-Fi styles (Pixel Art, Moebius, Cyberpunk)
- Adventure, Historical, Mystery styles
- Template for creating custom styles

**When to use:**
- Before generating prompts (pick your style first!)
- When you want visual inspiration
- When you need consistency guidelines

---

### **SEE IT IN ACTION** → `COMPLETE_WORKFLOW_EXAMPLE.md`

**Step-by-step walkthrough from JSON to finished images.**

**What it shows:**
- Day-by-day production timeline
- Real examples of prompts
- How to organize files
- Troubleshooting common issues
- Best practices for quality

**When to use:**
- First time using the system
- Planning your production schedule
- Troubleshooting problems
- Learning best practices

---

## ⚡ QUICK START (3 Steps)

### Step 1: Choose Your Visual Bible
Open `VISUAL_BIBLE_EXAMPLES.md` and pick a style that matches your game.

Example:
```
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
```

### Step 2: Upload to ChatGPT
Paste this message:
```
I'm uploading a game JSON. Please generate image prompts following the 
IMAGE PROMPT GENERATOR TEMPLATE.

Visual Bible: [paste your chosen style here]

Please proceed with all pages.
```

Then upload:
1. `IMAGE_PROMPT_GENERATOR_QUICK_START.md`
2. Your `game.json` file

### Step 3: Receive Your Prompts
ChatGPT will output markdown-formatted prompts like:
```markdown
### page_name

TEXT (condensed):
[Page summary]

PROMPT:
[Your Visual Bible] + [Scene description]
```

Copy these prompts and use them to generate images with DALL·E, Midjourney, etc.

---

## 📊 What You'll Get

**For a 100-page game:**
- 100 unique image prompts
- All visually consistent (same style, character, mood)
- Each prompt matches its page text exactly
- Ready to paste into AI image generators
- Production-ready for game integration

**Output format:**
```markdown
# 📦 Batch 1 (Pages 1-25)

### start_page
TEXT: ...
PROMPT: Studio Ghibli–inspired... [scene description]

### corridor_1
TEXT: ...
PROMPT: Studio Ghibli–inspired... [scene description]

[25 prompts total]

# 📦 Batch 2 (Pages 26-50)
[Continue...]
```

---

## 🎯 Key Benefits

✅ **Consistency:** Same visual style across all 100+ images  
✅ **Quality:** Prompts crafted to match professional game art  
✅ **Speed:** Generate prompts in minutes, not hours  
✅ **Accuracy:** Scene descriptions derived from actual game text  
✅ **Flexibility:** Works with any AI image generator  
✅ **Professional:** Production pipeline used by real game studios  

---

## 🔧 Common Workflows

### First-Time User
1. Read `COMPLETE_WORKFLOW_EXAMPLE.md` (15 min)
2. Choose style from `VISUAL_BIBLE_EXAMPLES.md` (5 min)
3. Use `IMAGE_PROMPT_GENERATOR_QUICK_START.md` to generate (10 min)
4. Generate first batch of images (2-3 hours)
5. Review quality before continuing

### Regular User
1. Open `IMAGE_PROMPT_GENERATOR_QUICK_START.md`
2. Paste to ChatGPT with JSON
3. Specify Visual Bible
4. Receive prompts
5. Generate images

### Advanced User
1. Customize `IMAGE_PROMPT_GENERATOR_TEMPLATE.md` for specific needs
2. Create custom Visual Bible using template
3. Add project-specific rules
4. Generate with fine-tuned template

---

## 💡 Tips for Success

**Visual Consistency:**
- Use the EXACT same Visual Bible for all prompts
- Don't modify it mid-project
- Generate all images with same AI tool (don't mix DALL·E + Midjourney)

**Quality:**
- Review first 10 images before continuing
- Regenerate if character design drifts
- Boss encounters deserve multiple attempts
- Take breaks between batches

**Efficiency:**
- Generate prompts for all pages at once
- Generate images in batches of 10-25
- Name files immediately: `page_id.png`
- Track progress in spreadsheet

---

## 📚 File Summary

| File | Size | Purpose | When to Use |
|------|------|---------|-------------|
| **QUICK_START.md** | 2 KB | Ready-to-use template | Every generation session |
| **TEMPLATE.md** | 5 KB | Full documentation | Reference/customization |
| **VISUAL_BIBLE_EXAMPLES.md** | 4 KB | Style library | Choose visual style |
| **COMPLETE_WORKFLOW_EXAMPLE.md** | 6 KB | Tutorial & guide | First time / troubleshooting |

---

## 🎮 Next Steps

1. **Read:** `COMPLETE_WORKFLOW_EXAMPLE.md` if this is your first time
2. **Choose:** Pick a Visual Bible from `VISUAL_BIBLE_EXAMPLES.md`
3. **Generate:** Use `IMAGE_PROMPT_GENERATOR_QUICK_START.md` with your JSON
4. **Create:** Generate images with your AI tool of choice
5. **Integrate:** Add images to your game!

---

## ✨ Example Results

**What you upload:**
```json
{
  "pages": {
    "dark_corridor": {
      "text": "A long stone corridor stretches into darkness..."
    }
  }
}
```

**What you get:**
```
PROMPT:
Studio Ghibli–inspired painterly anime horror illustration, cinematic 16:9, 
soft brushstrokes, muted colors, moody lighting. A black-haired girl and her 
loyal dog, consistent character design, atmospheric, subtle horror, no gore.
Long shot down a narrow stone corridor. The girl and dog walk away from 
camera, small in the frame. Damp walls glisten. Dark shadows stretch ahead. 
Oppressive atmosphere.
```

**What you generate:**
[A beautiful, consistent, game-ready image]

---

**Ready to create amazing game art? Start with QUICK_START.md!** 🚀
