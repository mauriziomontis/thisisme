---
name: lateral-panels-canvas-upgrade
description: Replace SVG circuit panels with animated Canvas panels — Stars→Molecules (left) and PCB signal dots (right), fixed position, scroll-phase driven
metadata:
  type: project
---

# Design Spec — Lateral Panels Canvas Upgrade

**Site:** `mauriziomontis.github.io/thisisme`
**Stack:** Astro v6.4.2 · GSAP (installed) · Canvas API · Lenis (installed)
**Date:** 2026-06-06

---

## 1. Goal

Replace the two existing SVG circuit board panels (`CircuitPanel.astro`, `CircuitPanelLeft.astro`) with a single `LateralPanels.astro` component that renders animated Canvas panels. The left panel narrates a physical journey from stellar field to molecular bonds as the user scrolls. The right panel shows a PCB circuit board with animated signal dots. Both panels are purely visual — no HUD text, no interactive elements.

---

## 2. Layout

Both panels remain `position: fixed`, `height: 100vh`, `width: 80px`. No changes to `Base.astro`, `global.css`, or any section component. Zero layout regression risk.

```css
.panel {
  position: fixed;
  top: 0;
  width: 80px;
  height: 100vh;
  pointer-events: none;
  z-index: 50;
  overflow: hidden;
}
.panel-left  { left: 0; }
.panel-right { right: 0; }
canvas { display: block; width: 100%; height: 100%; }

@media (max-width: 1100px) {
  .panel { display: none; }
}
```

Canvas is sized to viewport on init and resize (debounced 200ms).

---

## 3. Scroll → Phase System

### 3.1 Scroll state

Uses native `window.scroll` event (Lenis updates `window.scrollY` correctly):

```javascript
window.addEventListener('scroll', () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  scrollRaw = maxScroll > 0 ? window.scrollY / maxScroll : 0;
}, { passive: true });
```

### 3.2 Phase mapping — 7 sections

| Section | ID | Phase target |
|---|---|---|
| Hero | `#hero` | 0.00 |
| About | `#about` | 0.24 |
| Projects | `#projects` | 0.44 |
| Creative | `#creative` | 0.58 |
| Courses | `#courses` | 0.72 |
| Labs | `#labs` | 0.85 |
| Contact | `#contact` | 1.00 |

### 3.3 Plateau logic per section

Within each section (1/7 of scroll range):
- First 20% → rapid transition toward this section's phase target
- Middle 60% → plateau (phase frozen while reading)
- Last 20% → transition begins toward next section

### 3.4 Smooth phase (rAF loop)

```javascript
currentPhase += (targetPhase - currentPhase) * Math.min(1, dt * 4);
```

---

## 4. Left Panel — Stars → Molecules

### 4.1 Visual states by phase

| Phase range | Visual state |
|---|---|
| 0.00–0.24 | Pure stellar field, long trails |
| 0.24–0.44 | Zoom-in, proto-atoms emerging |
| 0.44–0.72 | Atoms H, He, C, O with electrons |
| 0.72–0.85 | Atoms N, Na, color shifts to teal |
| 0.85–1.00 | Molecular bonds, max complexity |

### 4.2 Color palette

```javascript
function paletteLeft(phase) {
  if (phase < 0.4) return lerpHex('#aaaaee', '#44aaff', phase / 0.4);
  if (phase < 0.7) return lerpHex('#44aaff', '#00ffcc', (phase - 0.4) / 0.3);
  return lerpHex('#00ffcc', '#44ffaa', (phase - 0.7) / 0.3);
}
```

### 4.3 Star field

- 56 stars, two rotation poles at fixed viewport coordinates
- Pole A: `(panelW * 0.44, panelH * 0.16)`, Pole B: `(panelW * 0.56, panelH * 0.52)`
- Deterministic via seeded RNG: `const rng = s => { let x = Math.sin(s * 127.1 + 31.3) * 43758.5453; return x - Math.floor(x); }`
- Trail length: `lerp(220, 35, phase)` — shortens as phase increases
- Star alpha: fades to 0 by phase 0.68
- `shrinkFactor`: stars collapse toward poles as phase increases

### 4.4 Proto-atoms

- Visible `phase 0.18–0.70`
- Count: `lerp(0, 6, ease(clamp((phase - 0.18) * 5, 0, 1)))`
- Bell-curve alpha envelope, peak at phase 0.44
- Positions: deterministic via RNG, scattered across viewport height

### 4.5 Atoms

6 atoms with fixed relative positions (`rx/ry` scaled to canvas viewport dimensions):

