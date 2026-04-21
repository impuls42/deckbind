# Binding Visualizer — Task Definition

Visual constructor for planning game keybindings across keyboard (ANSI) and Steam Deck. **Not** a runtime binding tool — no input reading, no Steam integration. The deliverable is a planning/documentation aid for configuring Steam Deck custom layouts.

## Goal

Let the user:

1. Define a list of in-game actions, grouped into action sets.
2. Map each action to keyboard input(s).
3. Map each action to Steam Deck input(s).
4. Spot conflicts and review the full mapping side-by-side.
5. Export and re-import the whole thing as JSON.

## Scope

**In scope**

- Action set management (CRUD, duplicate)
- Action CRUD within a set, bulk paste import
- Keyboard binding (ANSI 104-key schematic, click-to-bind)
- Steam Deck binding (schematic blocks, click-to-bind)
- Combo bindings (unordered set of simultaneously-held inputs)
- Conflict detection as warnings (non-blocking)
- JSON import/export with schema version
- localStorage persistence

**Out of scope**

- Input reading / live device detection
- Layers (hold-to-activate overlays)
- Steam VDF parse or export
- Multiple profiles (single profile per session — can be swapped via JSON import)
- Trackpad/stick sub-modes (mouse vs joystick vs radial) — leave mode choice to Steam itself
- Sequence/timing combos
- Touchscreen bindings

## Core concepts

```
Profile
├── name, game
└── actionSets: ActionSet[]

ActionSet
├── id, name                          // e.g. "Gameplay", "Menu", "Vehicle"
├── actions: Action[]
└── bindings: {
      keyboard: Record<actionId, Binding[]>,
      deck:     Record<actionId, Binding[]>
    }

Action
├── id, name
├── type: "digital" | "analog" | "directional"
├── category?: string
└── description?: string

Binding = string[]                    // inputs held simultaneously, e.g. ["kb.ctrl", "kb.shift", "kb.k"]
```

Key decisions baked in:

- **Bindings live inside the action set**, not on the action. Same action can bind differently per set (the whole point of action sets).
- **A single binding is a combo of length 1.** No mode switch between "single key" and "combo" — the UX is uniform.
- **Action → device** maps to a list of bindings, allowing alternates (e.g. Attack = Mouse1 OR Space). Pending confirmation — see Open Questions.

## User flow

1. **Profile screen** — name, game, action sets list. Create / rename / delete / **duplicate** sets. Select one to drill in. Action set switcher persists across screens 2–4 as a segmented control in the header.
2. **Actions** (per set) — add / edit / delete, with bulk paste (newline-separated) for importing from a manual or wiki.
3. **Keyboard** (per set) — ANSI SVG on left, unbound-actions panel on right. Click an action → binding inspector opens. Add inputs via clicking keys on the SVG or picking from a searchable list. Inputs in the current binding are highlighted on the SVG.
4. **Deck** (per set) — same layout, schematic SVG.
5. **Review** — table: `ActionSet | Action | Keyboard | Deck`. Conflict highlights inline. Export / copy-as-markdown buttons here.

## Binding inspector UX

- Opens as a side panel when an action is selected.
- Shows current bindings for the active device as chips: `[Ctrl] + [Shift] + [K]`.
- "Add input" → click-to-add from schematic or list picker.
- "Add alternate binding" → appends another binding to the list.
- Remove input via X on chip; remove whole binding via row-level delete.
- Selecting an input on the schematic when an action is active = toggle that input in the current binding.

## Conflict detection

Scoped **per action set, per device** — different sets can legitimately reuse inputs.

| Level | Rule | Color |
|---|---|---|
| Hard | Two actions share the exact same binding (same input set) | Red |
| Subset | One binding is a subset of another (`[K]` vs `[Ctrl, K]`) | Yellow |
| Unbound | Action has no binding on this device | Gray |

Display as a collapsible "Issues" strip at the bottom of each binding screen, plus badges on affected actions in the unbound-actions panel.

## Input ID namespaces

Prefixed so conflicts are trivially detectable (same prefix + same suffix = same input) and mixed validators stay simple.

**Keyboard** (`kb.*`)

