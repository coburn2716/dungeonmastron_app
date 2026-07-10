/**
 * Dungeon Mastron FAQ "colony" pages (workspace SEO_COLONY_STRATEGY.md).
 *
 * Each entry becomes a static /faq/<slug>/index.html page: an easy People-Also-Ask
 * question answered in ~120 words, with the EXACT question in the title, URL slug,
 * single H1, and the beginning of the first sentence (which answers it directly).
 *
 * Batch: 2026-07 dungeonmastron #1 (agent-generated PAA-style questions around DM's
 * niches: choose your own adventure, interactive fiction, text adventures, Twine
 * basics, AI storytelling, DIY Raspberry Pi console, gamebook mechanics).
 *
 * RULES (do not break):
 * - NO EM-DASHES anywhere (Henrik's rule). Use spaced en-dashes ( – ) or rewrite.
 * - Answers must be honest. DM is a solo passion project in refinement; the console
 *   is BETA. Never claim users/traction. No corporate filler words.
 * - Never duplicate a query an existing blog post already targets. The 4 cornerstone
 *   posts (make-a-choose-your-own-adventure-game, twine-vs-dungeon-mastron,
 *   ai-text-adventure-generator, wounds-not-death-game-design) are complemented,
 *   not duplicated, by this batch.
 * - Keep the direct answer in the FIRST sentence.
 * - `target` is the money page each colony aims its authority at (managed by the
 *   Colony Command Center in flow-support-admin; manual override > allocator).
 */

export const THEME_ORDER = [
  "Choose your own adventure",
  "Interactive fiction & text adventures",
  "Twine & no-code tools",
  "AI storytelling",
  "DIY console & Raspberry Pi",
  "Gamebooks",
];

