# Design Analysis & Implementation Notes

Educational study of the design *concepts* behind landonorris.com, and how each is
recreated from scratch with vanilla HTML/CSS/JS. No content, assets, colors, or
copy from the original are reproduced — only underlying, non-copyrightable
design patterns.

---

## 1. Overall layout structure

**Observed concept:** A cinematic, single-column narrative. Each section is a
full-bleed "scene": full-screen hero → personal statement → horizontally
scrolling photo strip → large split teasers linking to inner pages → a
hover-swap gallery grid → marquee of partner logos → oversized footer CTA.
Inner pages (On Track / Off Track / Partnerships / Calendar) repeat the same
scene grammar.

**Recreation:** Semantic `<section>` scenes stacked in `<main>`, each with a
shared `.section` spacing class. Multi-page structure: `index.html`,
`projects.html`, `about.html` sharing one nav/footer, one CSS file, one JS file.

## 2. Grid and spacing system

**Observed concept:** Generous whitespace with a wide content container;
full-bleed imagery breaks out of the container. Spacing scales are large
(section padding ≈ 8–12rem desktop) and collapse dramatically on mobile.

**Recreation:** CSS custom properties define a spacing scale
(`--space-1 … --space-7`) and a `--container` max-width. `clamp()` makes
section padding fluid so no media query is needed for spacing itself.
Grids use `display: grid` with `auto-fit/minmax` so cards reflow without
breakpoint bookkeeping.

## 3. Typography hierarchy

**Observed concept:** Enormous condensed display headings (viewport-filling
name in the hero), small uppercase "eyebrow" labels with wide letter-spacing,
and modest body text. Contrast in *scale* does the visual work.

**Recreation:** Two families — a heavy display face (Archivo Black) and a
technical body face (Space Grotesk), loaded from Google Fonts with system
fallbacks. Fluid type via `clamp()`, e.g. the hero name is
`clamp(3.5rem, 14vw, 12rem)`. Eyebrow labels: `text-transform: uppercase;
letter-spacing: 0.2em; font-size: 0.75rem`.

## 4. Color relationships (not the palette itself)

**Observed concept:** A dark, near-black base; one single electric accent
color used sparingly (highlights inside sentences, chips, hover states);
warm off-white text. Accent-on-dark creates the "energy".

**Recreation:** Same *relationship*, different palette: deep slate
(`--bg: #0e1116`), warm off-white ink (`--ink: #f2efe8`), and an original
mint-cyan accent (`--accent: #3ee6c4`) with a violet secondary
(`--accent-2: #8b7bff`). All colors live in `:root` custom properties.

## 5. Animation techniques

**Observed concepts & vanilla equivalents:**

- *Loading screen* — an overlay `<div>` with a CSS progress animation, faded
  out on `window load` then removed (`transitionend`) so it never blocks AT
  or clicks.
- *Text/image reveal on scroll* — elements start `opacity: 0; translateY`,
  and a `.is-visible` class (added by IntersectionObserver) transitions them
  in. Staggering uses `transition-delay` driven by a `--i` custom property.
- *Image "curtain" reveal* — a pseudo-element panel scales from `scaleX(1)`
  to `scaleX(0)` (transform-only ⇒ compositor-friendly).
- *Marquee strips* — duplicated content + infinite CSS
  `@keyframes marquee { to { translate: -50% 0 } }`.
- *Hover image swap* (gallery grid) — two stacked images, top one
  `opacity: 0` until `:hover`/`:focus-visible`; pure CSS.

## 6. Scroll interactions

**Observed concept:** A horizontal photo strip that advances as you scroll
vertically (scroll-jacking-lite), plus subtle parallax.

**Recreation:** A tall wrapper (`height: 300vh`) contains a
`position: sticky; top: 0` viewport. A passive scroll listener +
`requestAnimationFrame` computes progress (0–1) through the wrapper and sets
`translateX` on the track. No libraries, no `scroll-behavior` hacks, and it
degrades to normal vertical flow when JS is off. `prefers-reduced-motion`
disables all of it.

## 7. Navigation behavior

