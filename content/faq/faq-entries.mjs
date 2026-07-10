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
 * Batch: 2026-07 dungeonmastron #2 (real AlsoAsked PAA harvest; seeds: branching
 * narrative design, how to make a CYOA game, interactive fiction writing, text
 * adventure game maker, Twine interactive fiction, using ChatGPT to make a game).
 * Added two themes: "Branching & story design" and "Making your own game".
 * Filtered hard against off-topic pedagogy/legal/consumer noise and deduped
 * page-level against batch #1 + the 4 cornerstone blog posts.
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
  "Branching & story design",
  "Interactive fiction & text adventures",
  "Twine & no-code tools",
  "AI storytelling",
  "Making your own game",
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

  // ═════════════════════════ BATCH 2026-07 dungeonmastron #2 ═════════════════════════

  // ───────────────────── Choose your own adventure ─────────────────────
  {
    slug: "do-choose-your-own-adventure-books-have-multiple-endings",
    question: "Do choose your own adventure books have multiple endings?",
    theme: "Choose your own adventure",
    answer:
      "Yes, choose your own adventure books have multiple endings, and that is the whole point of the format. A single CYOA book typically has anywhere from a handful to dozens of different endings, reached by the choices you make as you read. Some endings are triumphant, some are dead ends or quick failures, and the classic series was known for surprising, sometimes bleak conclusions. The exact number varies by book and author: shorter titles might have five or six, while denser gamebooks pack in twenty or more. Multiple endings are what give the format its replay value, since you can go back and pick differently to see where another path leads. If you want to plan your own set of endings, the [Visual Builder](/builder/) shows every branch and endpoint at once.",
    target: { href: "/builder/", label: "Map your endings in the builder" },
  },
  {
    slug: "what-was-the-first-choose-your-own-adventure-book",
    question: "What was the first Choose Your Own Adventure book?",
    theme: "Choose your own adventure",
    answer:
      "The first official Choose Your Own Adventure book was 'The Cave of Time' by Edward Packard, published by Bantam Books in 1979 as the launch title of the numbered series. Packard had written an earlier branching story, 'Sugarcane Island', in the mid-1970s, which is often credited as the concept's origin, but 'The Cave of Time' kicked off the famous line that sold millions of copies through the 1980s. Each book put the reader in the second person ('you') and ended sections with choices that jumped to different pages. The series popularized the whole idea of interactive, branching storybooks for young readers. That format still inspires digital story tools today, including browser [builders](/builder/) that handle the branching for you.",
    target: { href: "/builder/", label: "Try a modern branching builder" },
  },
  {
    slug: "who-invented-choose-your-own-adventure",
    question: "Who invented Choose Your Own Adventure?",
    theme: "Choose your own adventure",
    answer:
      "Choose Your Own Adventure was invented by Edward Packard, who came up with the branching-story idea in the late 1960s while making up bedtime tales for his daughters and letting them decide what happened next. He wrote 'Sugarcane Island' around 1969, though it was not published until 1976. The format became a phenomenon when Bantam Books launched the numbered Choose Your Own Adventure series in 1979, with Packard and R. A. Montgomery as its central authors. Montgomery later ran Chooseco, the company that still holds the trademark on the name. So the concept traces to Packard, and the brand grew through both writers. The branching approach they popularized is exactly what modern [visual builders](/builder/) let anyone create.",
    target: { href: "/builder/", label: "Build a branching story" },
  },
  {
    slug: "is-choose-your-own-adventure-copyrighted",
    question: "Is Choose Your Own Adventure copyrighted?",
    theme: "Choose your own adventure",
    answer:
      "'Choose Your Own Adventure' is a registered trademark, owned by Chooseco LLC, so you cannot use that exact phrase as the title or branding of your own game or book. The general concept of a branching, choice-based story is not protected, though: anyone can write and sell interactive stories where readers pick what happens next. That is why you see the same format described as a gamebook, interactive fiction, or a branching narrative rather than by the trademarked name. If you are making your own, just avoid marketing it as a 'Choose Your Own Adventure' product and you are on safe ground. Call it a branching story or a gamebook instead, and build it however you like, for example in a [visual builder](/builder/).",
    target: { href: "/builder/", label: "Build your own branching story" },
  },
  {
    slug: "difference-between-cyoa-and-rpg",
    question: "What is the difference between CYOA and RPG?",
    theme: "Choose your own adventure",
    answer:
      "The main difference is that a choose your own adventure (CYOA) is a branching story where you pick from set options, while a role-playing game (RPG) gives you a character to develop and usually involves stats, combat, and freeform decisions. In a CYOA, the author writes every path in advance and you navigate between them, so your agency is choosing which prewritten branch to follow. An RPG, whether tabletop or video game, lets you build a character, gain abilities, and often act in ways the designer did not script directly. The two overlap in gamebooks, which are CYOA stories with light RPG systems like hit points and dice. If you want branching choices without a rules engine, a [visual builder](/builder/) keeps it story-first.",
    target: { href: "/builder/", label: "Try story-first branching" },
  },

  // ───────────────────── Branching & story design ─────────────────────
  {
    slug: "what-are-the-two-types-of-branching-in-a-story",
    question: "What are the two types of branching in a story?",
    theme: "Branching & story design",
    answer:
      "The two types of branching usually described are open branching, where each choice leads to a permanently separate path, and foldback (or merging) branching, where paths split and then rejoin at key moments. Open branching gives the most freedom but multiplies the writing fast, since every choice doubles the content ahead. Foldback branching is the practical workhorse: you let readers make meaningful choices, then guide the branches back to shared scenes so the story stays manageable. Most real interactive stories mix both, branching wide at big moments and folding back elsewhere. Designers sometimes name specific shapes like the time cave, gauntlet, or branch-and-bottleneck, but they all come down to how much paths diverge versus reconnect. You can see the shape clearly by laying it out in a [node graph](/builder/).",
    target: { href: "/builder/", label: "See branches as a node graph" },
  },
  {
    slug: "what-is-a-branching-scenario",
    question: "What is a branching scenario?",
    theme: "Branching & story design",
    answer:
      "A branching scenario is an interactive exercise where you are given a situation, make a decision, and then see consequences that lead to different follow-up situations depending on your choice. It is the same structure as a choose your own adventure, but the term is most common in training and e-learning, where branching scenarios let people practice decisions (handling a customer, a safety call, a triage) in a safe space. Good branching scenarios feel realistic, give meaningful choices, and show honest outcomes rather than one obvious right answer. Because the mechanics are identical to interactive stories, the same tools that build branching fiction can build training scenarios. If you want to prototype one, a [visual builder](/builder/) lets you map each decision and outcome as connected nodes.",
    target: { href: "/builder/", label: "Prototype a branching scenario" },
  },
  {
    slug: "what-is-narrative-game-design",
    question: "What is narrative game design?",
    theme: "Branching & story design",
    answer:
      "Narrative game design is the craft of building a game's story so that it works together with play: shaping plot, characters, and world while deciding how player choices and actions affect what unfolds. It sits between writing and game design. A narrative designer decides where branches happen, how dialogue trees work, when the story reacts to what the player did, and how to keep it coherent across many possible paths. That is different from a traditional author, because the reader can act, so the writing has to account for choice and consequence. For a branching story, narrative design mostly means mapping the structure before writing prose, so paths connect and pay off. A [node-based builder](/builder/) makes that structural side visible while you plan.",
    target: { href: "/builder/", label: "Map structure in the builder" },
  },
  {
    slug: "how-to-write-a-branching-visual-novel",
    question: "How do you write a branching visual novel?",
    theme: "Branching & story design",
    answer:
      "You write a branching visual novel by planning the branch structure first, then writing scenes that connect through the choices you place at key moments. Start with a map: the opening, the major decision points, where paths diverge, and where they can merge back so the workload stays sane. Write each scene knowing which choices lead out of it and where they go. Because visual novels lean on art and presentation, keep track of which backgrounds and character states each path needs. Tools like Ren'Py are built specifically for visual novels, while a general branching-story tool works well for prototyping the structure. Mapping it visually first saves rewrites, so laying the branches out in a [node graph](/builder/) before you commit is worth the time.",
    target: { href: "/builder/", label: "Plan branches visually" },
  },
  {
    slug: "how-to-write-a-story-with-branching-choices",
    question: "How do you write a story with branching choices?",
    theme: "Branching & story design",
    answer:
      "You write a story with branching choices by mapping the structure before the prose: decide where the reader makes decisions, what each option leads to, and where paths can reconnect. Start small, with one central choice and a few outcomes, so you learn the discipline without drowning in branches. Make choices meaningful, so each option feels genuinely different rather than a fake pick that leads to the same place. Watch for dead ends and orphaned sections, and reuse merge points to keep the tree from exploding, since every branch is content you have to write. Test by walking every path start to finish. Building the map visually first, in a [node-based builder](/builder/), makes gaps and broken links obvious before you have written a word too many.",
    target: { href: "/builder/", label: "Draft the branch map" },
  },

  // ─────────────── Interactive fiction & text adventures ───────────────
  {
    slug: "difference-between-text-adventures-and-interactive-fiction",
    question: "What is the difference between text adventures and interactive fiction?",
    theme: "Interactive fiction & text adventures",
    answer:
      "The difference is mostly one of scope: 'interactive fiction' is the broad, modern umbrella term for any story you play through text and choices, while 'text adventure' usually refers to the older, parser-driven games where you type commands like 'go north' or 'take key'. Every text adventure is a form of interactive fiction, but interactive fiction also includes choice-based stories where you click options instead of typing, plus hybrids and experimental work. In casual use people treat the terms as near-synonyms, and that is fine. The practical distinction is input: 'text adventure' leans toward typed parser commands, 'interactive fiction' covers that plus click-based branching. You can play modern, choice-based examples in the browser on the [play](/play/) page.",
    target: { href: "/play/", label: "Play choice-based examples" },
  },
  {
    slug: "best-interactive-fiction-tools",
    question: "What are the best interactive fiction tools?",
    theme: "Interactive fiction & text adventures",
    answer:
      "The best interactive fiction tools depend on the kind of story you want to make, but the widely used ones are Twine, Inform 7, ink, and Ren'Py, plus browser-based builders. Twine is the popular starting point for choice-based branching stories and exports to HTML with no coding required for basics. Inform 7 and TADS are made for parser games where players type commands. ink, by Inkle, is a scripting language many narrative games use under the hood. Ren'Py targets visual novels. Dungeon Mastron's [Visual Builder](/builder/) is a no-code, node-graph option for branching stories. There is no single best, so pick based on whether you want parser input, click choices, or visuals, and how much you want to code.",
    target: { href: "/builder/", label: "Try the Visual Builder" },
  },
  {
    slug: "can-you-make-money-from-interactive-fiction",
    question: "Can you make money from interactive fiction?",
    theme: "Interactive fiction & text adventures",
    answer:
      "Yes, you can make money from interactive fiction, but for most creators it is modest rather than a living. Common routes are selling games on storefronts like itch.io or Steam, mobile choice-story apps that use in-app purchases, Patreon or Ko-fi support from readers, and commissioned or educational branching-scenario work. A few authors and studios do well, especially with polished mobile titles or long-running series, but the audience for text-forward interactive fiction is a niche, so realistic expectations matter. Many creators publish free work to build a following, then monetize a bigger or later project. If income is the goal, treat it like any small creative business: build an audience first, and be honest that early earnings are usually small. Playing and studying existing games on the [play](/play/) page is a good start.",
    target: { href: "/play/", label: "Study existing story games" },
  },
  {
    slug: "can-you-still-play-text-adventure-games",
    question: "Can you still play text adventure games?",
    theme: "Interactive fiction & text adventures",
    answer:
      "Yes, you can still play text adventure games, and there are more ways to do it now than ever. The classic titles like Zork and Colossal Cave Adventure are freely playable through browser emulators and interpreters, and archives like the Interactive Fiction Database catalog thousands of games you can download or run online. A whole community still releases new text-based and choice-based games every year, many of them free. Modern ones often run right in a browser, so you do not need old hardware or special software. Whether you want the original 1980s parser classics or fresh interactive fiction, they are all very much playable. You can try browser-based, choice-driven story games on the [play](/play/) page.",
    target: { href: "/play/", label: "Play in the browser" },
  },
  {
    slug: "what-made-zork-so-popular",
    question: "What made Zork so popular?",
    theme: "Interactive fiction & text adventures",
    answer:
      "Zork became popular because it combined a rich, explorable world with clever writing and a parser that understood more of what players typed than earlier games did. Created at MIT in the late 1970s and released commercially by Infocom in 1980, it let you explore the Great Underground Empire by typing commands, solving inventive puzzles and meeting memorable moments like the grue lurking in the dark. Its sharp, often funny prose and the sense of a real place to discover set it apart when graphics were still primitive, proving words alone could be gripping. Infocom's reputation for quality made it a landmark. Zork helped define interactive fiction, and its descendants still run in the browser on the [play](/play/) page.",
    target: { href: "/play/", label: "Play its descendants" },
  },
  {
    slug: "how-hard-is-it-to-make-a-text-adventure-game",
    question: "How hard is it to make a text adventure game?",
    theme: "Interactive fiction & text adventures",
    answer:
      "Making a text adventure game is easier than most people expect, especially a small one, because modern tools remove the need to program. With a choice-based tool you write scenes and link them with clickable options, so a short game can be built in an afternoon. The harder version is a parser game, where players type commands, which needs a tool like Inform 7 and more care to anticipate what people might type. The real difficulty is not technical, it is design: mapping branches, keeping paths consistent, catching dead ends, and writing tight, engaging prose. Start small, maybe fifteen to twenty-five scenes, and it stays very manageable. A no-code [builder](/builder/) lets you focus on the writing instead of the plumbing.",
    target: { href: "/builder/", label: "Start with a no-code builder" },
  },

  // ───────────────────────── Twine & no-code tools ─────────────────────────
  {
    slug: "how-does-twine-work",
    question: "How does Twine work?",
    theme: "Twine & no-code tools",
    answer:
      "Twine works by letting you write chunks of story called passages and link them together, then compiling everything into a single playable HTML file. You create a passage, type its text, and add links using a double-bracket syntax like [[go north->Cave]]; each link becomes a clickable choice that jumps the reader to that passage. Twine draws your passages as boxes connected by arrows, so you see the branching structure visually as you build. For basic branching stories you never touch code. If you want variables, conditions, or styling, Twine supports story formats like Harlowe and SugarCube that add scripting and a little HTML or CSS. The finished HTML runs in any browser and can be hosted or shared as a file. A [node-graph builder](/builder/) works on a similar visual principle.",
    target: { href: "/builder/", label: "Try a node-graph builder" },
  },
  {
    slug: "what-programming-language-does-twine-use",
    question: "What programming language does Twine use?",
    theme: "Twine & no-code tools",
    answer:
      "Twine does not require a programming language for basic stories, but under the hood its games are plain HTML, CSS, and JavaScript, and its story formats add their own lightweight scripting. When you build a simple branching story you only use Twine's linking syntax, with no real coding. If you want variables, logic, or custom styling, you write in the macro language of your chosen story format: Harlowe and SugarCube are the common ones, and SugarCube in particular lets you drop in JavaScript and CSS. Twine itself is built with web technologies, which is why every finished game exports as a self-contained HTML file that runs in any browser. So no language is needed to start, and web-standard scripting is available when you want more. A [node-based builder](/builder/) takes a similar no-code-first approach.",
    target: { href: "/builder/", label: "See a no-code-first builder" },
  },
  {
    slug: "how-to-get-started-with-twine",
    question: "How do you get started with Twine?",
    theme: "Twine & no-code tools",
    answer:
      "You get started with Twine by opening it, either the free browser version at twinery.org or the downloadable desktop app, and creating a new story. Twine drops you into a map view with one starting passage, so double-click it to write your opening scene. Add a choice by typing a link in double brackets, like [[Open the door->Hallway]], and Twine automatically creates a new passage called Hallway and draws an arrow to it. Keep writing passages and linking them, and your branching story takes shape visually. When you are done, use the publish option to export a single HTML file you can share or host. Start with a tiny three-choice story to learn the flow. If you prefer a drag-and-drop node graph, a [visual builder](/builder/) is a similar no-code route.",
    target: { href: "/builder/", label: "Try a drag-and-drop builder" },
  },
  {
    slug: "how-to-publish-a-twine-story",
    question: "How do you publish a Twine story?",
    theme: "Twine & no-code tools",
    answer:
      "You publish a Twine story by exporting it to a single HTML file, then hosting that file wherever you like. In Twine, open your story and choose 'Publish to File' (or the archive option in the desktop app), which produces one self-contained .html file containing the whole game. From there you have options: upload it to itch.io, which is the most popular home for Twine games, put it on your own web host or a service like Neocities, or simply share the file directly since it runs by double-clicking in any browser. itch.io is the common choice because it handles hosting, a game page, and even optional payments. No server or special software is needed, because the exported HTML is the finished, playable game. You can see how finished browser games play on the [play](/play/) page.",
    target: { href: "/play/", label: "See browser games play" },
  },
  {
    slug: "is-twine-good-for-beginners",
    question: "Is Twine good for beginners?",
    theme: "Twine & no-code tools",
    answer:
      "Yes, Twine is good for beginners, and it is one of the most recommended starting points for making interactive fiction. For a basic branching story you do not need any coding: you write passages and connect them with a simple link syntax, and Twine shows the structure as a visual map. That gentle on-ramp is why teachers, hobbyists, and first-time creators use it so often. The learning curve appears only when you reach for advanced features like variables, conditional passages, and custom styling, which involve a story format's scripting. Plenty of complete, well-loved games never go that far. So beginners can ship a finished game quickly and grow into the technical side later. A drag-and-drop [node builder](/builder/) is another beginner-friendly option to compare.",
    target: { href: "/builder/", label: "Compare a node builder" },
  },
  {
    slug: "can-twine-make-visual-novels",
    question: "Can Twine make visual novels?",
    theme: "Twine & no-code tools",
    answer:
      "Yes, Twine can make visual novels, though it is not purpose-built for them the way Ren'Py is. Because Twine outputs HTML, CSS, and JavaScript, you can add background images, character sprites, music, and styled text to create a visual-novel feel, especially using the SugarCube story format for more control. Some creators do exactly this and ship polished results. The trade-off is that you build the presentation layer yourself, whereas Ren'Py provides visual-novel features like character positioning, transitions, and a script format out of the box. So if visuals and voice are central, a dedicated tool may save time; if you want branching text with some added art, Twine handles it well. For pure branching stories, a [node builder](/builder/) is another route.",
    target: { href: "/builder/", label: "Try a branching node builder" },
  },
  {
    slug: "how-to-add-images-in-twine",
    question: "How do you add images in Twine?",
    theme: "Twine & no-code tools",
    answer:
      "You add images in Twine using a standard HTML image tag inside a passage, pointing either to an image hosted online with its full URL or to a file you package alongside your exported story. The simplest approach for a game you will host online is to upload your images somewhere (itch.io, your own host, or an image service) and reference their URLs, so the picture loads wherever the game runs. If you distribute the HTML file directly, keep the images in a folder next to it and use relative paths. Some story formats also offer macros for images, but the plain image tag works everywhere. Test the exported game to confirm the paths resolve. For a more visual, drag-and-drop approach, a [node builder](/builder/) shows scenes as cards.",
    target: { href: "/builder/", label: "See scenes as cards" },
  },

  // ───────────────────────────── AI storytelling ─────────────────────────────
  {
    slug: "can-chatgpt-build-a-game",
    question: "Can ChatGPT build a game?",
    theme: "AI storytelling",
    answer:
      "ChatGPT can help build a game, but it does not build one on its own; it is best as a coding and writing assistant that you direct. For a text or story-based game, ChatGPT is genuinely useful: it can draft scenes, invent choices, write dialogue, and even output a structured branching file if you prompt it clearly. For larger games it can write chunks of code, suggest mechanics, and help debug, though you still assemble everything in a real engine and fix what it gets wrong. Where it struggles is holding a big project consistent, because it loses track of earlier decisions and creates contradictions. So treat it as a fast collaborator, not an autopilot. For branching stories specifically, a structured prompt like the [AI Companion](/ai/) gets cleaner, more usable output.",
    target: { href: "/ai/", label: "Use the AI Companion template" },
  },
  {
    slug: "is-it-legal-to-make-a-game-with-ai",
    question: "Is it legal to make a game with AI?",
    theme: "AI storytelling",
    answer:
      "In general yes, it is legal to make a game using AI tools, but the copyright details are still unsettled, so a few cautions matter. Using AI to help write text, code, or art for your own original game is broadly fine, and many indie creators do it. The grey areas are that purely AI-generated work may not qualify for copyright protection in some places (like the US), meaning you might not be able to stop others copying it, and that you should avoid prompting AI to reproduce someone else's characters, art style, or trademarked material. Rules also vary by country and by each tool's terms of use. To stay safe, use AI as an assistant on original work, review what it produces, and check the tool's license. The [AI Companion](/ai/) is built for original branching stories.",
    target: { href: "/ai/", label: "See the AI Companion" },
  },
  {
    slug: "is-it-okay-to-use-ai-to-make-a-game",
    question: "Is it okay to use AI to make a game?",
    theme: "AI storytelling",
    answer:
      "Whether it is okay to use AI to make a game is mostly a question of how you use it and how honest you are about it, not a hard yes or no. Plenty of creators use AI to brainstorm, draft text, prototype code, or generate placeholder assets, and treat it as a tool like any other. Concerns come up around originality (leaning on AI so heavily the work loses your voice), disclosure (being upfront when AI made significant assets, which some communities and storefronts expect), and craft (AI output usually needs real editing to be good). Using it to copy a specific artist or author is where most people draw the line. Used as an assistant on your own ideas, with your judgment on top, it is widely accepted. A structured prompt like the [AI Companion](/ai/) keeps the story yours.",
    target: { href: "/ai/", label: "Keep the story yours" },
  },

  // ───────────────────────── Making your own game ─────────────────────────
  {
    slug: "how-much-does-it-cost-to-make-a-game",
    question: "How much does it cost to make a game?",
    theme: "Making your own game",
    answer:
      "Making a game can cost nothing or millions, and where you land depends entirely on scope. A solo-made text or story game can genuinely cost nothing: the main engines and tools (Twine, ink, Godot, plus free builders) are free, and you can use free or self-made art and sound, so your real spend is time. Costs start creeping in with optional extras: custom art or music, paid assets, a storefront fee (itch.io is free, Steam charges a one-time 100 dollars per game), and hosting. Small commercial indie games might run from a few hundred to a few thousand dollars, mostly on art and audio. Big studio titles reach the millions because of large teams and years of work. For a first branching story, a free [builder](/builder/) keeps the cost at zero.",
    target: { href: "/builder/", label: "Start for free" },
  },
  {
    slug: "can-i-make-a-game-by-myself",
    question: "Can I make a game by myself?",
    theme: "Making your own game",
    answer:
      "Yes, you can make a game by yourself, and plenty of finished, well-liked games are the work of one person. Solo development is most realistic for smaller, focused games: text and story games, puzzle games, and simple 2D titles are all very achievable alone, especially with no-code or beginner-friendly tools handling the hard technical parts. The main challenge is wearing every hat (writing, design, art, testing), so the trick is to keep the scope small and actually finish something rather than starting a huge project you cannot complete. Branching story games are one of the friendliest starting points for a solo creator, since one writer can build a whole game with words and choices. A no-code [builder](/builder/) removes the programming barrier entirely.",
    target: { href: "/builder/", label: "Build solo, no code" },
  },
  {
    slug: "do-i-need-to-know-how-to-code-to-make-a-game",
    question: "Do I need to know how to code to make a game?",
    theme: "Making your own game",
    answer:
      "No, you do not need to know how to code to make a game, thanks to a range of no-code and low-code tools. For story and text games, tools like Twine and browser-based builders let you write and link scenes with no programming at all. For visual games, engines like GameMaker, Construct, and Bitsy offer drag-and-drop or visual scripting so you build logic without writing raw code. You will hit a ceiling eventually, since deep, custom mechanics usually need at least some scripting. But for a first game, and for many complete published games, no-code tools are genuinely enough. If your idea is a branching, choice-based story, a no-code [visual builder](/builder/) gets you to something playable without a single line of code.",
    target: { href: "/builder/", label: "Make a game, no code" },
  },
];