| Atom | rx | ry | Orbits |
|---|---|---|---|
| H | 0.42 | 0.10 | 1 |
| He | 0.62 | 0.22 | 1 |
| C | 0.30 | 0.36 | 2 |
| O | 0.66 | 0.50 | 2 |
| N | 0.35 | 0.65 | 2 |
| Na | 0.55 | 0.80 | 3 |

- Visible count: `Math.round(lerp(0, 6, ease(clamp((phase - 0.30) / 0.55, 0, 1))))`
- Each fades in with `0.05 * atomIndex` delay offset
- Nucleus: radial glow + nucleon particles (protons `#ff8844`, neutrons `#5588aa`) + pulsing core
- Electrons: elliptical orbits with two-layer luminous trail, glow dot

### 4.6 Quantum jumps

Random electron orbit jumps (threshold 6–20s per electron). Visual: white flash + 5 radial sparks. No HUD text.

### 4.7 Molecular bonds

- Visible from phase 0.70, full alpha by phase 0.92
- Bond pairs: `[[0,2,1], [1,3,2], [2,3,1], [3,4,2], [4,5,1]]` (atomIdx, atomIdx, bondOrder)
- Each bond: parallel lines (offset ±3px) with glow layer + flowing particle
- Bond alpha: `ease(clamp((phase - 0.70) / 0.22, 0, 1))`

### 4.8 No inter-section filaments

The original spec's filament connections between sections were designed for a full-document-height canvas. With `position: fixed` they are replaced by the continuous phase-in/phase-out alpha envelopes of each visual layer (stars fading, proto-atoms rising and falling, atoms appearing, bonds forming). The narrative continuity is preserved through smooth transitions rather than spatial connections.

---

## 5. Right Panel — PCB Canvas

### 5.1 Static elements (drawn on resize)

- Background grid: 10px lines, `strokeStyle: '#091508'`, `lineWidth: 0.25`
- 4 trace paths: polylines covering full viewport height, relative `rx/ry` coordinates
- 12 vias: `radius: 2.8`, accent color stroke
- 1 IC component: ATmega-style rectangle at mid-panel
- 2 capacitors: barrel-cap rectangles on left edge

### 5.2 Animated signal dots

One dot per trace, traversing continuously:

```javascript
offset = (offset + 0.00007 * (1 + currentPhase * 2.5) * traceVariation) % 1;
```

Dot: `radius: 2.2` + glow ring `radius: 5, opacity: 0.22`.

Speed increases with phase — circuits "activate" as the user progresses through the page.

### 5.3 Accent color

```javascript
function accentRight(phase) {
  return lerpHex('#00cc55', '#44ffaa', clamp((phase - 0.3) / 0.7, 0, 1));
}
```

Both panels converge to `#44ffaa` at phase 1.0 — visual coherence at the Contact section.

---

## 6. Unified rAF Loop

Single `requestAnimationFrame` loop in `LateralPanels.astro` drives both panels:

```javascript
function frame(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  T += dt * 0.35;

  currentPhase += (targetPhase - currentPhase) * Math.min(1, dt * 4);
  updateElectrons(dt, currentPhase);

  renderLeft(currentPhase, dt);
  renderRight(currentPhase);

  requestAnimationFrame(frame);
}
```

Mobile guard: loop does not start if `panelL.offsetWidth === 0`.

---

## 7. Astro Integration

### Files changed

```
src/
  components/
    LateralPanels.astro    ← NEW
    CircuitPanel.astro     ← DELETE (replaced)
    CircuitPanelLeft.astro ← DELETE (replaced)
  pages/
    index.astro            ← EDIT (swap imports)
```

### index.astro diff

```diff
- import CircuitPanel from '../components/CircuitPanel.astro';
- import CircuitPanelLeft from '../components/CircuitPanelLeft.astro';
+ import LateralPanels from '../components/LateralPanels.astro';

- <CircuitPanel />
- <CircuitPanelLeft />
+ <LateralPanels />
```

---

## 8. Utility Functions

```javascript
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const rng = s => { let x = Math.sin(s * 127.1 + 31.3) * 43758.5453; return x - Math.floor(x); };

function lerpHex(a, b, t) {
  const f = (s, i) => parseInt(s.replace('#','').slice(i*2, i*2+2), 16);
  return '#' + [0,1,2].map(i =>
    Math.round(lerp(f(a,i), f(b,i), t)).toString(16).padStart(2,'0')
  ).join('');
}
```

---

## 9. Out of Scope

- HUD overlays (phase labels, physical scale, temperature, quantum jump text)
- CSS grid layout change (panels remain `position: fixed`)
- View Transitions support (site does not use them)
- Inter-section filament connections (replaced by phase alpha envelopes)
