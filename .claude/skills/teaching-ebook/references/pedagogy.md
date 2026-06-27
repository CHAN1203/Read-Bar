# Pedagogy: how to teach inside the ebook

The goal is *understanding that sticks*, not coverage. The method below is what
makes that happen. Apply it to every concept.

## 1. The Socratic spine: ask before telling

Never just lecture. For each meaningful idea, first pose a question, leave a
pause, and let the reader form a guess — then reveal the reasoning. A conclusion
the reader reached themselves is one they keep.

Implement with the **Socratic card** component (in the template): an eyebrow
tag ("想一想 / Think about it"), the question in italic serif (the tutor's
voice), and a button that expands the answer. Use 1 card per concept for simple
ideas, and a "synthesis" card at the end of each chapter that combines several
concepts into one harder question.

Write questions that have a *non-obvious but discoverable* answer — something the
reader can reason toward from what they just learned, where the answer reframes
or deepens the idea (a common misconception corrected, a "why is it actually the
opposite" twist, a connection to an earlier concept).

## 2. The four-facet treatment

Teach each concept by walking the same four facets, in order. Label them with
the colored facet chips (in the template). This trains the reader to interrogate
every idea the same way.

1. **What it is** (`what`) — a crisp definition in plain language.
2. **Why it works / the logic** (`why`) — the mechanism. *This is the most
   important facet.* Explain the underlying cause, not just the surface rule.
3. **Good vs bad** (`gb`) — what a strong/correct instance looks like versus a
   weak/wrong one. Concrete contrasts teach discrimination.
4. **When it's high-value** (`hp`) — the conditions under which the concept
   actually applies or pays off. Knowing *when not to* is as valuable as knowing
   *how*.

Not every concept needs all four every time, but default to all four. The "why"
and a Socratic card are the two non-negotiables.

## 3. Connect across chapters

Great teaching shows the reader that ideas are one web, not a list. Explicitly
link concepts: "this is the same moment as the X you saw in chapter 2", "notice
this is the mirror of Y". End each chapter by stating what it set up for the
next. Carry 2-3 "iron laws" or recurring principles through the whole work and
name them repeatedly.

## 4. "Connect to you" callouts (optional but powerful)

When the reader has their own project, code, or situation in play, add a
callout that maps the abstract concept onto *their* concrete thing ("this is
exactly what your `emaPBLong` line does"). It turns theory into something they
already half-own. Use the `.connect` component. Skip if there's no personal
anchor.

## 5. Poems and elevation

At an emotionally apt moment — usually the opening and the closing of a volume —
include a short **original** poem that captures the essence of the chapter's
idea metaphorically. It elevates the material and gives the reader a memorable
image. **Always write your own verse; never reproduce existing copyrighted
poems or lyrics.** Keep it short (4-10 lines), evocative, and tied to the
content (e.g., a poem about diminishing waves for a "three-push exhaustion"
concept).

## 6. Sequencing chapters and volumes

- **Within a volume:** foundations → core mechanics → advanced/edge cases.
  Each chapter assumes the previous. 3 chapters per volume is a good default;
  3-4 sections per chapter.
- **Across volumes (for a full curriculum):** order so each volume is a
  prerequisite for the next. Open each volume with a short "序 / preface" that
  recaps where we are and frames the new material, and a Socratic hook. Close
  each volume with a "what you can now do" recap, a forward-pointing question to
  the next volume, and (in the final volume) a **completeness map** — a table
  listing everything covered so the reader can confirm the knowledge is whole.

## 7. Tone

Warm, direct, a little playful. Treat the reader as smart and capable. Explain
*why* something matters rather than issuing rules. Use the tutor's serif voice
for questions and the body sans for explanation. Avoid jargon-without-definition
and avoid bullet soup — teach in real sentences.

## Section skeleton (per concept)

```
[kicker: chapter label]
## N.M  Concept name
[facet: what]   <p>definition…</p>
[figure]        ← a hand-drawn diagram (see diagrams.md)
[facet: why]    <p>mechanism…</p>
[socratic card] question → reveal
[facet: gb]     <p>good vs bad…</p>
[facet: hp]     <p>when high-value…</p>
[connect]       (optional) map to the reader's own thing
[divider]
```