- Letters/digits: `kb.a` … `kb.z`, `kb.0` … `kb.9`
- Modifiers: `kb.ctrl`, `kb.shift`, `kb.alt`, `kb.meta`
- Whitespace/editing: `kb.space`, `kb.tab`, `kb.enter`, `kb.backspace`, `kb.escape`
- Arrows: `kb.arrow_up`, `kb.arrow_down`, `kb.arrow_left`, `kb.arrow_right`
- Function: `kb.f1` … `kb.f12`
- Navigation: `kb.home`, `kb.end`, `kb.page_up`, `kb.page_down`, `kb.insert`, `kb.delete`
- Mouse: `kb.mouse_left`, `kb.mouse_right`, `kb.mouse_middle`, `kb.mouse_4`, `kb.mouse_5`, `kb.wheel_up`, `kb.wheel_down`

Mouse lives under `kb.*` because keyboard-mapped games pair keyboard+mouse and the Deck schematic shouldn't render mouse inputs.

**Steam Deck** (`deck.*`)

- Face: `deck.a`, `deck.b`, `deck.x`, `deck.y`
- Bumpers/triggers: `deck.l1`, `deck.r1`, `deck.l2`, `deck.r2`
- Grips: `deck.l4`, `deck.l5`, `deck.r4`, `deck.r5`
- D-pad: `deck.dpad_up`, `deck.dpad_down`, `deck.dpad_left`, `deck.dpad_right`
- Sticks: `deck.lstick_click`, `deck.rstick_click`, (optionally `deck.lstick`, `deck.rstick` for analog actions)
- Trackpads: `deck.ltrackpad_click`, `deck.rtrackpad_click`, (optionally `deck.ltrackpad`, `deck.rtrackpad` for analog actions)
- System: `deck.steam`, `deck.menu`, `deck.view`, `deck.qam`

## JSON schema

```json
{
  "version": "1.0",
  "profile": {
    "name": "Elden Ring",
    "game": "Elden Ring"
  },
  "actionSets": [
    {
      "id": "gameplay",
      "name": "Gameplay",
      "actions": [
        {
          "id": "attack",
          "name": "Attack",
          "type": "digital",
          "category": "combat"
        }
      ],
      "bindings": {
        "keyboard": {
          "attack": [["kb.mouse_left"]]
        },
        "deck": {
          "attack": [["deck.r2"]]
        }
      }
    }
  ]
}
```

Binding shape is `string[][]`: outer array = alternate bindings, inner array = inputs held together. Validate on import with Zod or Ajv.

## Tech stack (recommended)

- **React + Vite + TypeScript**
- **Tailwind** for layout
- **Zustand** for state (or `useReducer` if scope stays small)
- **Zod** for schema validation on import
- **localStorage** for persistence (auto-save on change, debounced)
- Hand-authored **SVG** for both schematics, with each input as a `<rect>`/`<path>` carrying `data-input-id`. Single delegated click handler on the parent SVG — same DOM hooks power both click-to-bind and highlight-when-selected.

## MVP checklist

- [ ] Profile / action set CRUD + duplicate
- [ ] Action CRUD with bulk paste
- [ ] Keyboard ANSI SVG + click-to-bind + combo support
- [ ] Deck schematic SVG + click-to-bind + combo support
- [ ] Multiple-alternate bindings per action per device *(pending decision)*
- [ ] Conflict detection (hard + subset + unbound) with inline badges and issues strip
- [ ] Review table with export to JSON and copy-as-markdown
- [ ] JSON import with schema validation
- [ ] localStorage auto-save

## Open questions

1. **Multiple alternate bindings per action per device** — allow a list, or cap at one?
   - Impact: schema shape and inspector UI. A list is strictly more expressive; a cap is simpler.
   - Current plan assumes: list.

2. **Cross-set overlay markers** — when viewing one set's Deck map, dim-display what other sets bind to the same inputs?
   - Impact: meaningful UI complexity; useful for spotting reuse across sets.
   - Current plan assumes: **no** (can be added later without schema change).

## Stretch (post-MVP)

- Keyboard layout parameterization (ISO, JIS)
- Multiple profiles with switcher
- Steam VDF export
- Print-friendly view for use on the Deck while configuring Steam's own UI
- Diff view between two action sets
