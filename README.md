# Dungeon Mastron

**Design worlds. Shape stories. Play the outcome.**

Dungeon Mastron is an open-source platform for creating story-driven,
choose-your-own-adventure style games — and playing them anywhere:

- 🌐 **Web Player** — play any Dungeon Mastron game in the browser, no installs
- 🧩 **Visual Game Builder** — build branching stories on a node graph, no code
- 🤖 **AI Companion** — a prompt template that turns ChatGPT/Claude into a game
  designer that outputs complete, playable `game.json` files
- 🕹️ **Physical Console (Beta)** — a DIY, 3D-printable Raspberry Pi console with
  USB cartridges. Same game files, played the old-fashioned way.

**Live site:** https://www.dungeonmastron.com

## Repo layout

```
public/        The static website + web player + builder + guides + example games
pi-console/    The Raspberry Pi console engine (console.py) + wiring guide
validator/     validate_dungeon_mastron.py — validates game.json files
```

## The game format

Games are single JSON files: pages, choices, dice actions, items, stats.
Failure wounds you instead of killing you — the story bends, it doesn't restart.
The same `game.json` runs in the web player and on the physical console.

See `public/guides/` for the full format reference and creation manual.

## License

MIT — see [LICENSE](LICENSE). Games you create are 100% yours.
Example game content is CC BY-NC-SA 4.0.

## Support the project

Dungeon Mastron is a passion project by [Artifextron](https://www.youtube.com/@artifextron).
If you enjoy it, you can support development via the donation link on the website.
