# Placeholder swap guide

Every media slot is badged "PLACEHOLDER" on the site. Replace the files
below with real photos/footage (keep the same filename, or update the
`src` in the HTML). When done, delete the "PLACEHOLDER BADGES" block at
the bottom of `style.css` (section 22) to remove the labels.

## Images (SVG placeholders — swap for JPG/WebP, ~1600px wide)

| Slot | File | Where |
|---|---|---|
| Hero backdrop (shrinks into card) | `assets/hero-portrait.svg` | index hero — best: portrait of you |
| Build-log gallery ×6 | `assets/gallery-1.svg` … `gallery-6.svg` | index horizontal scroll — 4:3 |
| Teaser panels ×2 | `assets/project-wing.svg`, `assets/about-1.svg` | index — wide crops |
| Greatest Hits cards ×4 (front) | `assets/project-*.svg` | index — square |
| Greatest Hits hover image ×4 | `assets/gallery-*.svg` (the `img.swap`) | index — square |
| Project pages ×6 | `assets/project-*.svg` | projects — 4:3 |
| About portrait | `assets/hero-portrait.svg` | about |
| About interstitial | `assets/about-2.svg` | about — wide |

## Videos (generated gradient loops — swap for real MP4/H.264)

| Slot | File | Notes |
|---|---|---|
| Scroll-scrubbed cinema | `assets/scrub-reel.mp4` | encode with `ffmpeg -g 1` (all keyframes) so scrubbing stays instant |
| Shop reels ×3 | `assets/loop-coral.mp4`, `loop-sky.mp4`, `loop-gold.mp4` | short muted loops, 4:5 crops look best |
| Projects banner | `assets/loop-coral.mp4` | 21:9 crop |
| About banner | `assets/loop-sky.mp4` | 21:9 crop |

## Signature

The five `<path>` strokes inside `index.html`'s `.signature` SVG are
placeholder handwriting. Sign on a tablet, export SVG, and paste your real
strokes in (keep `pathLength="1"` on each) — the scroll-draw works
unchanged.
