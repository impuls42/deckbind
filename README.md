# Deckbind

A visual planning tool for mapping game actions to keyboard and Steam Deck inputs. Design your control scheme side-by-side before you ever open Steam's configuration UI.

> **Not** a runtime input tool — no device reading, no Steam integration. Deckbind is a documentation and planning aid.

## Features

- **Action Sets** — create named sets (e.g. *Gameplay*, *Menu*, *Vehicle*) and manage them independently; duplicate a set to start from an existing layout
- **Actions** — add/edit/delete in-game actions per set; bulk-paste from a newline-separated list (e.g. copied from a game manual)
- **Keyboard binding** — click keys on an ANSI 104-key schematic to bind; supports combo bindings (multiple keys held simultaneously) and alternate bindings per action
- **Steam Deck binding** — click buttons on a controller schematic to bind; supports mode shifts (hold a button to activate a secondary layer of bindings) and trackpad mode selection
- **Conflict detection** — highlights hard conflicts (identical bindings on two actions), subset conflicts (one binding is a subset of another), and unbound actions
- **Review table** — full `Action Set × Action × Keyboard × Deck` overview with inline conflict markers; export as JSON or copy as Markdown
- **JSON import / export** — save and restore an entire profile; schema is validated with Zod on import
- **localStorage persistence** — changes are saved automatically; reopen the tab and your work is still there

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Other commands

| Command | Description |
|---|---|
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across the project |

## How it works

### Core concepts

```
Profile
├── name, game
└── actionSets: ActionSet[]

ActionSet
├── id, name                          // e.g. "Gameplay", "Menu", "Vehicle"
├── actions: Action[]
└── bindings: {
      keyboard:       Record<actionId, string[][]>,
      deck:           Record<actionId, string[][]>,
      deckModeShifts: Record<inputId,  ModeShift[]>,
      deckTrackpadModes: { ltrackpad, rtrackpad }
    }

Action
├── id, name
├── type: "digital" | "analog" | "directional"
├── category?: string
└── description?: string
```

A **binding** is `string[][]`: the outer array holds alternate bindings (so an action can be triggered by *either* `Mouse1` *or* `Space`); the inner array holds inputs held simultaneously (`["kb.ctrl", "kb.shift", "kb.k"]`).

Bindings live on the **action set**, not the action itself — the same action can bind to different inputs in different sets.

### Input namespaces

Inputs are prefixed so conflicts between devices are trivially detectable.

**Keyboard** (`kb.*`) — letters, digits, modifiers (`kb.ctrl`, `kb.shift`, `kb.alt`, `kb.meta`), function keys, navigation keys, arrows, and mouse buttons/wheel (`kb.mouse_left`, `kb.wheel_up`, …). Mouse lives under `kb.*` because keyboard-mapped games pair keyboard and mouse together.

**Steam Deck** (`deck.*`) — face buttons (`deck.a`/`b`/`x`/`y`), bumpers and triggers (`deck.l1`/`r1`/`l2`/`r2`), back grips (`deck.l4`/`l5`/`r4`/`r5`), D-pad, stick clicks, trackpad clicks, and system buttons (`deck.steam`, `deck.menu`, `deck.view`, `deck.qam`).

### JSON schema

```json
{
  "version": "1.0",
  "profile": { "name": "Elden Ring", "game": "Elden Ring" },
  "actionSets": [
    {
      "id": "gameplay",
      "name": "Gameplay",
      "actions": [
        { "id": "attack", "name": "Attack", "type": "digital", "category": "combat" }
      ],
      "bindings": {
        "keyboard": { "attack": [["kb.mouse_left"]] },
        "deck":     { "attack": [["deck.r2"]] }
      }
    }
  ]
}
```

## Tech stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| State | Zustand (with `persist` middleware) |
| Validation | Zod |
| Icons | Lucide React |
| Schematics | Hand-authored SVG with `data-input-id` attributes |
