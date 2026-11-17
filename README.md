# Solara Bay — An Open-World Crime Story

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/kazamisao/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/kazamisao/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

**Solara Bay** is an original open-world crime game in the browser: a sun-soaked
coastal city you explore on foot and by car, with traffic and pedestrians, cars
to steal and drive, a wanted level with police who respond, three story missions,
combat, a HUD with a minimap and a full-city map, a start screen and autosave —
all in static files, with synthesized WebAudio sound and music and no network
requests at all.

You are **Nia Reyes**, getaway driver. Developer **Marlo Venn** wants the
waterfront, and the forged deeds to prove it are moving through his people.
Run three missions for fixer **Rosa**: steal a car and move a witness
(*Borrowed Wheels*), lift the deeds from Harbor Depot (*Night Shift*), and stop
Venn's convoy on Bay Boulevard (*High Tide*). Between missions, free-roam the
city, grab cash drops, and stay out of the Solara Bay PD's way — or don't.

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies. `game/index.html` opens in desktop Chrome and
plays offline.

## Controls

- **WASD / arrows** — move on foot, drive
- **E** — enter a car, or steal one (the owner calls it in)
- **F** — punch, **mouse aim + click** — shoot
- **TAB** — full-city map, **P** — pause, **M** — mute, **Enter** — start mission

## Layout

- `game/` — the game: `index.html` plus one ES module per system under `src/`
  (`city`, `world`, `render`, `missions`, `police`, `vehicles`, `entities`,
  `combat`, `audio`, `particles`, `input`, `save`, `shots`, `config`, `random`)
- `screenshots/` — 4 real renders of the game (cover: the convoy chase)
- `main.ts` — hands the entry in: copies `game/` + `screenshots/` and writes
  `dossier.json` with the kit's `buildDossier`
- `tests/` — logic tests (`node --test tests/logic.test.mjs`)

Referral: `p5dwa49p` — https://make.fun/r/p5dwa49p