**Observed concept:** Minimal sticky top bar (logo + hamburger) that stays
out of the way; the menu is a full-screen overlay with oversized links and
imagery; nav gains a background once you scroll.

**Recreation:** `position: fixed` header; a scroll listener toggles
`.nav--scrolled` (adds blur + background). Hamburger `<button>` with
`aria-expanded` toggles a full-viewport overlay `<nav>`; links stagger in
with `transition-delay`; `Escape` closes; focus is trapped by moving focus
to the first link and restoring it on close. Body scroll locked with
`overflow: hidden`.

## 8. Responsive design strategy

**Observed concept:** Fluid-first (type and spacing scale continuously);
layout changes are few but decisive — multi-column scenes collapse to single
column, horizontal gallery becomes a natively swipeable strip.

**Recreation:** `clamp()` everywhere for fluid scaling; two real breakpoints
(`900px`, `600px`). On mobile the horizontal gallery falls back to
`overflow-x: auto` + `scroll-snap-type: x mandatory` — no JS needed.

## 9. Section organization

**Observed concept:** Hero (identity) → statement (voice) → proof
(gallery/results) → wayfinding (big teaser links) → collection grid →
credibility strip (partners) → CTA footer. It reads like a story arc.

**Recreation:** Same arc with original content: identity (name + program) →
engineering statement → build-log gallery → Projects/About teasers →
"Build Hall of Fame" project grid → toolbox (skills marquee) → contact CTA.

## 10. User experience patterns

**Observed concepts:** persistent "next event" chip in the hero, playful
loading copy, oversized clickable regions, captioned imagery
("Location, Year"), rotating-device notice.

**Recreation:** "Next build" chip linking to projects; loader with original
copy; whole-card link targets via a stretched-link pattern; captions follow
the same *format* ("Shop Floor, 2025") with original text; skip-link,
landmarks, `alt` text, visible focus states, and reduced-motion support for
accessibility.

---

## 11. Scroll-animation system (v2 additions)

Deeper study of the reference's motion stack (Lenis smooth scroll, GSAP
ScrollTrigger, SplitType line masking, Rive canvases) and the vanilla
recreation of each *concept*:

**Inertial scroll feel (Lenis).** Instead of hijacking the scrollbar, a
single `ScrollEngine` rAF loop lerps `window.scrollY` (`smoothY += (target −
smoothY) × 0.12`). Every scroll-driven effect reads the *smoothed* value, so
motion glides and settles with inertia while native scrolling (keyboard,
find-in-page, screen readers) stays untouched.

**Masked line reveals (SplitType).** `[data-split]` headings are split into
word spans, grouped into visual lines by `offsetTop`, and each line is
wrapped in an `overflow: clip` mask. Lines start at `translateY(115%)` and
slide up staggered by a `--li` custom property. Re-split on resize because
wrapping changes; runs after `document.fonts.ready` so measurements use the
final font.

**Parallax depth.** Two layers of it: whole elements drift at
`(elementCenter − viewportCenter) × speed`, and `[data-parallax-img]` images
drift *inside* clipped containers. The trick that makes this coexist with
hover-scale and curtain-reveal effects: parallax writes the CSS `translate`
property while transitions animate `transform` — independent channels, no
fighting. Images get `scale: 1.18` overscan (also its own property) so edges
never show.

**Layered hero (pinned-hero illusion).** Hero copy drifts at 0.35× scroll
and fades; the two background glows drift at 0.22× and 0.10× via custom
properties consumed by the pseudo-elements. Three speeds = depth.

**Velocity-aware effects.** The engine's per-frame velocity drives: marquee
speed and direction (ribbon follows scroll and accelerates with it) and a
clamped `skewX` on the horizontal gallery track (cards "lean" while moving).

**Scroll-driven theme flip.** The reference crossfades the page from dark
green to white mid-scroll. Recreation: sections marked
`data-theme-section="light"` are watched by an IntersectionObserver with a
`-45%` root margin band; while one occupies the middle of the viewport,
`body.theme-light` swaps the palette custom properties and a `transition` on
`background-color`/`color` handles the crossfade.

