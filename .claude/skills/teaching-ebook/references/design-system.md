# Design system

This is what makes the output look intentional instead of templated. The base
is a refined dark "reading" theme; only the **accent** changes per volume.

## Palette (CSS variables, already in the template)

```
--bg:#13161b        deep charcoal background
--surface:#1b2027   raised reading cards
--surface2:#232b35  secondary surface
--ink:#e9e5d8       warm off-white body text
--muted:#8b94a3     secondary text
--faint:#5c6573     tertiary / axis labels
--line:#2c343f      hairline borders
--accent:#d4a657    the ONE accent — set per volume (see below)
```

Two functional colors for contrast/semantics when a topic needs a pair
(e.g. good/bad, up/down, true/false): `--pos:#26a69a` (teal-green) and
`--neg:#ef5350` (red). Use them only when the content is genuinely binary, not
decoratively.

### Per-volume accents (pick one; vary across a set so it reads as a spectrum)

```
gold     #d4a657
green    #26a69a
steel    #7fa8c9
violet   #b58bd4
copper   #d98a4f
```

Set `--accent` to the chosen value at the top of the file. Everything
accent-colored (kickers, active nav, Socratic buttons, the progress bar tail,
figure captions' highlights) follows automatically.

## Typography (system fonts only — no web fonts)

Three roles, each doing a job:

```
--serif:  Georgia, "Songti SC", "Noto Serif SC", serif   → titles + tutor voice
--sans:   -apple-system, "Segoe UI", "PingFang SC", ...   → body explanation
--mono:   ui-monospace, "SF Mono", Menlo, ...             → data, labels, eyebrows
```

- **Serif** for chapter titles AND the Socratic question text — the serif is the
  "voice of the teacher." Italic serif for the questions and poems.
- **Sans** for all body prose.
- **Mono** for eyebrows/kickers, facet chips, figure captions, axis labels,
  small UI — the "instrument/data" register.

Big display title ~60px serif; h2 ~33px; body ~17px/1.75. Generous line-height
and whitespace; reading column max-width ~720px.

## Layout

- Two-column: a **sticky left sidebar** (brand + chapter nav) and a centered
  reading column. On ≤880px the sidebar collapses to a horizontal scrolling
  strip at the top.
- A thin **reading-progress bar** fixed at the very top (accent gradient).
- A **cover** header with an eyebrow, large serif title + muted subtitle, and a
  mono meta line. Optionally a subtle radial accent glow.

## Components (all in the template — reuse, don't reinvent)

- `.kicker` — mono eyebrow above each h2 (accent colored).
- `.facet.what / .why / .gb / .hp` — the four colored chips that label each
  facet of a concept.
- `figure` + `figcaption` — a bordered card holding an inline SVG diagram and a
  mono caption (caption highlights in accent). Fades in on scroll.
- `.socratic` — the question card with click-to-reveal answer.
- `.connect` — a "connect to your work" callout (green header).
- `.poem` — centered italic-serif verse block with a mono label.
- `.divider` — hairline between sections.
- `.endcard` — the closing recap card.
- `.map` (optional) — a two-column table for the completeness map.
- `.shelf-nav` — the cross-volume nav strip (bookshelf / prev / next) for sets.

## Motion

Restrained and purposeful:
- Progress bar tracks scroll.
- Figures fade/slide in once when scrolled into view (IntersectionObserver).
- Socratic answers expand smoothly.
- Exactly **one** self-drawing animated figure per chapter (see diagrams.md).
- Respect `prefers-reduced-motion`: the template's media query disables
  transitions and shows animated figures in their final state. Never remove it.

## Anti-patterns

- No multiple competing accent colors; one accent per volume.
- No gradient-heavy, glassmorphism, or neon "dashboard" look — this is a
  *reading* surface.
- No emoji-as-decoration (a single 📚 on the bookshelf link is the limit).
- No external fonts/CDNs/images. Everything inline and self-contained.
