/* ============================================================
   THANH DIEP — PORTFOLIO  ·  script.js  (v2)
   Vanilla ES6+. No libraries.

   NEW in v2 — scroll-animation system inspired by the smooth-
   scroll (Lenis) + scroll-trigger (GSAP) patterns studied on
   the reference site, rebuilt from scratch:

   ScrollEngine   — one rAF loop that lerps scroll position.
                    Everything scroll-driven reads the SMOOTHED
                    value, so motion has inertia ("Lenis feel")
                    WITHOUT hijacking native scrolling.
   SplitText      — headings split into lines, each line masked
                    (overflow clip) and slid up on reveal.
   Parallax       — depth: elements drift at different speeds.
                    Uses the CSS `translate` property so it can
                    coexist with `transform` transitions (hover
                    scale, curtain reveals) without fighting.
   HeroDrift      — hero content + background glows move at
                    different rates as you scroll away = depth.
   HScroll        — horizontal gallery now lerped + velocity
                    skew for a "dragged" feel.
   MarqueeDrive   — marquee speed reacts to scroll velocity and
                    follows scroll direction.
   SectionThemes  — dark→light page theme crossfade as a marked
                    section crosses the viewport (like the
                    reference's mid-page color flip).
   ScrollProgress — thin accent bar showing page progress.

   Performance rules:
   - one rAF loop; all writes are transform/opacity/translate
     (compositor-friendly), all layout reads are cached and
     refreshed only on resize
   - passive listeners; IntersectionObservers fire once
   - everything honors prefers-reduced-motion
   ============================================================ */

'use strict';

const REDUCED_MOTION = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/* ------------------------------------------------------------
   SCROLL ENGINE
   Lerps window.scrollY each frame. Subscribers receive
   (smoothY, velocity). This is how we get inertial, "smoothed"
   scroll effects without taking over the scrollbar (better for
   accessibility than real scroll-jacking).
   ------------------------------------------------------------ */
const ScrollEngine = (() => {
  const subs = [];
  const LERP = 0.12;           // lower = floatier
  let smoothY = window.scrollY;
  let running = false;

  const loop = () => {
    const target = window.scrollY;
    const prev = smoothY;
    smoothY += (target - smoothY) * LERP;
    if (Math.abs(target - smoothY) < 0.05) smoothY = target;
    const velocity = smoothY - prev; // px per frame (signed)
    for (const fn of subs) fn(smoothY, velocity);
    requestAnimationFrame(loop);
  };

  return {
    /** Register a per-frame callback: fn(smoothY, velocity) */
    add(fn) {
      subs.push(fn);
      if (!running) {
        running = true;
        requestAnimationFrame(loop);
      }
    },
  };
})();

/** Debounced resize helper shared by the cached-measurement modules. */
const onResize = (() => {
  const fns = [];
  let t;
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(t);
      t = setTimeout(() => fns.forEach((f) => f()), 150);
    },
    { passive: true }
  );
  return (fn) => fns.push(fn);
})();

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* ------------------------------------------------------------
   1. LOADER (unchanged from v1)
   ------------------------------------------------------------ */
function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  document.body.classList.add('no-scroll');
  const dismiss = () => {
    loader.classList.add('is-done');
    // triggers CSS entrance animations (hero name ink-fill, etc.)
    document.documentElement.classList.add('is-loaded');
    document.body.classList.remove('no-scroll');
    loader.addEventListener('transitionend', () => loader.remove(), {
      once: true,
    });
  };
  if (document.readyState === 'complete') dismiss();
  else {
    window.addEventListener('load', dismiss, { once: true });
    setTimeout(dismiss, 4000); // never trap the user
  }
}

/* ------------------------------------------------------------
   2. STICKY NAV (unchanged)
   ------------------------------------------------------------ */
function initStickyNav() {
  const header = document.getElementById('header');
  if (!header) return;
  let ticking = false;
  const update = () => {
    header.classList.toggle('nav--scrolled', window.scrollY > 40);
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}

/* ------------------------------------------------------------
   3. OVERLAY MENU (unchanged)
   ------------------------------------------------------------ */
function initOverlayMenu() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('menu');
  if (!toggle || !menu) return;
  const firstLink = menu.querySelector('a');
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('no-scroll', open);
    if (open) firstLink?.focus();
    else toggle.focus();
  };
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  toggle.addEventListener('click', () => setOpen(!isOpen()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false);
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
}