**Scroll progress bar.** JS-injected fixed bar, `scaleX` mapped to smoothed
scroll progress.

All v2 effects are skipped entirely under `prefers-reduced-motion` and
degrade gracefully without JS.

## 12. Video placements + luxe theme (v3)

**Palette (user-selected, used throughout):** deep navy `#24305E` base,
indigo `#374785` surfaces/lines, coral `#F76C6C` primary accent, pale gold
`#F8E9A1` secondary accent, light blue `#A8D0E6` secondary text — and the
mid-scroll theme flip now lands on a light-blue page (`#A8D0E6` bg, navy
ink). Typography moved to a luxurious pairing: Fraunces (variable serif)
display + Manrope body.

**Scroll-scrubbed cinema (`.vscrub`).** A 260vh wrapper pins a sticky
stage; scroll progress maps to `video.currentTime`, so footage plays
forward/backward with the scroll, plus a 0.84→1 scale ramp on the frame.
The placeholder mp4 is encoded with all-keyframes (`ffmpeg -g 1`) so seeks
are instant — encode real footage the same way.

**In-view reels (`data-video-inview`).** Video cards and full-width banners
play only while ≥35% visible (IntersectionObserver) and pause off-screen.
Placeholder loops are procedurally generated gradients in the site palette;
swap the `src` attributes for real footage.

All placeholder media (SVGs and MP4s) is generated, original, and
palette-matched. Reduced motion disables autoplay and scrubbing entirely.

## 13. Theme config + organic blob reveal (v4)

**One-place theming.** All colors live in the "THEME CONFIG" block at the
top of `style.css`: 8 site tokens plus 5 `--flip-*` tokens (the palette the
page crossfades to mid-scroll). Prebuilt themes — `royal` (default), `noir`,
`mint` — activate by adding `data-theme="noir"` to the `<html>` tag of each
page; copy a block to create your own. The scroll theme-flip automatically
follows whichever theme is active because `body.theme-light` reads the
`--flip-*` tokens instead of hard-coded colors.

