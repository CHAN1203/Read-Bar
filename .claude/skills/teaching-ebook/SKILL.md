---
name: teaching-ebook
description: >-
  Build beautiful, self-contained interactive teaching websites ("ebooks") that
  explain a topic from zero using the Socratic method, hand-drawn SVG diagrams,
  and self-drawing animations. Use this skill WHENEVER the user wants to teach,
  explain, or learn a subject as an interactive lesson, course, tutorial,
  explainer, study guide, curriculum, or "ebook" — including phrasings like
  "teach me X", "make a course/lesson/explainer on X", "turn this into an
  interactive guide", "I want to learn X systematically", "explain X step by
  step with visuals/animations", or "build a website that teaches X". Trigger
  even when the user doesn't say the word "ebook": any request for a polished,
  visual, animated, multi-section educational artifact about a topic should use
  this skill. Works for any subject (science, history, finance, math, code,
  crafts, etc.) and produces single-file HTML pages, optionally linked into a
  multi-volume site with a bookshelf index.
---

# Teaching Ebook

Produce a polished, self-contained interactive lesson website that teaches a
topic the way a great tutor would: by **asking before telling**, illustrating
every idea with a **hand-drawn diagram**, and using one **animated figure** per
chapter to make an abstract process click. The output is one or more standalone
HTML files (no build step, no external dependencies) that render directly in a
browser or the artifact viewer.

This skill encodes a method that consistently produces engaging, beautiful,
pedagogically sound material. Follow the method; don't reinvent it per request.

## When to use

Use whenever the deliverable is **explaining/teaching a topic visually and
interactively**. If the user just wants a plain summary in chat, a slide deck
(use pptx), or a Word document (use docx), this is not the skill. This skill is
for a *navigable, animated, browser-based lesson*.

## Two output shapes — pick first

This skill can deliver a lesson in either of two shapes. Decide up front:

- **A · Standalone volume** — one self-contained `.html` per volume (+ an
  optional bookshelf `index`). Maximum visual polish; best for a one-off lesson
  or a small fixed set the user opens/shares directly. Built from
  `assets/template.html` (and `assets/index-template.html` for a multi-volume
  hub).
- **B · Reader app (data-driven)** — emit each book as a `book.json` (a content
  data file) rendered by the shared reader app `assets/reader.html`. The reader
  gives **highlighting, comments, searchable/exportable notes, reading progress,
  and a library shelf** that work identically across every book. Choose this
  whenever the user is building a *collection*, says "app", or wants reader
  features like notes/search. This is the scalable path once there's more than
  one book. See `references/reader-format.md` for the JSON schema.

If unsure, ask: "one polished standalone lesson, or an app/library you'll keep
adding books to?" Default to A for a single topic, B for a collection.

## The required first step: read the references

Before writing any HTML/JSON, read the ones relevant to your chosen shape (they
are short and define the house style):

- `references/pedagogy.md` — how to structure the teaching: the four-facet
  treatment, Socratic question cards, "connect-to-you" callouts, poems,
  completeness maps, and how to sequence chapters and volumes. (Both shapes.)
- `references/design-system.md` — the exact palette, typography roles, spacing,
  and components. This is what makes the output look intentional rather than
  templated. (Both shapes.)
- `references/diagrams.md` — how to author the hand-drawn SVG figures and build
  the one self-drawing animation per chapter (with reduced-motion fallback).
  (Both shapes; for shape B animations are declared as data.)
- `references/reader-format.md` — the `book.json` content-data schema and the
  declarative figure/animation format. (Shape B only.)

Then start from the matching asset: `assets/template.html` (shape A single
volume), `assets/index-template.html` (shape A bookshelf hub), or
`assets/reader.html` + `assets/sample-book.json` (shape B reader app + example
data).

## The workflow

1. **Scope it.** Decide: one volume or several? A single rich lesson is one
   file. A full from-zero curriculum is several volumes + a bookshelf index.
   Pick a chapter outline that goes from foundations to advanced, where each
   chapter builds on the last. If the user gave a topic but no outline, propose
   a 3-chapter outline per volume and confirm or proceed.

2. **Pick the accent.** Choose ONE accent color per volume from the palette
   (see design-system). The base dark theme stays fixed; only the accent varies.
   A multi-volume set uses a different accent per volume so the set feels like a
   spectrum.

3. **Copy the template** to the output path and fill it in. Keep ALL of the CSS
   and the JS toolkit at the bottom intact — they provide the progress bar,
   sticky chapter nav, Socratic reveal, scroll-reveal, the diagram renderer, and
   the animation runner. You replace the *content* (cover, sections, figures,
   poems), not the machinery.