/* ------------------------------------------------------------
   4. SPLIT-TEXT LINE REVEALS
   Recreates the reference's masked-line technique:
   1. split element text into word <span>s (existing inline
      elements like <span class="hl"> are treated as one word)
   2. measure offsetTop of each word to detect natural lines
   3. wrap each line in .split-line (overflow: clip) with an
      inner element that starts translated below the mask
   CSS slides each line up (staggered by --li) when the reveal
   observer adds .is-visible.
   Re-splits on resize because line wrapping changes.
   ------------------------------------------------------------ */
function initSplitText() {
  const targets = document.querySelectorAll('[data-split]');
  if (!targets.length || REDUCED_MOTION) return;

  const split = (el) => {
    // Restore original markup (needed on re-split after resize)
    if (el.dataset.splitOriginal) el.innerHTML = el.dataset.splitOriginal;
    else el.dataset.splitOriginal = el.innerHTML;
    el.classList.remove('reveal'); // split animation replaces the fade

    // Pass 1: wrap every word in a span (keep inline elements whole)
    const words = [];
    const wrapNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of node.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
          else {
            const w = document.createElement('span');
            w.className = 'split-word';
            w.textContent = part;
            words.push(w);
            frag.appendChild(w);
          }
        }
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') node.remove(); // line breaks re-emerge as blocks
        else {
          node.classList.add('split-word'); // e.g. <span class="hl">
          words.push(node);
        }
      }
    };
    [...el.childNodes].forEach(wrapNode);

    // Pass 2: group words into visual lines by their offsetTop
    const lines = [];
    let currentTop = null;
    for (const w of words) {
      if (w.offsetTop !== currentTop) {
        currentTop = w.offsetTop;
        lines.push([]);
      }
      lines[lines.length - 1].push(w);
    }

    // Pass 3: rebuild — one masked block per line
    el.textContent = '';
    lines.forEach((lineWords, i) => {
      const line = document.createElement('span');
      line.className = 'split-line';
      const inner = document.createElement('span');
      inner.className = 'split-line-inner';
      inner.style.setProperty('--li', i);
      lineWords.forEach((w, j) => {
        if (j) inner.appendChild(document.createTextNode(' '));
        inner.appendChild(w);
      });
      line.appendChild(inner);
      el.appendChild(line);
    });
  };

  targets.forEach(split);

  /* Each LINE gets its own observer entry: it wipes only once it
     is actually shown in the window. Lines that appear together
     get sequential --ld indexes → the block colors stagger. */
  const lineIO = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, obs) => {
        let k = 0;
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.style.setProperty('--ld', k++);
          en.target.classList.add('line-in');
          obs.unobserve(en.target);
        }
      }, { threshold: 0.35, rootMargin: '0px 0px -5% 0px' })
    : null;
  const watchLines = (el) =>
    el.querySelectorAll('.split-line').forEach((l) =>
      lineIO ? lineIO.observe(l) : l.classList.add('line-in'));
  targets.forEach(watchLines);

  onResize(() => {
    targets.forEach((el) => {
      const wasRevealed = el.querySelector('.split-line.line-in');
      split(el);
      if (wasRevealed) {
        // already read — show instantly, no re-animation
        el.querySelectorAll('.split-line').forEach((l, i) => {
          l.style.setProperty('--ld', i % 3);
          l.classList.add('line-in');
        });
      } else {
        watchLines(el);
      }
    });
  });
}

/* ------------------------------------------------------------
   5. SCROLL REVEALS (now also watches [data-split])
   ------------------------------------------------------------ */