export const FAQ_ENTRIES = [
  // ───────────────────── Choose your own adventure ─────────────────────
  {
    slug: "how-do-choose-your-own-adventure-books-work",
    question: "How do choose your own adventure books work?",
    theme: "Choose your own adventure",
    answer:
      "Choose your own adventure books work by ending each short section with a decision that sends you to a different page, so the story branches based on what you pick. Instead of reading straight through, you might finish a section and choose to open the door (turn to page 40) or walk away (turn to page 8), and the paths split from there. Some branches loop back together, some dead-end, and several lead to different endings. The writer maps this as a tree or web of numbered sections before writing a word, because the structure is the hard part. Digital versions replace page-flipping with clickable links, which makes longer, more tangled branch maps practical. If you want to build one, the [Visual Builder](/builder/) lays the branches out as a node graph.",
    target: { href: "/builder/", label: "Build one in the Visual Builder" },
  },
  {
    slug: "what-is-a-branching-narrative",
    question: "What is a branching narrative?",
    theme: "Choose your own adventure",
    answer:
      "A branching narrative is a story that splits into different paths based on reader or player choices, so no two playthroughs have to be the same. Rather than one fixed sequence of events, the writer builds a map of nodes (scenes) connected by choices, where each decision leads somewhere different. Branches can diverge permanently, reconnect at key moments (a technique often called merging or the diamond), or loop. It is the backbone of choose your own adventure books, most narrative video games, and interactive fiction. The trade-off is workload: every branch is content someone has to write, so most authors reuse merge points to keep the tree from exploding. You can sketch a branching narrative visually in the [Visual Builder](/builder/).",
    target: { href: "/builder/", label: "Map a branching story visually" },
  },
  {
    slug: "how-many-endings-should-a-choose-your-own-adventure-have",
    question: "How many endings should a choose your own adventure have?",
    theme: "Choose your own adventure",
    answer:
      "A choose your own adventure should have as many endings as the story earns, but most work well with somewhere between 3 and 15. Fewer than three and the branching starts to feel pointless; far more and each ending gets too little attention to feel meaningful. Classic gamebooks often had dozens, many of them quick deaths, which readers found either fun or frustrating. A modern approach favors fewer, more distinct endings that each reflect a real path through the story. What matters more than the raw count is that endings feel connected to the choices that led there. Start with one satisfying ending per major branch, then add variations only where they genuinely add something. You can prototype the whole ending map in the [Visual Builder](/builder/).",
    target: { href: "/builder/", label: "Plan your endings in the builder" },
  },
  {
    slug: "can-you-make-a-choose-your-own-adventure-game-for-free",
    question: "Can you make a choose your own adventure game for free?",
    theme: "Choose your own adventure",
    answer:
      "Yes, you can make a choose your own adventure game for free with several tools, and you do not need to pay or install anything to start. Free options include Twine (open source, exports to HTML), ink by Inkle, and Dungeon Mastron's [Visual Builder](/builder/), which runs in your browser with no account required. All of them let you write branching stories and export or share them. What is usually not free is polish: custom art, audio, and hosting a large game can cost money, though plenty of finished games use only free assets. If your goal is to write and share a branching story without spending anything, the free tools are genuinely enough to ship a complete game.",
    target: { href: "/builder/", label: "Open the free Visual Builder" },
  },
  {
    slug: "how-long-does-it-take-to-write-a-choose-your-own-adventure",
    question: "How long does it take to write a choose your own adventure story?",
    theme: "Choose your own adventure",
    answer:
      "Writing a choose your own adventure story takes anywhere from an afternoon to several months, depending on how many branches and endings you plan. A short piece with one central choice and three endings can be drafted in a few hours. A full gamebook with dozens of interconnected sections is closer to writing a novel, because every branch is extra words plus the work of keeping them consistent. The structure usually takes longer than the prose: mapping which choice leads where, catching dead ends, and testing every path. A good first project is small, maybe 15 to 25 sections, which teaches the branching discipline without burning you out. Building the map visually first, in a tool like the [Visual Builder](/builder/), saves a lot of rewriting later.",
    target: { href: "/builder/", label: "Start small in the builder" },
  },
  {
    slug: "what-is-the-difference-between-linear-and-branching-stories",
    question: "What is the difference between linear and branching stories?",
    theme: "Choose your own adventure",
    answer:
      "The difference is that a linear story follows one fixed sequence of events for every reader, while a branching story splits into different paths based on choices, so different readers experience different versions. A novel or film is linear: the plot is the same each time. A choose your own adventure, most narrative games, and interactive fiction are branching: your decisions change what happens, which scenes you see, and how it ends. Branching adds replay value and a sense of agency, at the cost of much more writing, since every path is content someone has to create. Many stories mix both, staying mostly linear with a few branch points. If you want to try branching, you can map one visually in the [Visual Builder](/builder/).",
    target: { href: "/builder/", label: "Try branching in the builder" },
  },

  // ─────────────── Interactive fiction & text adventures ───────────────
  {
    slug: "what-is-interactive-fiction",
    question: "What is interactive fiction?",
    theme: "Interactive fiction & text adventures",
    answer:
      "Interactive fiction is a story you play by making choices or typing commands, where your input changes what happens next. It covers a broad family: classic parser games where you type 'go north' or 'take lamp', choice-based stories where you click options, and hybrids of the two. The common thread is that the reader is also a participant, steering the narrative rather than just following it. Interactive fiction has roots in 1970s text adventures and stayed alive through a dedicated community that still releases new work every year, much of it free. Modern tools make it approachable without programming. If you want to try building a branching, choice-based story, Dungeon Mastron's [Visual Builder](/builder/) is one no-code way in.",
    target: { href: "/builder/", label: "Build interactive fiction, no code" },
  },
  {
    slug: "difference-between-interactive-fiction-and-visual-novel",
    question: "What is the difference between interactive fiction and a visual novel?",
    theme: "Interactive fiction & text adventures",
    answer:
      "The main difference is emphasis: interactive fiction centers on text and player-driven choices, while a visual novel centers on illustrated scenes, character art, and a mostly-authored script with occasional choices. Visual novels lean heavily on visuals and sometimes voice, often presenting long stretches of story with just a few branch points, and they are strongly associated with anime-style art and Japanese origins. Interactive fiction tends to be more text-forward and can offer denser branching or parser input. The line blurs, though: a choice-based interactive story with art starts to look like a visual novel, and a visual novel with heavy branching looks like interactive fiction. Both are types of narrative game, just weighted differently between words and images. You can play text-forward examples on the [play](/play/) page.",
    target: { href: "/play/", label: "Play text-forward story games" },
  },
  {
    slug: "is-interactive-fiction-still-popular",
    question: "Is interactive fiction still popular?",
    theme: "Interactive fiction & text adventures",
    answer:
      "Interactive fiction is still active and quietly popular, though it is a niche rather than a mainstream category. Its community releases dozens of new games every year, the annual Interactive Fiction Competition has run since 1995, and choice-based storytelling reaches large audiences through mobile apps and narrative video games. What changed is the shape of it: fewer people type parser commands, and more play click-based branching stories on phones and in browsers. The tools got easier, which brought in writers who would never have coded a parser game. So interactive fiction is not the mass hobby it briefly was in the 1980s, but it is far from dead, and it is arguably easier to make and share now than ever. Browser [play](/play/) removed most of the old friction.",
    target: { href: "/play/", label: "Play in the browser" },
  },
  {
    slug: "what-is-a-text-adventure-game",
    question: "What is a text adventure game?",
    theme: "Interactive fiction & text adventures",
    answer:
      "A text adventure game is a game played mostly or entirely through text, where the story is described in words and you progress by making choices or typing commands. The earliest ones, like Colossal Cave Adventure and Zork, used a parser: you typed instructions such as 'open door' and the game responded. Later text adventures often use clickable choices instead, which is friendlier for new players. The appeal is imagination over graphics, since the pictures form in your head, and the low production cost, since one writer can build a whole world with words. Text adventures overlap heavily with interactive fiction and choose your own adventure stories. You can play browser-based examples on the [play](/play/) page.",
    target: { href: "/play/", label: "Play text adventures" },
  },
  {
    slug: "how-to-make-a-text-adventure-game-without-coding",
    question: "How do you make a text adventure game without coding?",
    theme: "Interactive fiction & text adventures",
    answer:
      "You make a text adventure game without coding by using a visual or choice-based tool that handles the logic for you, so you only write the story and connect the choices. Options include Twine, which links passages together, and Dungeon Mastron's [Visual Builder](/builder/), where you drag scenes as nodes and draw choices between them, then export a playable game. These tools turn your branches into working links or a game file without you writing a line of code. You still do the real work, writing the scenes and deciding where each choice leads, but that is authoring, not programming. For anyone who has a story idea but no development background, no-code builders are the fastest route to something playable.",
    target: { href: "/builder/", label: "Make one with no code" },
  },
  {
    slug: "what-was-the-first-text-adventure-game",
    question: "What was the first text adventure game?",
    theme: "Interactive fiction & text adventures",
    answer:
      "The first widely recognized text adventure game was Colossal Cave Adventure, written by Will Crowther around 1976 and expanded by Don Woods in 1977. It let players explore a cave system by typing short commands like 'go west' or 'take lamp', and it established conventions that shaped the whole genre. It directly inspired Zork, created at MIT in the late 1970s, which became one of the most famous early text adventures. These games ran on mainframes and early home computers long before graphics were practical, proving that words alone could build an immersive world. The lineage from Colossal Cave runs straight through to modern interactive fiction and choice-based story games, which you can still play in the browser on the [play](/play/) page.",
    target: { href: "/play/", label: "Play modern descendants" },
  },

  // ───────────────────── Twine & no-code tools ─────────────────────
  {
    slug: "do-you-need-to-know-how-to-code-to-use-twine",
    question: "Do you need to know how to code to use Twine?",
    theme: "Twine & no-code tools",
    answer:
      "No, you do not need to know how to code to use Twine for a basic branching story. You write passages of text and link them together with a simple double-bracket syntax, and Twine turns that into a playable HTML game. That covers a lot of interactive fiction on its own. Where coding helps is for advanced features: tracking variables (like an inventory or a health stat), conditional passages, and custom styling use Twine's scripting plus a little HTML or CSS. Many writers never touch that side and still ship complete games. So Twine is genuinely beginner-friendly for straightforward branching, and it scales up if you later want to learn the technical parts. It is one of several no-code-friendly ways to build a [choose your own adventure game](/builder/).",
    target: { href: "/builder/", label: "See a node-graph alternative" },
  },
  {
    slug: "what-can-you-use-twine-for",
    question: "What can you use Twine for?",
    theme: "Twine & no-code tools",
    answer:
      "You can use Twine to build branching, choice-based stories: interactive fiction, choose your own adventure games, text-based games, and nonlinear narratives that export as a self-contained HTML file. Writers use it for hobby games, game-jam entries, teaching material, interactive essays, and prototyping the branching structure of larger projects before building them elsewhere. Because the output is plain HTML and JavaScript, a finished Twine game runs in any browser and can be hosted anywhere or shared as a file. It handles simple stories with no code and more complex ones with variables and scripting. It is a widely used, free, open-source tool, and one of several good starting points for branching stories. Dungeon Mastron's [Visual Builder](/builder/) is another, node-graph based option.",
    target: { href: "/builder/", label: "Try the node-graph builder" },
  },

  // ───────────────────────── AI storytelling ─────────────────────────
  {
    slug: "can-ai-write-a-choose-your-own-adventure-story",
    question: "Can AI write a choose your own adventure story?",
    theme: "AI storytelling",
    answer:
      "Yes, AI can write a choose your own adventure story, and it is genuinely useful for drafting branches, but it needs a human editor. Tools like ChatGPT and Claude can generate scenes, invent choices, and even output a structured branching file if you prompt them carefully. What they struggle with is consistency across many branches: they lose track of which path the player took, forget earlier choices, and sometimes create dead ends or contradictions. So AI is best treated as a fast first-draft collaborator, not a hands-off author. You still map the structure, check that every branch connects, and rewrite for voice. Dungeon Mastron's [AI Companion](/ai/) is a prompt template built specifically to get cleaner, more playable branching output from a chatbot.",
    target: { href: "/ai/", label: "Use the AI Companion template" },
  },
  {
    slug: "how-to-use-chatgpt-to-make-a-text-adventure",
    question: "How do you use ChatGPT to make a text adventure?",
    theme: "AI storytelling",
    answer:
      "You use ChatGPT to make a text adventure by giving it a clear prompt describing the setting, tone, and the structure you want, then asking it to output scenes and choices in a consistent format. The trick is being specific: tell it how many choices per scene, whether to track items or stats, and to label each scene so branches can reconnect. Left to improvise, ChatGPT drifts, contradicts earlier scenes, and creates choices that lead nowhere, so you review and correct as you go. A structured prompt template makes a big difference in how usable the output is. Dungeon Mastron's [AI Companion](/ai/) is exactly that: a template that steers ChatGPT or Claude toward output you can drop into a working game.",
    target: { href: "/ai/", label: "Get the prompt template" },
  },

  // ─────────────────── DIY console & Raspberry Pi ───────────────────
  {
    slug: "can-you-build-your-own-handheld-game-console",
    question: "Can you build your own handheld game console?",
    theme: "DIY console & Raspberry Pi",
    answer:
      "Yes, you can build your own handheld game console, and a Raspberry Pi is the most common starting point for a DIY build. A typical project pairs a Raspberry Pi (or a smaller Pi Zero) with a small screen, a battery, some buttons, and a 3D-printed case, running software that plays games or emulators. Kits exist that bundle the parts, or you can source them separately and wire it yourself. It takes patience, basic soldering for some builds, and following a wiring guide, but it is a well-documented hobby with active communities. Dungeon Mastron has an experimental DIY [console](/console/) design along these lines for playing its story games, though that build is still in beta and not yet thoroughly tested on hardware.",
    target: { href: "/console/", label: "See the DIY console (beta)" },
  },
  {
    slug: "what-can-a-raspberry-pi-be-used-for-in-gaming",
    question: "What can a Raspberry Pi be used for in gaming?",
    theme: "DIY console & Raspberry Pi",
    answer:
      "A Raspberry Pi can be used for gaming as a retro emulation machine, a DIY handheld or arcade cabinet, a light desktop for browser and indie games, and a platform for homemade games. Its most popular gaming use is emulation: running classic console and arcade games through software like RetroPie. Makers also build custom handhelds, tabletop arcade cabinets, and dedicated single-game consoles around it, because it is cheap, small, and well-supported. It is not built for modern high-end 3D games, so expect retro, 2D, and text or story games rather than the latest big-budget titles. That makes it a natural fit for narrative and text-based games. Dungeon Mastron's DIY [console](/console/) uses a Pi to play choose your own adventure games from USB cartridges.",
    target: { href: "/console/", label: "Explore the Pi story console" },
  },
  {
    slug: "what-is-a-usb-game-cartridge",
    question: "What is a USB game cartridge?",
    theme: "DIY console & Raspberry Pi",
    answer:
      "A USB game cartridge is a game stored on a USB drive (or a device shaped like a cartridge with a USB connector) that you plug into a console to load and play that game. It is a modern, DIY-friendly take on the classic plug-in cartridge: instead of a custom chip, the game files live on standard USB storage, so anyone can make one by copying a game onto a stick. Hobby and homebrew consoles use this because it is cheap and simple, and it brings back the tactile feel of swapping physical games. Dungeon Mastron's DIY [console](/console/) uses exactly this idea: each story game lives on its own USB cartridge you slot in to play, though the hardware build is still in beta.",
    target: { href: "/console/", label: "See how the cartridges work" },
  },

  // ───────────────────────────── Gamebooks ─────────────────────────────
  {
    slug: "what-is-a-gamebook",
    question: "What is a gamebook?",
    theme: "Gamebooks",
    answer:
      "A gamebook is a printed or digital book you play rather than just read, making choices that send you to different sections and often rolling dice or tracking stats. The best-known examples are the Choose Your Own Adventure series (choice-only) and Fighting Fantasy (choices plus simple combat and character stats). You read a numbered section, reach a decision, and jump to whichever section your choice points to, building your own path through the story. Some gamebooks add light role-playing systems: hit points, inventory, skill checks. They were hugely popular in the 1980s and have a steady following today, both in print and as apps. Digital tools now make it easy to build your own, including browser [builders](/builder/) that handle the branching for you.",
    target: { href: "/builder/", label: "Build your own gamebook" },
  },
  {
    slug: "how-do-gamebooks-handle-combat",
    question: "How do gamebooks handle combat?",
    theme: "Gamebooks",
    answer:
      "Gamebooks handle combat with lightweight rules you resolve yourself, usually a mix of dice rolls, a couple of stats, and simple bookkeeping. The classic Fighting Fantasy system gives you Skill, Stamina, and Luck: you and the enemy each roll dice, add Skill, and whoever scores higher deals damage to the other's Stamina until someone drops. Other gamebooks use card draws, single rolls, or pure choice-based conflict with no dice at all. The design tension is keeping fights tense without turning the book into a spreadsheet, so most systems stay minimal. Some modern designs even drop death entirely in favor of setbacks that change the story instead. Dungeon Mastron leans that way, an approach explored in [this piece on wounds instead of death](/blog/wounds-not-death-game-design/).",
    target: { href: "/blog/wounds-not-death-game-design/", label: "Read: wounds, not death" },
  },
  {
    slug: "difference-between-gamebook-and-choose-your-own-adventure",
    question: "What is the difference between a gamebook and a choose your own adventure?",
    theme: "Gamebooks",
    answer:
      "The difference is mostly scope: 'choose your own adventure' refers to pure choice-based branching stories (and specifically the trademarked book series), while 'gamebook' is the broader term that also includes books with dice, stats, and combat. Every Choose Your Own Adventure book is a gamebook, but not every gamebook is choice-only. Fighting Fantasy, for example, is a gamebook with a full mini role-playing system, whereas the classic CYOA series was choices and endings with no rules. In casual use people treat the terms as interchangeable, and that is fine. If you are writing one, the practical question is not the label but whether you want pure choices or added game mechanics like inventory and health. Both are easy to prototype in a [visual builder](/builder/).",
    target: { href: "/builder/", label: "Prototype either in the builder" },
  },
];
