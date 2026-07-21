# Placeholder swap guide

## Images — DONE (now live Unsplash photos)

All image slots are hotlinked from `images.unsplash.com` (free Unsplash
license, no attribution required). To swap any one for your own photo,
just replace its `src` URL in the HTML with your file. The original
abstract SVGs are still in `assets/` if you ever want them back.
To adjust size/crop, edit the URL params (`w=1600&q=80&fit=crop`).

Note: the About-page "portrait" and index converge image currently show
a Formula Student team stock photo — swap for a real photo of you when
you have one. The hero backdrop expects `assets/sunsetAcel.mov` (add
the file, it isn't bundled).

## Videos — still placeholders (badges only remain on these slots)

(generated gradient loops — swap for real MP4/H.264)

| Slot | File | Notes |
|---|---|---|
| Scroll-scrubbed cinema | `assets/scrub-reel.mp4` | encode with `ffmpeg -g 1` (all keyframes) so scrubbing stays instant |
| Shop reels ×3 | `assets/loop-coral.mp4`, `loop-sky.mp4`, `loop-gold.mp4` | short muted loops, 4:5 crops look best |
| Projects banner | `assets/loop-coral.mp4` | 21:9 crop |
| About banner | `assets/loop-sky.mp4` | 21:9 crop |

## Signature video (`assets/signature.mp4`)

Drop your handwriting clip in as `assets/signature.mp4` and the hero
switches to it automatically — scroll scrubs the playhead, so the pen
follows the wheel and un-writes when you scroll back up. If the file
isn't there, the drawn SVG signature is used instead. Nothing else to
change.

**Encode it with every frame a keyframe**, or scrubbing will stutter:

```
ffmpeg -i black_font_white_background.mp4 \
  -an -c:v libx264 -crf 20 -g 1 -pix_fmt yuv420p \
  -vf "scale=1280:-2" assets/signature.mp4
```

`-g 1` = all keyframes (instant seeking), `-an` = drop the audio.

**About the white background:** MP4/H.264 has no alpha channel, so the
white can't be removed inside the file. The CSS knocks it out with
blend modes instead — `invert` + `screen` in dark mode, `multiply` in
light mode (style.css §21). Result is floating ink with no white box,
and it works in every browser. True alpha video would mean shipping
two files (VP9/WebM for Chrome + HEVC-alpha MOV for Safari), which
isn't worth it for monochrome ink.

## Signature (SVG fallback)

The five `<path>` strokes inside `index.html`'s `.signature` SVG are
placeholder handwriting. Sign on a tablet, export SVG, and paste your real
strokes in (keep `pathLength="1"` on each) — the scroll-draw works
unchanged.
