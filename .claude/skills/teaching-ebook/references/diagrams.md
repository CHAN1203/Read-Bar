# Diagrams and animation

Every concept gets a hand-drawn figure. Teaching diagrams are inherently
subject-specific, so **author the SVG yourself** for each topic — but follow the
house style below so they feel like one coherent set, and use the small helper
toolkit (in the template's script) for the repetitive parts.

## House style for figures

- Draw inside a `figure` card; add a mono `figcaption` that states the takeaway
  (caption's bold text is accent-colored). The card fades in on scroll
  automatically.
- Use an SVG with a `viewBox` (e.g. `0 0 720 240`) and `width:100%`. Keep one
  clear idea per figure.
- Colors: use `--accent` for the focal/insight element, `--pos`/`--neg` only for
  genuine binaries, `--muted`/`--faint` for context, `--ink` for labels.
- Label with small mono `<text>`. Point at things with short connector lines.
  Prefer 2-4 annotations over a cluttered scene.
- Numbers/units in mono. Keep stroke widths ~1.4-2. Rounded corners (rx ~1.5).

## The toolkit (available in the template script)

These helpers cover most non-bespoke needs. Read them in the template and call
them; for anything they don't cover, write raw SVG.

- `svgScene(host, viewBox)` → creates and appends an `<svg>`, returns it.
- `el(tag, attrs)` → namespaced SVG element factory.
- `box(svg, {x,y,w,h,label,color})` → a labeled rounded rectangle (good for
  states, steps, components, concept nodes).
- `arrow(svg, {x1,y1,x2,y2,color,dashed})` → a connector with an arrowhead
  (good for flows, cause→effect, sequences).
- `note(svg, {x,y,text,color,anchor})` → a mono text label.
- `series(svg, {points, color, kind})` → a simple line or bars mini-chart for
  quantitative ideas (`kind:"line"|"bars"`). Auto-scales.

Author bespoke `<rect>`/`<line>`/`<path>`/`<text>` directly when the subject
needs a specific picture (a cell, a circuit, a map, a candlestick, a sentence
tree, etc.). The toolkit is a convenience, not a constraint.

## The one animated figure per chapter

Each chapter has exactly **one** signature figure that *draws itself* in
sequence to reveal a process step by step. This is the single most engaging
element — use it for the chapter's most important dynamic idea (a process
unfolding, a structure forming, a cause producing an effect over time).

Build it with `animateSequence`:

```js
// host: the container div  (e.g. <div data-anim="myAnim">)
// returns a play() function; wire it to a replay button and autoplay on scroll
const play = animateSequence(host, {
  build(svg, ctx){
    // draw all elements; return the ones to reveal in order, as "steps":
    // each step is { els:[...svgNodes], caption:"what this step shows" }
    // also draw any always-visible scaffolding directly on svg.
    return [
      { els:[node1, arrowA], caption:"① first this happens" },
      { els:[node2],          caption:"② then this" },
      { els:[node3, arrowB], caption:"③ and finally this" },
    ];
  }
});
```

`animateSequence` handles: staggered reveal of each step (fade/translate or
stroke-draw), updating a small caption line, a **replay** button, autoplay when
scrolled into view (once), and the **reduced-motion fallback** (everything shown
immediately). Two reveal modes are supported per element via a `draw` flag:
opacity reveal (default) or self-drawing strokes (set on `<path>`/`<line>`
elements, animated via stroke-dashoffset).

Wire the replay button with `data-replay="myAnim"` matching the host's
`data-anim="myAnim"`.

### Good animation choices by subject (examples)

- A process/cycle: reveal each stage of the cycle in turn (water cycle, cell
  division phases, a request→response flow).
- A structure forming: draw each part as it's added (a three-push pattern, a
  bridge truss, a sentence parse tree).
- Cause→effect over time: reveal the trigger, then the consequence, then the
  feedback (a price reversal, a chemical reaction, a market trap).
- A build-up that resolves: stack contributions then show the result (an
  equation assembling, forces summing, a proof's steps).

Pick the chapter's most "it finally clicks when you see it move" idea.

## Reduced motion

The template's `@media (prefers-reduced-motion: reduce)` block disables
transitions and `animateSequence` shows the final state immediately. Always keep
this — some readers need it, and it keeps the figure correct even without motion.