4. **Teach each concept with the four-facet treatment** (what → why → good/bad →
   when high-probability), woven with at least one Socratic question card and
   one hand-drawn figure. See pedagogy.md.

5. **Author the figures.** Every concept gets a diagram. One figure per chapter
   is the *animated* signature figure (self-drawing, with a replay button). See
   diagrams.md.

6. **Add an original poem** at an elevating moment (the intro and/or the closing
   of a volume). Write your own — never reproduce copyrighted verse.

7. **For multi-volume sites:** build each volume file, then the index hub, then
   add the cross-volume nav strip to each volume's sidebar (bookshelf / prev /
   next). Tell the user to keep all files in one folder with the given names so
   the links resolve.

8. **Present** the file(s) with `present_files`. For a site, present the index
   first. Tell the user that in the artifact viewer cross-file links may not
   resolve, but downloading all files into one folder makes it a working site.

## Output conventions

- **One self-contained `.html` per volume.** All CSS and JS inline. No CDNs, no
  build step, no external fonts (use system font stacks). No localStorage.
- **File naming for a set:** `<slug>_index.html`, `<slug>_vol1.html`, … so the
  relative links in the templates work unchanged.
- **Accessibility is non-negotiable:** keep the `prefers-reduced-motion` block
  (animations collapse to their final state), real `<button>`s for interactions,
  and visible focus styles. The templates already include these — don't remove
  them.
- **Mobile:** the templates are responsive (sidebar collapses to a top strip).
  Keep the media queries.

### When working inside the `readbar` project (dynamic bookshelf)

The top-level `readbar/index.html` is a **manifest-driven shelf** — it has no
hardcoded book cards. To make a new book appear on it, do BOTH:

1. Put the book's self-contained files in their own folder `readbar/books/<id>/`
   (folder per book). A standalone-HTML book keeps its own `reader.css`/`reader.js`
   in that folder; a data-driven book keeps its `book.json` + `reader.html` there.
2. Append one entry to `readbar/books/library.json` →
   `{ "id", "title", "subtitle", "category", "accent", "href" }`, where `href` points
   at that book's entry page (e.g. `books/<id>/index.html` or `books/<id>/reader.html`).
   `category` drives the shelf's top filter chips (built dynamically from the distinct
   categories present) — reuse an existing category name to group, or use a new one to
   add a chip. Keep it short (e.g. 交易 / 科学 / 技术).

Do NOT edit `readbar/index.html` to add a card — registering in `library.json` is
what makes the book auto-appear. The existing 读棒 book lives in `books/du-bang/`.

3. 新书的每个阅读页 `<head>`(在 `reader.css` link 之后)应带一段 pre-paint 设置脚本:读取
   `localStorage["readbar:settings"]` 并把 `--reader-fs`/`--reader-lh`/`--reader-measure` +
   `data-font` 写到 `document.documentElement`,以继承全站阅读设置且开页不闪烁:
   ```html
   <script>(function(){try{var s=JSON.parse(localStorage.getItem("readbar:settings")||"{}"),r=document.documentElement;if(s.fs)r.style.setProperty("--reader-fs",s.fs+"px");if(s.lh)r.style.setProperty("--reader-lh",s.lh);if(s.measure)r.style.setProperty("--reader-measure",s.measure+"px");if(s.font)r.setAttribute("data-font",s.font);}catch(e){}})();</script>
   ```

## Quality bar (what "good" looks like)

- It opens with a clear, warm "how to use" that explains the Socratic pauses.
- Every concept makes you *think first*, then reveals the reasoning.
- Every concept has a diagram; the chapter's signature animation actually
  clarifies a process (not decoration).
- The prose explains *why*, not just *what*, and connects ideas across chapters
  ("this is the same time as the H2 you saw earlier").
- It looks deliberate: restrained palette, one accent, distinct type roles, lots
  of breathing room. Not a generic Bootstrap-looking page.
- It ends by tying the chapters together and pointing forward.

## Common pitfalls to avoid

- **Don't** scatter many small animations/effects; one orchestrated animated
  figure per chapter beats ten twinkling ones.
- **Don't** drop the Socratic step and just lecture — the "think, then reveal"
  pause is the core of the method.
- **Don't** use external libraries, web fonts, or images you can't generate;
  author diagrams as inline SVG so the file is fully self-contained.
- **Don't** over-format prose with heavy bolding and bullet soup; teach in real
  sentences, use the facet labels and cards for structure.
- **Don't** reproduce copyrighted text, lyrics, or poems; write original verse.

## Packaging

When finished and the user is happy, this skill folder can be packaged into a
`.skill` file for installation (the skill-creator's `package_skill.py` does
this).