**Organic blob hover reveal** (the reference's helmet-card move). Two
stacked images; the hidden one is masked by an organic blob SVG
(`assets/blob-mask.svg` — edit the path to change the shape). At rest
`mask-size` is `0%`; on hover/focus it grows to `340%`, so the second image
"melts" through the first in a liquid, non-rectangular way. A counter
`scale`/`rotate` on the image while the mask grows sells the organic feel.
`mask-*`, `scale`, and `rotate` are all independent properties, so the
effect coexists with the transform/translate systems. Keyboard users get
the same reveal via `:focus-within`. See it on the "Greatest Hits" cards.

## 14. Poster theme + fluid blob (v5)

**APEX theme (new default).** Inspired by modern F1 launch-poster art:
near-black with a green cast `#0b0f0e`, silver white text, racing teal
`#00d2be` accent, silver `#cfd8d6` secondary — and the mid-scroll flip lands
on the poster's light silver half. Display type returned to a poster-grade
block sans (Archivo Black, tight tracking). The previous navy/coral palette
lives on as `data-theme="royal"`. Giant cropped background words (`.bg-word`,
the poster's oversized "chassis code" type) sit behind the hero and CTA at
7% ink contrast and drift on parallax.

**Fluid blob reveal.** The Hall of Fame hover is now a living clip-path:
ten points on a circle get two layers of time-based sine noise (per-card
random phases), joined into a smooth closed Bézier loop and written to
`clip-path: path(...)` each frame. The blob center chases the cursor with
lerp lag, and its radius is driven by pointer speed — slow hover = small
peephole, fast sweep = the blob balloons open. The rAF loop only runs while
a card is hovered; the static CSS mask remains as the no-JS/reduced-motion
fallback, and keyboard focus reveals the full image.

The scroll progress bar was removed per feedback.

## 15. One-screen page end + light/dark mode (v6)

**Page end.** The final CTA and the footer now share one viewport: a
`.page-end` flex column is `min-height: 100svh`, the CTA fills the free
space with its content dead-center (`place-content: center`), and a
compacted footer sits at the bottom.

**Light/dark mode.** A header toggle (☾/☀) switches `.mode-light` on
`<html>`. Light mode adopts the active theme's `--flip-*` palette
site-wide, so all four themes get a matching light mode automatically. The
choice persists in `localStorage`; first visit follows
`prefers-color-scheme`; an inline head script applies the class before
first paint so there is no color flash.

## 16. Hero shrink sequence + scroll-drawn signature (v7)

Recreates the reference's signature set-piece (studied from screen
recording). The hero sits sticky inside a 220vh pin, giving it a scroll
timeline: first the copy lifts away while the ambient glows dim; then the
backdrop portrait shrinks from a full-bleed 35%-opacity wash into a small,
fully-opaque centered card (the "background shrinks and fades" moment);
finally a five-stroke signature draws itself over the card. Every stroke
has `pathLength="1"`, so scroll progress maps directly onto
`stroke-dashoffset` — the signature draws forward and un-draws backward as
you scrub. On load, the hero name "inks in": outlined via
`-webkit-text-stroke` first, then the fill floods in when the loader clears
(`html.is-loaded`), and the loader itself scales out like a lens. All of it
degrades to a static hero under reduced motion / no JS.

## 17. Site-wide blob + placeholder system (v8)

The fluid blob reveal now works on every media element, not just the
Greatest Hits grid: any `[data-blob]` host gets a hidden layer auto-built
at boot (image clone + accent tint via `mix-blend-mode: color`), revealed
through the same cursor-chasing, speed-reactive clip-path blob. Cloned
images inherit the exact parallax drift of the original, so the layers
stay pixel-aligned. Every placeholder slot is badged "PLACEHOLDER" via a
single deletable CSS block, and PLACEHOLDERS.md maps each slot to its file
with recommended crops/encodings.

## 18. Neon reveals · scroll slides · gradient background · two voices (v9)

**Neon box line reveals.** Every `[data-split]` line now gets the
reference's block-reveal: an accent panel wipes across the masked line
(grows from the left, exits right) while the text slides up beneath,
staggered per line.

**Scroll-position slide-ins.** `[data-slide="left|right|up"]` elements are
position-driven: their viewport progress maps (eased) onto offset +
opacity, so images and text glide into place exactly with the scrollbar
and glide back out when scrolling up. Applied to teasers, stats, cards,
project rows, timeline items and more.

**Scroll-gradient background.** The palette no longer snaps at the flip
section — JS writes a per-frame blend factor `--fm` from viewport
proximity to the `[data-theme-section]` band, and `color-mix(in oklab …)`
blends every token continuously. Works with all four themes and inverts
correctly in light mode.

**Two typographic voices.** `.fx` swaps highlighted words into an italic
Fraunces serif mid-sentence (the serif-inside-sans editorial mix from the
reference) — every accent word site-wide now speaks serif.

Also: the fluid blob reveal is scoped to the landing page only, and grids
were hardened for small screens (`minmax(min(…,100%),1fr)`, tighter teaser
and signature sizing under 600px).

## 19. Radial reveals + polish pass (v11)

**Radial text reveal.** `[data-radial]` headings split into words that swing
up into an arc — rotation grows with distance from the center word, lift
follows the curve (y ∝ d²), staggered outward from the middle. **Card fan:**
five archive cards pivot around a point far below (wide radius) and fan out
in lockstep with scroll progress, reversible.

**Polish pass.** Film-grain overlay (inline SVG turbulence, 5% opacity);
custom cursor (accent dot + lagging ring that swells over interactive
elements, fine pointers only); page-fade transitions between internal
pages; slim accent scrollbar; button sheen sweep; accent glow shadows on
lifted cards. All skipped under reduced motion / touch.

## Performance notes

- One scroll listener (passive) + one rAF loop guard; no per-frame layout reads
  outside rAF.
- IntersectionObserver unobserves elements after reveal (fire-once).
- Transform/opacity-only animations (compositor thread, no reflow).
- SVG placeholders: tiny, resolution-independent, no network weight.
- `defer`-loaded single JS file; no render-blocking scripts.