function initReveals() {
  const targets = document.querySelectorAll('.reveal, .img-reveal, [data-split], [data-radial]');
  if (!targets.length) return;
  if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );
  targets.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------
   6. ANIMATED COUNTERS (unchanged)
   ------------------------------------------------------------ */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  const finish = (el) =>
    (el.textContent = parseInt(el.dataset.count, 10).toLocaleString());
  if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
    counters.forEach(finish);
    return;
  }
  const animate = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min((now - start) / 1400, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString();
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(
    (entries, observer) => {
      for (const e of entries)
        if (e.isIntersecting) {
          animate(e.target);
          observer.unobserve(e.target);
        }
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------
   7. FLUID BLOB REVEAL
   Upgrades the CSS mask fallback on the Hall of Fame cards to a
   LIVING blob:
   - the reveal follows the cursor around the card
   - its radii wobble continuously with time-based noise, so the
     shape never repeats
   - its SIZE is driven by mouse speed: creep slowly and you get
     a small peephole, sweep fast and it balloons open
   Built with clip-path: path(...) regenerated per frame — the
   blob outline is N points on a circle with layered sine noise,
   joined into a smooth closed curve (Catmull-Rom → Bézier).
   The rAF loop only runs while a card is hovered.
   ------------------------------------------------------------ */
function initBlobReveal() {
  if (REDUCED_MOTION) return; // CSS mask fallback handles it

  /* Collect reveal targets:
     - Hall of Fame cards (two different images already in markup)
     - any [data-blob] host anywhere on the site: we auto-build the
       hidden layer by cloning its image and tinting it with the
       theme accent (mix-blend-mode: color), so every photo gets a
       "hidden world" without extra assets. */
  const targets = [];

  document.querySelectorAll('.hof-card').forEach((card) => {
    const media = card.querySelector('.hof-card__media');
    const swap = media?.querySelector('img.swap');
    if (!media || !swap) return;
    media.classList.add('blob-js'); // disables the CSS mask fallback
    targets.push({ host: card, media, layer: swap });
  });

  document.querySelectorAll('[data-blob]').forEach((box) => {
    const img = box.querySelector('img');
    if (!img) return;
    const layer = document.createElement('div');
    layer.className = 'blob-layer';
    layer.setAttribute('aria-hidden', 'true');
    const clone = img.cloneNode();
    clone.removeAttribute('alt');
    clone.removeAttribute('class');
    layer.appendChild(clone);
    box.appendChild(layer);
    targets.push({ host: box, media: box, layer });
  });

  targets.forEach(({ host: card, media, layer: swap }) => {
    const POINTS = 10;
    // per-card random phases so no two blobs wobble in sync
    const seeds = Array.from({ length: POINTS }, () => Math.random() * 6.283);

    let raf = null, active = false, leaving = false;
    let w = 0, h = 0, baseR = 0, maxR = 0;
    let cx = 0, cy = 0, tx = 0, ty = 0;  // blob center: lerped / target
    let r = 0, tr = 0;                   // blob radius: lerped / target
    let lastX = 0, lastY = 0, lastT = 0;

    /** Build the wobbling blob outline as a clip-path path() string. */
    const buildPath = (time) => {
      const pts = [];
      for (let i = 0; i < POINTS; i++) {
        const a = (i / POINTS) * Math.PI * 2;
        // two sine layers at different frequencies = organic wobble
        const wob =
          1 +
          0.26 * Math.sin(time * 2.1 + seeds[i]) +
          0.12 * Math.sin(time * 3.9 + seeds[i] * 2.3);
        pts.push([cx + Math.cos(a) * r * wob, cy + Math.sin(a) * r * wob]);
      }
      // Catmull-Rom through the points → smooth closed Bézier loop
      let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < POINTS; i++) {
        const p0 = pts[(i - 1 + POINTS) % POINTS];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % POINTS];
        const p3 = pts[(i + 2) % POINTS];
        d +=
          ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)}` +
          ` ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)},` +
          ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)}` +
          ` ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)},` +
          ` ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return d + ' Z';
    };

    const frame = (now) => {
      const time = now / 1000;
      // chase the cursor and the target radius (lerp = fluid lag)
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      r += (tr - r) * 0.14;
      // while idle, relax toward a mid-size resting blob
      if (!leaving) tr += (baseR - tr) * 0.05;

      swap.style.clipPath = `path("${buildPath(time)}")`;

      if (leaving && r < 1.5) {
        // fully closed — park and stop the loop
        swap.style.clipPath = 'path("M0 0 Z")';
        active = false;
        raf = null;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const localXY = (e) => {
      const rect = media.getBoundingClientRect();
      w = rect.width; h = rect.height;
      baseR = Math.min(w, h) * 0.3;
      maxR = Math.min(w, h) * 0.85;
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    card.addEventListener('pointerenter', (e) => {
      [tx, ty] = localXY(e);
      cx = tx; cy = ty;
      r = 0; tr = baseR;
      lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
      leaving = false;
      if (!active) {
        active = true;
        raf = requestAnimationFrame(frame);
      }
    });

    card.addEventListener('pointermove', (e) => {
      [tx, ty] = localXY(e);
      // mouse speed (px/ms) → target radius: fast sweep = big blob
      const now = performance.now();
      const dt = Math.max(now - lastT, 1);
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      const speed = Math.min(dist / dt, 3); // clamp wild jumps
      tr = clamp(baseR * 0.65 + (speed / 3) * (maxR - baseR * 0.65),
                 baseR * 0.55, maxR);
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    });

    card.addEventListener('pointerleave', () => {
      leaving = true;
      tr = 0; // shrink to nothing, frame() parks the loop
    });
  });
}

/* ------------------------------------------------------------
   8. PARALLAX DEPTH
   Two flavors:
   [data-parallax="0.2"]  — whole element drifts vertically at
                            (element center − viewport center) × speed
   [data-parallax-img]    — the <img> inside drifts within its
                            clipped container (inner parallax).
                            CSS gives the img `scale: 1.18` so
                            edges never show.
   KEY TRICK: we write the CSS `translate` property, NOT
   `transform`, so hover-scale / curtain-reveal transitions on
   `transform` keep working independently.
   All positions cached; zero layout reads per frame.
   ------------------------------------------------------------ */
function initParallax() {
  if (REDUCED_MOTION) return;
  const items = [];

  const collect = () => {
    items.length = 0;
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      el.style.translate = '0px 0px';
      const r = el.getBoundingClientRect();
      items.push({
        target: el,
        center: r.top + window.scrollY + r.height / 2,
        speed: parseFloat(el.dataset.parallax) || 0.15,
        range: Infinity,
      });
    });
    document.querySelectorAll('[data-parallax-img]').forEach((box) => {
      const imgs = box.querySelectorAll('img');
      if (!imgs.length) return;
      const r = box.getBoundingClientRect();
      // every img in the box (including the blob-reveal clone) gets
      // the SAME drift, so the hidden layer stays pixel-aligned
      imgs.forEach((img) => {
        img.style.translate = '0px 0px';
        items.push({
          target: img,
          center: r.top + window.scrollY + r.height / 2,
          speed: parseFloat(box.dataset.parallaxImg) || 0.12,
          range: r.height * 0.06, // stay safely inside the 1.18 overscan
        });
      });
    });
  };

  collect();
  onResize(collect);

  const vh2 = () => innerHeight / 2;
  ScrollEngine.add((y) => {
    for (const it of items) {
      const delta = (it.center - (y + vh2())) * it.speed;
      it.target.style.translate = `0px ${clamp(delta, -it.range, it.range)}px`;
    }
  });
}

/* ------------------------------------------------------------
   9. HERO SHRINK SEQUENCE + SCROLL-DRAWN SIGNATURE
   The hero is pinned inside a 220vh wrapper (#heroPin), giving
   it a scroll "timeline" (progress p = 0 → 1):

   p 0.00–0.25  copy lifts away and fades; glows + giant word dim
   p 0.05–0.55  backdrop portrait shrinks from full-bleed
                (scale 1, 35% opacity) into a focused centered
                card (scale 0.42, full opacity) — the
                "background shrinks and fades" moment
   p 0.45–0.95  the signature draws itself: every stroke has
                pathLength="1", so scroll progress maps directly
                onto stroke-dashoffset. Strokes draw in sequence,
                and scrolling back un-draws them.

   Everything reads the smoothed scroll value → inertial feel.
   ------------------------------------------------------------ */
function initHeroShrink() {
  const pin = document.getElementById('heroPin');
  const hero = pin?.querySelector('.hero');
  if (!pin || !hero || REDUCED_MOTION) return;

  const text = hero.querySelector('.hero__inner');
  const media = hero.querySelector('.hero__media');
  const cue = hero.querySelector('.scroll-cue');
  const word = hero.querySelector('.bg-word');
  const strokes = hero.querySelectorAll('.signature .sig-pen path');
  const N = strokes.length;

  /* Constant pen speed.
     Giving every stroke an equal slice of scroll would race the
     pen through the long "hanh" stroke and then crawl across the
     i-dot. Instead we measure each stroke's real length and give
     it a proportional slice, so the pen travels at a steady rate
     the whole way through — the way a handwriting clip looks.
     spans[i] = [start, end] as fractions of the signature phase. */
  let spans = [];
  const measureStrokes = () => {
    const lens = [...strokes].map((p) => {
      try { return p.getTotalLength() || 1; } catch (e) { return 1; }
    });
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    spans = lens.map((len) => {
      const start = acc / total;
      acc += len;
      return [start, acc / total];
    });
  };

  let range = 1;
  const measure = () => {
    range = Math.max(pin.offsetHeight - innerHeight, 1);
  };
  measure();
  measureStrokes();
  onResize(measure);

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  ScrollEngine.add((y) => {
    if (y > range + innerHeight) return; // sequence far above: skip
    const p = clamp(y / range, 0, 1);

    // 1 — copy exits
    const tp = clamp(p / 0.25, 0, 1);
    text.style.opacity = (1 - tp).toFixed(3);
    text.style.translate = `0px ${(-70 * tp).toFixed(1)}px`;
    if (cue) cue.style.opacity = (1 - tp).toFixed(2);
    if (word) word.style.opacity = (1 - tp).toFixed(2);
    hero.style.setProperty('--glow', (1 - p).toFixed(2));

    // 2 — backdrop shrinks into a focused card
    const mp = easeOut(clamp((p - 0.05) / 0.5, 0, 1));
    media.style.scale = (1 - 0.58 * mp).toFixed(3);
    // full-opacity portrait dissolves to a translucent card
    media.style.opacity = (1 - 0.72 * mp).toFixed(3);

    // 3 — signature writes itself, scroll-linked
    const sp = clamp((p - 0.45) / 0.5, 0, 1);

    // Each traced stroke owns a slice of the phase sized to its
    // real length, so the pen keeps a constant speed throughout.
    strokes.forEach((path, i) => {
      const [start, end] = spans[i] || [i / N, (i + 1) / N];
      const local = clamp((sp - start) / Math.max(end - start, 1e-4), 0, 1);
      path.style.strokeDashoffset = (1 - local).toFixed(3);
    });
  });
}

/* ------------------------------------------------------------
   9b. CONVERGE — two images meet in the middle
   Pinned 220vh section. Scroll progress moves the left image
   rightward and the right image leftward until they flank the
   center headline — position-driven and fully reversible.
   ------------------------------------------------------------ */
function initConverge() {
  const section = document.getElementById('converge');
  if (!section || REDUCED_MOTION) return;
  const mobile = window.matchMedia('(max-width: 700px)');
  const left = section.querySelector('.converge__img.is-left');
  const right = section.querySelector('.converge__img.is-right');
  if (!left || !right) return;

  let secTop = 0, range = 1;
  const measure = () => {
    secTop = section.offsetTop;
    range = Math.max(section.offsetHeight - innerHeight, 1);
  };
  measure();
  onResize(measure);

  const easeIO = (t) => t * t * (3 - 2 * t);

  ScrollEngine.add((y) => {
    if (mobile.matches) return; // CSS handles the stacked layout
    const raw = (y - secTop) / range;
    if (raw < -0.2 || raw > 1.2) return;
    const p = easeIO(clamp(raw, 0, 1));
    // travel distance: from the edges to ~flanking the headline
    const travel = innerWidth * 0.17 * p;
    left.style.translate = `${travel.toFixed(1)}px -66%`;
    right.style.translate = `${(-travel).toFixed(1)}px -34%`;
  });
}

/* ------------------------------------------------------------
   10. HORIZONTAL SCROLL GALLERY (upgraded)
   Same sticky-stage concept as v1, but:
   - driven by the SMOOTHED scroll value → inertial glide
   - a velocity-based skewX makes cards lean while moving
   Mobile still degrades to a native scroll-snap strip (CSS).
   ------------------------------------------------------------ */
function initHScroll() {
  const section = document.getElementById('hscroll');
  const track = document.getElementById('hscrollTrack');
  if (!section || !track || REDUCED_MOTION) return;
  const mobile = window.matchMedia('(max-width: 600px)');

  let maxShift = 0, secTop = 0, secRange = 1;
  const measure = () => {
    track.style.transform = '';
    maxShift = Math.max(track.scrollWidth - innerWidth, 0);
    secTop = section.offsetTop;
    secRange = Math.max(section.offsetHeight - innerHeight, 1);
  };
  measure();
  onResize(measure);

  ScrollEngine.add((y, vel) => {
    if (mobile.matches) {
      track.style.transform = '';
      return;
    }
    const progress = clamp((y - secTop) / secRange, 0, 1);
    const skew = clamp(vel * 0.12, -4, 4); // lean with velocity
    track.style.transform =
      `translateX(${(-progress * maxShift).toFixed(1)}px) skewX(${skew.toFixed(2)}deg)`;
  });
}

/* ------------------------------------------------------------
   11. VELOCITY-REACTIVE MARQUEE
   Replaces the pure-CSS loop when JS is available: the ribbon
   creeps at a base speed, accelerates with scroll velocity and
   flips direction to follow the scroll — the reference's
   "scroll-direction marquee" pattern.
   Content is duplicated in the HTML, so wrapping at half the
   track width is seamless.
   ------------------------------------------------------------ */
function initMarqueeDrive() {
  const track = document.querySelector('.marquee__track');
  if (!track || REDUCED_MOTION) return;
  track.classList.add('is-js'); // disables the CSS keyframe fallback

  let half = 0, x = 0, dir = -1;
  const measure = () => (half = track.scrollWidth / 2);
  measure();
  onResize(measure);

  ScrollEngine.add((_, vel) => {
    if (!half) return;
    if (Math.abs(vel) > 0.5) dir = vel > 0 ? -1 : 1; // follow scroll
    const speed = 0.7 + Math.min(Math.abs(vel) * 0.35, 7);
    x += dir * speed;
    // wrap into (-half, 0] so the loop is invisible
    x = ((x % half) - half) % half;
    track.style.transform = `translateX(${x.toFixed(1)}px)`;
  });
}

/* ------------------------------------------------------------
   12. SCROLL-GRADIENT BACKGROUND
   The page's palette BLENDS with scroll position instead of
   snapping: each frame we measure how close the viewport center
   is to the [data-theme-section] band and write --fm (0 → 1).
   CSS color-mix() does the actual blending of every token (see
   style.css "SCROLL-GRADIENT THEME BLEND"), so the background
   travels through the gradient as you scroll — both directions.
   ------------------------------------------------------------ */
function initScrollGradient() {
  const sections = document.querySelectorAll('[data-theme-section]');
  if (!sections.length || REDUCED_MOTION) return;

  const bands = [];
  const measure = () => {
    bands.length = 0;
    sections.forEach((s) => {
      const r = s.getBoundingClientRect();
      const top = r.top + window.scrollY;
      bands.push({ top, bottom: top + r.height });
    });
  };
  measure();
  onResize(measure);

  const smooth = (t) => t * t * (3 - 2 * t); // smoothstep easing

  const apply = (y) => {
    const center = y + innerHeight / 2;
    const feather = innerHeight * 1.7; // wide feather = slow, long color travel
    let fm = 0;
    for (const b of bands) {
      // distance from viewport center to the band (0 inside it)
      const d = center < b.top ? b.top - center
              : center > b.bottom ? center - b.bottom : 0;
      fm = Math.max(fm, 1 - Math.min(d / feather, 1));
    }
    document.body.style.setProperty('--fm', smooth(fm).toFixed(4));
  };
  apply(window.scrollY); // correct palette from the first frame
  ScrollEngine.add(apply);
}

/* ------------------------------------------------------------
   12b. SCROLL-POSITION SLIDE-INS
   [data-slide="left|right|up"] elements glide into place in
   lockstep with the scrollbar: progress through the lower 55%
   of the viewport maps (eased) onto offset + opacity. Scrolling
   back up slides them out again — position-driven, not
   trigger-driven. Uses the `translate` property so it coexists
   with every transform-based effect.
   ------------------------------------------------------------ */
function initSlideIn() {
  const els = document.querySelectorAll('[data-slide]');
  if (!els.length) return;
  if (REDUCED_MOTION) {
    els.forEach((el) => (el.style.opacity = 1));
    return;
  }

  const OFFSET = 90; // px of travel
  const items = [];
  const collect = () => {
    items.length = 0;
    els.forEach((el) => {
      // slide replaces the trigger-based reveal on these elements
      el.classList.remove('reveal', 'is-visible');
      el.style.translate = '0px 0px';
      const r = el.getBoundingClientRect();
      items.push({
        el,
        top: r.top + window.scrollY,
        dir: el.dataset.slide || 'up',
      });
    });
  };
  collect();
  onResize(collect);

  ScrollEngine.add((y) => {
    const vh = innerHeight;
    for (const it of items) {
      const e = clamp((y + vh - it.top) / (vh * 0.55), 0, 1);
      const ease = 1 - Math.pow(1 - e, 3);
      const d = (1 - ease) * OFFSET;
      let x = 0, ty = 0;
      if (it.dir === 'left') x = -d;
      else if (it.dir === 'right') x = d;
      else ty = d;
      it.el.style.translate = `${x.toFixed(1)}px ${ty.toFixed(1)}px`;
      it.el.style.opacity = ease.toFixed(3);
    }
  });
}

/* ------------------------------------------------------------
   13. IN-VIEW VIDEO PLAYBACK
   video[data-video-inview] elements play only while ~35% of
   them is on screen, and pause the moment they leave — no
   wasted decoding, no scroll jank from off-screen video.
   (This is the reference site's hover/in-view stream pattern.)
   Reduced motion: videos never autoplay.
   ------------------------------------------------------------ */
function initVideoInView() {
  const vids = document.querySelectorAll('video[data-video-inview]');
  if (!vids.length) return;
  if (REDUCED_MOTION || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        // play() returns a promise that rejects if blocked — ignore
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      }
    },
    { threshold: 0.35 }
  );
  vids.forEach((v) => io.observe(v));
}

/* ------------------------------------------------------------
   14. SCROLL-SCRUBBED VIDEO (cinema section)
   The .vscrub wrapper is 260vh tall with a sticky stage.
   Scroll progress through the wrapper maps to:
   - video.currentTime  (the "scrub" — footage plays forward as
     you scroll down, backward as you scroll up)
   - a scale ramp on the media frame (0.84 → 1 over the first
     35% of the pin, the reference's pinned-canvas grow move)
   The placeholder mp4 is encoded with all-keyframes (-g 1) so
   seeking is instant; do the same for real footage.
   ------------------------------------------------------------ */
function initVideoScrub() {
  const video = document.querySelector('video[data-video-scrub]');
  const section = video?.closest('.vscrub');
  if (!video || !section || REDUCED_MOTION) return;
  const media = section.querySelector('.vscrub__media');

  let secTop = 0, secRange = 1, duration = 0;
  const measure = () => {
    secTop = section.offsetTop;
    secRange = Math.max(section.offsetHeight - innerHeight, 1);
  };
  measure();
  onResize(measure);

  video.addEventListener(
    'loadedmetadata',
    () => (duration = video.duration || 0),
    { once: true }
  );
  video.pause(); // we own the timeline now

  ScrollEngine.add((y) => {
    const raw = (y - secTop) / secRange;
    if (raw < -0.2 || raw > 1.2) return; // far off-screen: skip writes
    const p = clamp(raw, 0, 1);

    // Scrub — only seek when the target moved meaningfully
    if (duration) {
      const t = p * Math.max(duration - 0.05, 0);
      if (Math.abs(video.currentTime - t) > 0.03) video.currentTime = t;
    }

    // Grow-in over the first 35% of the pin
    const zoom = 0.84 + 0.16 * clamp(p / 0.35, 0, 1);
    media.style.scale = zoom.toFixed(3);
  });
}

/* ------------------------------------------------------------
   15. LIGHT/DARK MODE TOGGLE
   An inline <head> script applies the saved / OS-preferred mode
   before first paint (no flash); this module just wires the
   header button and persists the choice. Light mode reuses the
   active theme's --flip-* palette (see style.css §20).
   ------------------------------------------------------------ */
function initModeToggle() {
  const btn = document.getElementById('modeToggle');
  if (!btn) return;
  const root = document.documentElement;

  const sync = () => {
    const light = root.classList.contains('mode-light');
    btn.setAttribute('aria-pressed', String(light));
    btn.title = light ? 'Switch to dark mode' : 'Switch to light mode';
  };

  btn.addEventListener('click', () => {
    const light = root.classList.toggle('mode-light');
    try {
      localStorage.setItem('color-mode', light ? 'light' : 'dark');
    } catch (e) { /* storage may be unavailable — mode still works */ }
    sync();
  });

  sync();
}

/* ------------------------------------------------------------
   16. RADIAL TEXT REVEAL
   [data-radial] headings: each word is wrapped and given an arc
   position — rotation grows with distance from the center word,
   lift follows the curve (y ∝ distance²). Words start dropped
   and swing up INTO the arc when the heading enters the
   viewport (reveal observer adds .is-visible) — text revealed
   in a radius.
   ------------------------------------------------------------ */
function initRadialText() {
  const els = document.querySelectorAll('[data-radial]');
  if (!els.length || REDUCED_MOTION) return;
  els.forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const mid = (words.length - 1) / 2;
    words.forEach((word, i) => {
      if (i) el.appendChild(document.createTextNode(' '));
      const w = document.createElement('span');
      w.className = 'radial-word';
      w.textContent = word;
      const d = i - mid;                      // signed distance from center
      w.style.setProperty('--w', Math.abs(d)); // stagger outward from center
      w.style.setProperty('--arc-r', `${(d * 4).toFixed(1)}deg`);
      w.style.setProperty('--arc-y', `${(d * d * 0.09).toFixed(2)}em`);
      el.appendChild(w);
    });
  });
}

/* ------------------------------------------------------------
   17. CARD FAN
   The archive cards fan out in a radius (pivot far below the
   cards = wide arc) in lockstep with scroll progress through
   the section — reversible, like every scroll-driven effect.
   ------------------------------------------------------------ */
function initFan() {
  const section = document.getElementById('fan');
  if (!section || REDUCED_MOTION) return;
  const cards = [...section.querySelectorAll('.fan__card')];
  if (!cards.length) return;
  const title = section.querySelector('#fan-title');

  /* Split each heading line into chars for the socials-style
     reveal: letters rise and straighten radiating from the
     center of the line outward. */
  const chars = [];
  title?.querySelectorAll('.fan-line').forEach((line) => {
    const text = line.textContent;
    line.textContent = '';
    line.dataset.ghost = text; // dim "unfilled" copy (CSS ::before)
    for (const ch of text) {
      if (ch === ' ') { line.appendChild(document.createTextNode(' ')); continue; }
      const c = document.createElement('span');
      c.className = 'fan-char';
      c.textContent = ch;
      line.appendChild(c);
      chars.push({ el: c, rn: 0 });
    }
  });

  /* Measure each char's distance from the heading's CENTER so the
     ink fills outward in a true circle (both lines together). */
  const measureChars = () => {
    if (!title || !chars.length) return;
    chars.forEach((c) => (c.el.style.translate = '0px 0px'));
    const tb = title.getBoundingClientRect();
    let maxR = 1;
    chars.forEach((c) => {
      const r = c.el.getBoundingClientRect();
      const x = r.left - tb.left + r.width / 2 - tb.width / 2;
      const yv = r.top - tb.top + r.height / 2 - tb.height / 2;
      c.r = Math.hypot(x, yv);
      maxR = Math.max(maxR, c.r);
    });
    chars.forEach((c) => (c.rn = c.r / maxR));
  };
  measureChars();
  onResize(measureChars);
  const mid = (cards.length - 1) / 2;

  let top = 0;
  const measure = () => {
    top = section.getBoundingClientRect().top + window.scrollY;
  };
  measure();
  onResize(measure);

  ScrollEngine.add((y) => {
    const vh = innerHeight;
    // starts once the section is ~80% up into the viewport —
    // previously it fired as soon as the top edge appeared (too early)
    const raw = (y + vh * 0.8 - top) / (vh * 0.8);
    // NOTE: no upper cutoff — if the page loads already scrolled
    // past this section, the fan must still render fully open.
    if (raw < -0.3) return; // far above the viewport: still hidden
    const p = clamp(raw, 0, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    cards.forEach((card, i) => {
      const d = i - mid;
      card.style.setProperty('--a', `${(d * 11 * ease).toFixed(2)}deg`);
      card.style.opacity = ease.toFixed(3);
      card.style.zIndex = String(10 - Math.abs(d) * 2);
    });
    // circular ink fill: the wavefront (ease-driven radius) inks
    // each char once it passes the char's distance from center
    const wave = ease * 1.35;
    for (const c of chars) {
      const a = clamp((wave - c.rn) * 3, 0, 1);
      c.el.style.opacity = a.toFixed(3);
      c.el.style.translate = `0 ${((1 - a) * 0.35).toFixed(3)}em`;
    }
  });
}

/* ------------------------------------------------------------
   18. CUSTOM CURSOR (desktop polish)
   Accent dot glued to the pointer + a lagging ring (lerped in
   the ScrollEngine frame loop). The ring swells over anything
   interactive. Touch devices and reduced-motion never see it.
   ------------------------------------------------------------ */
function initCursor() {
  if (REDUCED_MOTION || !matchMedia('(pointer: fine)').matches) return;
  document.documentElement.classList.add('has-cursor');

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let mx = -100, my = -100, rx = -100, ry = -100;
  window.addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.translate = `${mx - 3.5}px ${my - 3.5}px`;
  }, { passive: true });

  // ring chases with lag (runs in the shared frame loop)
  ScrollEngine.add(() => {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.translate = `${rx.toFixed(1)}px ${ry.toFixed(1)}px`;
  });

  // swell over interactive elements (event delegation)
  document.addEventListener('mouseover', (e) => {
    ring.classList.toggle(
      'is-on',
      Boolean(e.target.closest('a, button, [data-blob], .hof-card, video'))
    );
  });
}

/* ------------------------------------------------------------
   19. PAGE TRANSITIONS
   Internal navigations fade the page out before leaving —
   the loader covers the way back in. Modifier-clicks, new
   tabs, hashes and downloads are left alone.
   ------------------------------------------------------------ */
function initPageFade() {
  if (REDUCED_MOTION) return;
  document.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (!href || !href.endsWith('.html')) return; // internal pages only
    e.preventDefault();
    document.documentElement.classList.add('page-exit');
    setTimeout(() => (location.href = href), 260);
  });
}

/* ------------------------------------------------------------
   BOOT
   Split-text waits for fonts (line-wrap measurement depends on
   final font metrics); everything it gates comes after.
   ------------------------------------------------------------ */
initLoader();
initStickyNav();
initOverlayMenu();
initCounters();
initScrollGradient();
initVideoInView();
initBlobReveal();
initModeToggle();
initCursor();
initPageFade();

let _fxStarted = false;
const startScrollFX = () => {
  if (_fxStarted) return; // run exactly once
  _fxStarted = true;
  initSplitText();
  initRadialText();
  initSlideIn();
  initReveals();
  initParallax();
  initHeroShrink();
  initHScroll();
  initConverge();
  initFan();
  initMarqueeDrive();
  initVideoScrub();
};

if (document.fonts?.ready) {
  document.fonts.ready.then(startScrollFX);
  setTimeout(startScrollFX, 3000); // safety net in case fonts hang
} else {
  startScrollFX();
}