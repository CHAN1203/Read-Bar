# Reader data format (the app pipeline)

This skill can emit a book in **two shapes**:

1. **Standalone volume** — a self-contained `.html` (use `assets/template.html`).
   Best for a one-off lesson the user will open or share directly.
2. **Reader data** — a `book.json` rendered by the shared reader app
   (`assets/reader.html`). Best when the user has a *library* (more than one
   book) and wants highlighting, comments, search, and reading progress that
   work the same across every book. Choose this whenever the user is building a
   collection or asks for an "app".

This file documents shape #2: the JSON contract between the skill and the reader.

## Book object

```json
{
  "id": "pa1",
  "title": "读棒 · 第一卷 · 地基",
  "subtitle": "先学会读字母,才能读句子。",
  "accent": "#d4a657",
  "chapters": [ { "id": "c1", "label": "1.1 ...", "blocks": [ /* blocks */ ] } ]
}
```

- `id` — unique slug; used as the storage key for notes/progress.
- `accent` — the volume accent hex (see design-system.md palette).
- `chapters[].label` — what shows in the sidebar nav.

## Block types

Each block is `{ "t": "<type>", ... }`. The reader renders them in order.

| type | fields | notes |
|------|--------|-------|
| `kicker` | `text` | mono eyebrow above a heading |
| `h1` | `text` | volume title (usually once, in chapter 1) |
| `subtitle` | `text` | muted line under the title |
| `h2` | `text`, `sec` | section heading; `sec` is an anchor label |
| `lead` | `html` | emphasized intro paragraph |
| `p` | `html` | body paragraph (inline `<strong>`,`<em>` ok) |
| `facet` | `facet` (`what`\|`why`\|`gb`\|`hp`), `text` | the four-facet chip |
| `socratic` | `q`, `a` (array of paragraphs) | question card; `a` is the reveal |
| `figure` | `svg`, `caption` | static diagram; `svg` is a raw `<svg>…</svg>` string |
| `anim` | `svg`, `steps`, `caption` | declarative animation (below) |
| `poem` | `verse` (use `<br>`), `by` | original verse only |
| `connect` | `h`, `html` | "connect to you" callout |
| `hint` | `html` | dashed how-to box |
| `divider` | — | hairline |

Only `p`, `lead`, and `h2` text is highlightable by the reader — keep the real
teaching prose in those.

## Declarative animation

No bespoke JS needed. Author one `<svg>` whose step-revealed elements carry
`id="..."`, then list the reveal order:

```json
{ "t":"anim",
  "caption":"<b>Fig 1.2</b> read a bar step by step",
  "svg":"<svg viewBox='0 0 600 220'><line id='wick' .../><rect id='body' .../><text id='clab' ...>...</text></svg>",
  "steps":[
    {"ids":["wick"], "caption":"① the high/low extremes"},
    {"ids":["body"], "caption":"② the body = net result"},
    {"ids":["clab"], "caption":"③ the close = final score"}
  ]
}
```

The reader hides every step-referenced element, then fades them in one step at a
time, updates the caption, adds a replay button, autoplays on scroll, and honors
`prefers-reduced-motion` (shows the final state). Elements NOT referenced by any
step stay visible as scaffolding.

## How to produce a library

1. Emit one `book.json` per volume using the schema above.
2. Ship `assets/reader.html` alongside a `/books/` folder of those JSONs.
3. Register the books: either embed them in the reader's `BOOKS` object, or host
   the JSONs and have the reader `fetch()` a `books/index.json` list. The shipped
   `assets/reader.html` embeds two demo books and documents the fetch path in a
   comment — wire whichever fits.
4. Notes and reading progress are stored per `book.id` in `localStorage`, so they
   persist when the site is hosted or the file is opened directly (not in a
   sandboxed preview).

## When to use which shape

- One lesson, share-and-forget, maximum visual polish → **standalone volume**.
- A growing collection / "I want an app" / cross-book notes & search → **reader
  data + reader.html**. This is the scalable path; prefer it once there's more
  than one book.
