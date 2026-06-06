# Lateral Panels Canvas Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two SVG circuit board panels with a single `LateralPanels.astro` component that renders a Stars→Molecules animation (left) and a PCB signal-dot animation (right) driven by scroll phase.

**Architecture:** One Astro component owns both `<canvas>` elements and all JS. A single `requestAnimationFrame` loop drives both panels from a shared `currentPhase` (0–1) derived from scroll position mapped across 7 sections. Panels are `position: fixed`, `100vh` height — no layout changes required elsewhere.

**Tech Stack:** Astro v6.4.2, Canvas 2D API, Lenis (already in Base.astro), GSAP (installed but not required for this feature)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| CREATE | `src/components/LateralPanels.astro` | HTML structure, CSS, all canvas JS |
| EDIT | `src/pages/index.astro` | Swap old panel imports for LateralPanels |
| DELETE | `src/components/CircuitPanel.astro` | Replaced |
| DELETE | `src/components/CircuitPanelLeft.astro` | Replaced |

---

## Task 1: Component Scaffold + CSS + Canvas Sizing

**Files:**
- Create: `src/components/LateralPanels.astro`

- [ ] **Step 1: Create the component with HTML and CSS**

Create `src/components/LateralPanels.astro`:

```astro
---
---
<div class="panel panel-left" id="panelL">
  <canvas id="cvsL"></canvas>
</div>
<div class="panel panel-right" id="panelR">
  <canvas id="cvsR"></canvas>
</div>

<style>
  .panel {
    position: fixed;
    top: 0;
    width: 80px;
    height: 100vh;
    pointer-events: none;
    z-index: 50;
    overflow: hidden;
    background: #03050d;
  }
  .panel-left {
    left: 0;
    border-right: 0.5px solid #0d1a2a;
  }
  .panel-right {
    right: 0;
    border-left: 0.5px solid #0d1a2a;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  @media (max-width: 1100px) {
    .panel { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .panel { display: none; }
  }
</style>

<script>
  const panelL = document.getElementById('panelL') as HTMLDivElement;
  const panelR = document.getElementById('panelR') as HTMLDivElement;
  const cvsL = document.getElementById('cvsL') as HTMLCanvasElement;
  const cvsR = document.getElementById('cvsR') as HTMLCanvasElement;
  const ctxL = cvsL.getContext('2d')!;
  const ctxR = cvsR.getContext('2d')!;

  function resizePanels() {
    const PW = panelL.offsetWidth;
    const PH = window.innerHeight;
    [cvsL, cvsR].forEach(cvs => {
      cvs.width = PW;
      cvs.height = PH;
    });
  }

  function debounce(fn: () => void, ms: number) {
    let id: ReturnType<typeof setTimeout>;
    return () => { clearTimeout(id); id = setTimeout(fn, ms); };
  }

  window.addEventListener('resize', debounce(resizePanels, 200));
  resizePanels();

  // Temporary: paint solid color to verify panels are active
  ctxL.fillStyle = '#0a1020';
  ctxL.fillRect(0, 0, cvsL.width, cvsL.height);
  ctxR.fillStyle = '#0a1020';
  ctxR.fillRect(0, 0, cvsR.width, cvsR.height);
</script>
```

- [ ] **Step 2: Wire into index.astro**

Edit `src/pages/index.astro`:

```diff
-import CircuitPanel from '../components/CircuitPanel.astro';
-import CircuitPanelLeft from '../components/CircuitPanelLeft.astro';
+import LateralPanels from '../components/LateralPanels.astro';
```

```diff
-    <CircuitPanel />
-    <CircuitPanelLeft />
+    <LateralPanels />
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:4321/thisisme`. Expect: two dark 80px panels on left and right, visible on screens > 1100px. Old SVG circuit panels should be gone.

- [ ] **Step 4: Delete old components**

```bash
rm src/components/CircuitPanel.astro src/components/CircuitPanelLeft.astro
```

- [ ] **Step 5: Commit**

```bash
git add src/components/LateralPanels.astro src/pages/index.astro
git rm src/components/CircuitPanel.astro src/components/CircuitPanelLeft.astro
git commit -m "feat: scaffold LateralPanels canvas component, remove SVG panels"
```

---

## Task 2: Utility Functions + Color Palette

**Files:**
- Modify: `src/components/LateralPanels.astro` (add utilities inside `<script>`)

- [ ] **Step 1: Replace the temp fill with utility functions**

Replace the entire `<script>` content (keep the element references and `resizePanels` and `debounce` from Task 1), then add below `resizePanels`:

```typescript
// ── Utilities ────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const rng = (s: number) => { const x = Math.sin(s * 127.1 + 31.3) * 43758.5453; return x - Math.floor(x); };

function lerpHex(a: string, b: string, t: number): string {
  const f = (s: string, i: number) => parseInt(s.replace('#', '').slice(i * 2, i * 2 + 2), 16);
  return '#' + [0, 1, 2].map(i =>
    Math.round(lerp(f(a, i), f(b, i), t)).toString(16).padStart(2, '0')
  ).join('');
}

function paletteLeft(phase: number): string {
  if (phase < 0.4) return lerpHex('#aaaaee', '#44aaff', phase / 0.4);
  if (phase < 0.7) return lerpHex('#44aaff', '#00ffcc', (phase - 0.4) / 0.3);
  return lerpHex('#00ffcc', '#44ffaa', (phase - 0.7) / 0.3);
}

function paletteRight(phase: number): string {
  return lerpHex('#00cc55', '#44ffaa', clamp((phase - 0.3) / 0.7, 0, 1));
}
```

- [ ] **Step 2: Verify utilities with console**

Temporarily add after the utility block, then remove after verifying:

```typescript
console.log('palette test:', paletteLeft(0), paletteLeft(0.5), paletteLeft(1.0));
// Expected: #aaaaee  #44aaff or nearby  #44ffaa
```

Open DevTools console, confirm hex values are reasonable color strings (6-char hex).

- [ ] **Step 3: Remove the console.log, commit**

```bash
git add src/components/LateralPanels.astro
git commit -m "feat: add canvas utilities and color palette functions"
```

---

## Task 3: Scroll → Phase System + rAF Loop Skeleton

**Files:**
- Modify: `src/components/LateralPanels.astro`

- [ ] **Step 1: Add scroll state and phase mapping**

Add after the palette functions:

```typescript
// ── Scroll state ─────────────────────────────────────────────
let scrollRaw = 0;

window.addEventListener('scroll', () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  scrollRaw = maxScroll > 0 ? window.scrollY / maxScroll : 0;
}, { passive: true });

// ── Phase mapping ─────────────────────────────────────────────
const N_SECTIONS = 7;
const SECTION_PHASES = [0, 0.24, 0.44, 0.58, 0.72, 0.85, 1.0];

function scrollToPhysics(s: number): number {
  const idx = Math.min(Math.floor(s * N_SECTIONS), N_SECTIONS - 1);
  const local = (s * N_SECTIONS) - idx;
  const from = SECTION_PHASES[idx];
  const to = SECTION_PHASES[Math.min(idx + 1, N_SECTIONS - 1)];
  const prev = idx > 0 ? SECTION_PHASES[idx - 1] : from;

  if (local < 0.20) return lerp(prev, from, ease(local / 0.20));
  if (local > 0.80) return lerp(from, to, ease((local - 0.80) / 0.20));
  return from;
}

let currentPhase = 0;
let targetPhase = 0;
let T = 0;
let lastTime: number | null = null;
```

- [ ] **Step 2: Add rAF loop skeleton**

Add after the state variables:

```typescript
function renderLeft(_phase: number, _dt: number) {
  ctxL.clearRect(0, 0, cvsL.width, cvsL.height);
  // Phase debug: fill opacity based on phase
  ctxL.fillStyle = `rgba(10, 16, 32, 0.97)`;
  ctxL.fillRect(0, 0, cvsL.width, cvsL.height);
  // Visual phase indicator: horizontal line
  const accent = paletteLeft(_phase);
  ctxL.strokeStyle = accent;
  ctxL.lineWidth = 1;
  ctxL.beginPath();
  ctxL.moveTo(0, cvsL.height * _phase);
  ctxL.lineTo(cvsL.width, cvsL.height * _phase);
  ctxL.stroke();
}

function renderRight(_phase: number) {
  ctxR.clearRect(0, 0, cvsR.width, cvsR.height);
  ctxR.fillStyle = `rgba(3, 5, 13, 0.97)`;
  ctxR.fillRect(0, 0, cvsR.width, cvsR.height);
}

function frame(timestamp: number) {
  if (panelL.offsetWidth === 0) { requestAnimationFrame(frame); return; }
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  T += dt * 0.35;

  targetPhase = scrollToPhysics(scrollRaw);
  currentPhase += (targetPhase - currentPhase) * Math.min(1, dt * 4);

  renderLeft(currentPhase, dt);
  renderRight(currentPhase);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

- [ ] **Step 3: Verify phase tracking in browser**

```bash
npm run dev
```

Scroll the page slowly from top to bottom. The left panel should show a thin horizontal line that moves downward as you scroll — from top at hero to bottom at contact. Color should shift from blue to teal.

- [ ] **Step 4: Commit**

```bash
git add src/components/LateralPanels.astro
git commit -m "feat: add scroll-to-phase system and rAF loop skeleton"
```

---

## Task 4: Star Field (Left Panel)

**Files:**
- Modify: `src/components/LateralPanels.astro`

- [ ] **Step 1: Add star data**

Add before `renderLeft`:

```typescript
// ── Star field ────────────────────────────────────────────────
interface Star {
  poleIndex: number;
  dist: number;
  baseAngle: number;
  mag: number;
  size: number;
  bright: boolean;
  trailSpeed: number;
}

const stars: Star[] = Array.from({ length: 56 }, (_, i) => ({
  poleIndex: i < 31 ? 0 : 1,
  dist: 12 + rng(i * 3.7) * 80,
  baseAngle: rng(i * 5.1) * Math.PI * 2,
  mag: rng(i * 7.3),
  size: rng(i * 7.3) < 0.07 ? 1.9 : rng(i * 7.3) < 0.22 ? 1.1 : 0.6,
  bright: rng(i * 7.3) < 0.07,
  trailSpeed: 0.0022 + rng(i * 2.3) * 0.0012,
}));
```

- [ ] **Step 2: Add star drawing function**

Add after the star data:

```typescript
function drawStars(phase: number) {
  const PW = cvsL.width;
  const PH = cvsL.height;
  const poles = [
    { x: PW * 0.44, y: PH * 0.16 },
    { x: PW * 0.56, y: PH * 0.52 },
  ];

  const starAlpha = 1 - ease(clamp((phase - 0.28) / 0.40, 0, 1));
  if (starAlpha <= 0.01) return;

  const shrinkFactor = 1 - ease(clamp((phase - 0.22) / 0.38, 0, 1));
  const trailLength = Math.round(lerp(220, 35, phase));
  const accent = paletteLeft(phase);

  stars.forEach(star => {
    const pole = poles[star.poleIndex];
    const angle = star.baseAngle + T * star.trailSpeed;

    // Build trail positions
    const trailPoints: { x: number; y: number }[] = [];
    for (let t = 0; t < trailLength; t++) {
      const a = angle - t * 0.0008;
      trailPoints.push({
        x: pole.x + Math.cos(a) * star.dist * shrinkFactor,
        y: pole.y + Math.sin(a) * star.dist * shrinkFactor * 0.55,
      });
    }

    if (trailPoints.length < 2) return;

    // Draw trail
    const trailAlpha = starAlpha * (star.bright ? 0.7 : 0.35);
    ctxL.beginPath();
    ctxL.moveTo(trailPoints[0].x, trailPoints[0].y);
    for (let i = 1; i < trailPoints.length; i++) {
      ctxL.lineTo(trailPoints[i].x, trailPoints[i].y);
    }
    ctxL.strokeStyle = accent + Math.round(trailAlpha * 255).toString(16).padStart(2, '0');
    ctxL.lineWidth = star.size * 0.5;
    ctxL.stroke();

    // Draw star dot
    const head = trailPoints[0];
    ctxL.beginPath();
    ctxL.arc(head.x, head.y, star.size, 0, Math.PI * 2);
    ctxL.fillStyle = accent + Math.round(starAlpha * 255).toString(16).padStart(2, '0');
    ctxL.fill();
  });
}
```

- [ ] **Step 3: Call drawStars in renderLeft**

Replace `renderLeft` with:

```typescript
function renderLeft(phase: number, _dt: number) {
  ctxL.clearRect(0, 0, cvsL.width, cvsL.height);
  ctxL.fillStyle = 'rgba(3, 5, 13, 0.92)';
  ctxL.fillRect(0, 0, cvsL.width, cvsL.height);

  drawStars(phase);
}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

At page top (hero section): left panel shows orbiting star trails, blue-purple color. As you scroll toward About/Projects: stars fade and shrink toward poles. By ~50% scroll: stars should be invisible.

- [ ] **Step 5: Commit**

```bash
git add src/components/LateralPanels.astro
git commit -m "feat: add star field to left panel"
```

---

## Task 5: Proto-Atoms (Left Panel)

**Files:**
- Modify: `src/components/LateralPanels.astro`

- [ ] **Step 1: Add proto-atom data**

Add after the star data block:

```typescript
// ── Proto-atoms ───────────────────────────────────────────────
interface ProtoAtom {
  x: number;  // relative 0..1
  y: number;  // relative 0..1
  r: number;  // base radius
}

const protoAtoms: ProtoAtom[] = Array.from({ length: 6 }, (_, i) => ({
  x: 0.15 + rng(i * 11.3) * 0.7,
  y: 0.05 + rng(i * 13.7) * 0.9,
  r: 3 + rng(i * 17.1) * 5,
}));
```

- [ ] **Step 2: Add proto-atom drawing function**

Add after the proto-atom data:

```typescript
function drawProtoAtoms(phase: number) {
  const visibleCount = lerp(0, 6, ease(clamp((phase - 0.18) * 5, 0, 1)));
  // Bell-curve alpha: peak at phase 0.44, zero at 0.18 and 0.70
  const alpha = Math.max(0, Math.sin(clamp((phase - 0.18) / 0.52, 0, 1) * Math.PI));
  if (alpha < 0.01) return;

  const accent = paletteLeft(phase);
  const PW = cvsL.width;
  const PH = cvsL.height;

  protoAtoms.slice(0, Math.ceil(visibleCount)).forEach((pa, i) => {
    const itemAlpha = alpha * Math.min(1, visibleCount - i);
    if (itemAlpha < 0.01) return;

    const cx = pa.x * PW;
    const cy = pa.y * PH;
    const pulse = 1 + 0.2 * Math.sin(T * 2 + i * 1.1);
    const r = pa.r * pulse;

    // Glow
    const grd = ctxL.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
    grd.addColorStop(0, accent + Math.round(itemAlpha * 80).toString(16).padStart(2, '0'));
    grd.addColorStop(1, accent + '00');
    ctxL.beginPath();
    ctxL.arc(cx, cy, r * 3, 0, Math.PI * 2);
    ctxL.fillStyle = grd;
    ctxL.fill();

    // Core
    ctxL.beginPath();
    ctxL.arc(cx, cy, r, 0, Math.PI * 2);
    ctxL.fillStyle = accent + Math.round(itemAlpha * 160).toString(16).padStart(2, '0');
    ctxL.fill();

    // Orbit ring
    ctxL.beginPath();
    ctxL.ellipse(cx, cy, r * 2.5, r * 1.5, T * 0.3 + i, 0, Math.PI * 2);
    ctxL.strokeStyle = accent + Math.round(itemAlpha * 60).toString(16).padStart(2, '0');
    ctxL.lineWidth = 0.7;
    ctxL.stroke();
  });
}
```

- [ ] **Step 3: Call drawProtoAtoms in renderLeft**

```typescript
function renderLeft(phase: number, _dt: number) {
  ctxL.clearRect(0, 0, cvsL.width, cvsL.height);
  ctxL.fillStyle = 'rgba(3, 5, 13, 0.92)';
  ctxL.fillRect(0, 0, cvsL.width, cvsL.height);

  drawStars(phase);
  drawProtoAtoms(phase);
}
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Scroll slowly past Hero into About. Small fuzzy glowing dots should appear and fade around phase 0.18–0.44, then disappear by ~0.70. They should co-exist briefly with fading stars.

- [ ] **Step 5: Commit**

```bash
git add src/components/LateralPanels.astro
git commit -m "feat: add proto-atoms layer to left panel"
```

---

## Task 6: Atoms — Nucleus + Electron Orbits

**Files:**
- Modify: `src/components/LateralPanels.astro`

- [ ] **Step 1: Add atom definitions and electron state**

Add after the proto-atom data:

```typescript
// ── Atoms ─────────────────────────────────────────────────────
interface OrbitDef {
  a: number; b: number; tilt: number; eCount: number; dir: number;
}
interface AtomDef {
  rx: number; ry: number; el: string;
  protons: number; neutrons: number; nucleusR: number;
  orbits: OrbitDef[];
}

const ATOM_DEFS: AtomDef[] = [
  { rx: 0.42, ry: 0.10, el: 'H',  protons: 1,  neutrons: 0,  nucleusR: 4,
    orbits: [{ a: 22, b: 16, tilt: 0.3,  eCount: 1, dir:  1 }] },
  { rx: 0.62, ry: 0.22, el: 'He', protons: 2,  neutrons: 2,  nucleusR: 5,
    orbits: [{ a: 20, b: 15, tilt: -0.5, eCount: 2, dir: -1 }] },
  { rx: 0.30, ry: 0.36, el: 'C',  protons: 6,  neutrons: 6,  nucleusR: 7,
    orbits: [{ a: 18, b: 13, tilt: 0.2,  eCount: 2, dir:  1 },
             { a: 32, b: 24, tilt: -0.6, eCount: 4, dir: -1 }] },
  { rx: 0.66, ry: 0.50, el: 'O',  protons: 8,  neutrons: 8,  nucleusR: 7,
    orbits: [{ a: 17, b: 12, tilt: 0.5,  eCount: 2, dir:  1 },
             { a: 30, b: 22, tilt: -0.3, eCount: 6, dir: -1 }] },
  { rx: 0.35, ry: 0.65, el: 'N',  protons: 7,  neutrons: 7,  nucleusR: 6.5,
    orbits: [{ a: 16, b: 12, tilt: -0.3, eCount: 2, dir: -1 },
             { a: 28, b: 20, tilt: 0.5,  eCount: 5, dir:  1 }] },
  { rx: 0.55, ry: 0.80, el: 'Na', protons: 11, neutrons: 12, nucleusR: 8,
    orbits: [{ a: 15, b: 11, tilt: 0.1,  eCount: 2, dir:  1 },
             { a: 26, b: 19, tilt: -0.5, eCount: 8, dir: -1 },
             { a: 40, b: 29, tilt: 0.4,  eCount: 1, dir:  1 }] },
];

// Electron angle state: [atomIndex][orbitIndex][electronIndex] = angle
const electronAngles: number[][][] = ATOM_DEFS.map(atom =>
  atom.orbits.map(orbit => Array.from({ length: orbit.eCount }, (_, i) =>
    (i / orbit.eCount) * Math.PI * 2
  ))
);

// Trail history: [atomIndex][orbitIndex][electronIndex] = [{x,y}, ...]
const TRAIL_STEPS = 38;
const electronTrails: { x: number; y: number }[][][][] = ATOM_DEFS.map(atom =>
  atom.orbits.map(orbit => Array.from({ length: orbit.eCount }, () => []))
);

function updateElectrons(dt: number, phase: number) {
  ATOM_DEFS.forEach((atom, ai) => {
    const cx = atom.rx * cvsL.width;
    const cy = atom.ry * cvsL.height;
    atom.orbits.forEach((orbit, oi) => {
      const speed = (0.8 + oi * 0.3) * orbit.dir;
      for (let ei = 0; ei < orbit.eCount; ei++) {
        electronAngles[ai][oi][ei] += dt * speed;
        const angle = electronAngles[ai][oi][ei];
        const ex = orbit.a * Math.cos(angle);
        const ey = orbit.b * Math.sin(angle);
        const px = cx + ex * Math.cos(orbit.tilt) - ey * Math.sin(orbit.tilt);
        const py = cy + ex * Math.sin(orbit.tilt) + ey * Math.cos(orbit.tilt);
        electronTrails[ai][oi][ei].unshift({ x: px, y: py });
        if (electronTrails[ai][oi][ei].length > TRAIL_STEPS) {
          electronTrails[ai][oi][ei].length = TRAIL_STEPS;
        }
      }
    });
  });
}
```

- [ ] **Step 2: Add nucleus + electron drawing function**

Add after `updateElectrons`:

```typescript
function drawAtoms(phase: number) {
  const nAtoms = lerp(0, 6, ease(clamp((phase - 0.30) / 0.55, 0, 1)));
  if (nAtoms < 0.01) return;

  const accent = paletteLeft(phase);
  const PW = cvsL.width;
  const PH = cvsL.height;

  ATOM_DEFS.forEach((atom, ai) => {
    const atomAlpha = clamp(nAtoms - ai - ai * 0.05, 0, 1);
    if (atomAlpha < 0.01) return;

    const cx = atom.rx * PW;
    const cy = atom.ry * PH;
    const pulse = 1 + 0.15 * Math.sin(T * 1.5 + atom.protons * 0.4);

    // Nucleus glow
    const grd = ctxL.createRadialGradient(cx, cy, 0, cx, cy, atom.nucleusR * 2.6 * pulse);
    grd.addColorStop(0, accent + Math.round(atomAlpha * 68).toString(16).padStart(2, '0'));
    grd.addColorStop(1, accent + '00');
    ctxL.beginPath();
    ctxL.arc(cx, cy, atom.nucleusR * 2.6 * pulse, 0, Math.PI * 2);
    ctxL.fillStyle = grd;
    ctxL.fill();

    // Nucleons
    const total = Math.min(atom.protons + atom.neutrons, 14);
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2 + T * 0.15;
      const ring = Math.floor(i / 6);
      const nr = (ring + 1) * (atom.nucleusR * 0.45);
      const nx = cx + Math.cos(a) * nr;
      const ny = cy + Math.sin(a) * nr;
      ctxL.beginPath();
      ctxL.arc(nx, ny, 1.5, 0, Math.PI * 2);
      ctxL.fillStyle = i < atom.protons ? '#ff8844' : '#5588aa';
      ctxL.globalAlpha = atomAlpha;
      ctxL.fill();
      ctxL.globalAlpha = 1;
    }

    // Core
    ctxL.beginPath();
    ctxL.arc(cx, cy, atom.nucleusR * 0.5, 0, Math.PI * 2);
    ctxL.fillStyle = accent;
    ctxL.globalAlpha = atomAlpha;
    ctxL.fill();
    ctxL.globalAlpha = 1;

    // Electron orbits
    atom.orbits.forEach((orbit, oi) => {
      // Draw orbit ellipse
      ctxL.save();
      ctxL.translate(cx, cy);
      ctxL.rotate(orbit.tilt);
      ctxL.beginPath();
      ctxL.ellipse(0, 0, orbit.a, orbit.b, 0, 0, Math.PI * 2);
      ctxL.strokeStyle = accent + Math.round(atomAlpha * 40).toString(16).padStart(2, '0');
      ctxL.lineWidth = 0.5;
      ctxL.stroke();
      ctxL.restore();

      // Draw electrons with trails
      for (let ei = 0; ei < orbit.eCount; ei++) {
        const trail = electronTrails[ai][oi][ei];
        if (trail.length < 2) continue;

        // Outer trail
        ctxL.beginPath();
        ctxL.moveTo(trail[0].x, trail[0].y);
        for (let t = 1; t < trail.length; t++) ctxL.lineTo(trail[t].x, trail[t].y);
        ctxL.strokeStyle = accent + Math.round(atomAlpha * 85).toString(16).padStart(2, '0');
        ctxL.lineWidth = 1.4 + oi * 0.2;
        ctxL.stroke();

        // Inner bright trail
        const innerLen = Math.floor(trail.length * 0.35);
        ctxL.beginPath();
        ctxL.moveTo(trail[0].x, trail[0].y);
        for (let t = 1; t < innerLen; t++) ctxL.lineTo(trail[t].x, trail[t].y);
        ctxL.strokeStyle = accent + Math.round(atomAlpha * 153).toString(16).padStart(2, '0');
        ctxL.lineWidth = 0.55;
        ctxL.stroke();

        // Electron dot
        const head = trail[0];
        ctxL.beginPath();
        ctxL.arc(head.x, head.y, 2.1 + oi * 0.25, 0, Math.PI * 2);
        ctxL.fillStyle = accent;
        ctxL.globalAlpha = atomAlpha;
        ctxL.fill();
        ctxL.globalAlpha = 1;
      }
    });
  });
}
```

- [ ] **Step 3: Wire updateElectrons and drawAtoms into the loop**

Update `renderLeft` and `frame`:

```typescript
function renderLeft(phase: number, dt: number) {
  ctxL.clearRect(0, 0, cvsL.width, cvsL.height);
  ctxL.fillStyle = 'rgba(3, 5, 13, 0.92)';
  ctxL.fillRect(0, 0, cvsL.width, cvsL.height);

  drawStars(phase);
  drawProtoAtoms(phase);
  drawAtoms(phase);
}
```

In `frame`, add before `renderLeft`:

```typescript
updateElectrons(dt, currentPhase);
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Scroll from 30% to 70% of the page. Expect: atoms appearing one by one with glowing nuclei and orbiting electrons. H appears near top of panel, Na near bottom. Electrons leave luminous trails.

- [ ] **Step 5: Commit**

```bash
git add src/components/LateralPanels.astro
git commit -m "feat: add atoms with nucleus and electron orbit rendering"
```

---

## Task 7: Quantum Jumps + Molecular Bonds

**Files:**
- Modify: `src/components/LateralPanels.astro`

- [ ] **Step 1: Add quantum jump state**

Add after the `electronTrails` declaration:

```typescript
// ── Quantum jumps ─────────────────────────────────────────────
interface JumpState {
  timer: number;
  threshold: number;
  jumping: boolean;
  jumpT: number;
  sparks: { angle: number; speed: number }[];
}

const jumpStates: JumpState[][] = ATOM_DEFS.map(atom =>
  atom.orbits.map(() => ({
    timer: 0,
    threshold: 6 + Math.random() * 14,
    jumping: false,
    jumpT: 0,
    sparks: Array.from({ length: 5 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 20 + Math.random() * 30,
    })),
  }))
);
```

- [ ] **Step 2: Add jump update and draw inside updateElectrons**

Inside `updateElectrons`, after the electron angle update loop, add:

```typescript
// Quantum jump update
atom.orbits.forEach((_orbit, oi) => {
  if (atom.orbits.length < 2) return; // need 2+ orbits to jump
  const js = jumpStates[ai][oi];
  if (js.jumping) {
    js.jumpT += dt * 2;
    if (js.jumpT >= 1) { js.jumping = false; js.jumpT = 0; }
  } else {
    js.timer += dt;
    if (js.timer > js.threshold) {
      js.timer = 0;
      js.threshold = 6 + Math.random() * 14;
      js.jumping = true;
      js.jumpT = 0;
    }
  }
});
```

- [ ] **Step 3: Add quantum jump rendering inside drawAtoms**

Add inside `drawAtoms`, after drawing each electron dot, add at the end of the `atom.orbits.forEach` block:

```typescript
// Quantum jump flash
if (atom.orbits.length > 1) {
  const js = jumpStates[ai][oi];
  if (js.jumping && js.jumpT < 1) {
    const flashAlpha = atomAlpha * (1 - js.jumpT) * 0.8;
    const head = electronTrails[ai][oi][0] ?? { x: cx, y: cy };
    // Sparks
    js.sparks.forEach(spark => {
      const dist = js.jumpT * spark.speed;
      const sx = head.x + Math.cos(spark.angle) * dist;
      const sy = head.y + Math.sin(spark.angle) * dist;
      ctxL.beginPath();
      ctxL.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctxL.fillStyle = '#ffffff';
      ctxL.globalAlpha = flashAlpha * (1 - js.jumpT);
      ctxL.fill();
      ctxL.globalAlpha = 1;
    });
    // White flash
    ctxL.beginPath();
    ctxL.arc(head.x, head.y, 4 * (1 - js.jumpT), 0, Math.PI * 2);
    ctxL.fillStyle = '#ffffff';
    ctxL.globalAlpha = flashAlpha;
    ctxL.fill();
    ctxL.globalAlpha = 1;
  }
}
```

- [ ] **Step 4: Add molecular bonds**

Add after `drawAtoms`:

```typescript
// ── Molecular bonds ───────────────────────────────────────────
const BONDS: [number, number, number][] = [
  [0, 2, 1], [1, 3, 2], [2, 3, 1], [3, 4, 2], [4, 5, 1],
];

const bondParticleT: number[] = BONDS.map((_, i) => i * 0.2);

function drawBonds(phase: number) {
  const bondAlpha = ease(clamp((phase - 0.70) / 0.22, 0, 1));
  if (bondAlpha < 0.01) return;

  const accent = paletteLeft(phase);
  const PW = cvsL.width;
  const PH = cvsL.height;

  BONDS.forEach(([fromIdx, toIdx, bondOrder], bi) => {
    const from = ATOM_DEFS[fromIdx];
    const to = ATOM_DEFS[toIdx];
    const x1 = from.rx * PW, y1 = from.ry * PH;
    const x2 = to.rx * PW,   y2 = to.ry * PH;

    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len, ny = dx / len; // perpendicular normal

    for (let b = 0; b < bondOrder; b++) {
      const offset = bondOrder === 1 ? 0 : (b - (bondOrder - 1) / 2) * 3;
      const ox = nx * offset, oy = ny * offset;

      // Glow layer
      ctxL.beginPath();
      ctxL.moveTo(x1 + ox, y1 + oy);
      ctxL.lineTo(x2 + ox, y2 + oy);
      ctxL.strokeStyle = accent + Math.round(bondAlpha * 77).toString(16).padStart(2, '0');
      ctxL.lineWidth = 3;
      ctxL.stroke();

      // Core line
      ctxL.beginPath();
      ctxL.moveTo(x1 + ox, y1 + oy);
      ctxL.lineTo(x2 + ox, y2 + oy);
      ctxL.strokeStyle = accent + Math.round(bondAlpha * 179).toString(16).padStart(2, '0');
      ctxL.lineWidth = 0.7;
      ctxL.stroke();
    }

    // Flowing particle
    bondParticleT[bi] = (bondParticleT[bi] + 0.004) % 1;
    const pt = bondParticleT[bi];
    const px = x1 + dx * pt;
    const py = y1 + dy * pt;
    ctxL.beginPath();
    ctxL.arc(px, py, 2, 0, Math.PI * 2);
    ctxL.fillStyle = accent;
    ctxL.globalAlpha = bondAlpha;
    ctxL.fill();
    ctxL.globalAlpha = 1;
  });
}
```

- [ ] **Step 5: Call drawBonds in renderLeft**

```typescript
function renderLeft(phase: number, dt: number) {
  ctxL.clearRect(0, 0, cvsL.width, cvsL.height);
  ctxL.fillStyle = 'rgba(3, 5, 13, 0.92)';
  ctxL.fillRect(0, 0, cvsL.width, cvsL.height);

  drawStars(phase);
  drawProtoAtoms(phase);
  drawAtoms(phase);
  drawBonds(phase);
}
```

- [ ] **Step 6: Verify**

```bash
npm run dev
```

Scroll past 70% of the page. Lines connecting atom pairs should appear and thicken. Occasionally electrons on multi-orbit atoms flash white with spark particles. Both effects should appear simultaneously at the Courses/Labs/Contact sections.

- [ ] **Step 7: Commit**

```bash
git add src/components/LateralPanels.astro
git commit -m "feat: add quantum jumps and molecular bonds to left panel"
```

---

## Task 8: Right Panel — PCB Canvas

**Files:**
- Modify: `src/components/LateralPanels.astro`

- [ ] **Step 1: Add PCB trace data**

Add after the `BONDS` declaration:

```typescript
// ── PCB right panel ───────────────────────────────────────────
interface TracePoint { rx: number; ry: number; }

const PCB_TRACES: TracePoint[][] = [
  // Trace A — left spine, straight with branches
  [{ rx: 0.30, ry: 0.02 }, { rx: 0.30, ry: 0.18 }, { rx: 0.15, ry: 0.18 },
   { rx: 0.15, ry: 0.35 }, { rx: 0.30, ry: 0.35 }, { rx: 0.30, ry: 0.52 },
   { rx: 0.15, ry: 0.52 }, { rx: 0.15, ry: 0.68 }, { rx: 0.30, ry: 0.68 },
   { rx: 0.30, ry: 0.98 }],
  // Trace B — right spine with diagonal
  [{ rx: 0.70, ry: 0.02 }, { rx: 0.70, ry: 0.22 }, { rx: 0.85, ry: 0.22 },
   { rx: 0.85, ry: 0.45 }, { rx: 0.70, ry: 0.45 }, { rx: 0.70, ry: 0.60 },
   { rx: 0.85, ry: 0.60 }, { rx: 0.85, ry: 0.78 }, { rx: 0.70, ry: 0.78 },
   { rx: 0.70, ry: 0.98 }],
  // Trace C — center zig-zag
  [{ rx: 0.50, ry: 0.05 }, { rx: 0.50, ry: 0.28 }, { rx: 0.65, ry: 0.28 },
   { rx: 0.65, ry: 0.50 }, { rx: 0.35, ry: 0.50 }, { rx: 0.35, ry: 0.72 },
   { rx: 0.50, ry: 0.72 }, { rx: 0.50, ry: 0.95 }],
  // Trace D — outer boundary loop
  [{ rx: 0.08, ry: 0.08 }, { rx: 0.92, ry: 0.08 }, { rx: 0.92, ry: 0.40 },
   { rx: 0.08, ry: 0.40 }, { rx: 0.08, ry: 0.60 }, { rx: 0.92, ry: 0.60 },
   { rx: 0.92, ry: 0.92 }, { rx: 0.08, ry: 0.92 }],
];

const PCB_VIAS: { rx: number; ry: number }[] = [
  { rx: 0.30, ry: 0.18 }, { rx: 0.30, ry: 0.35 }, { rx: 0.30, ry: 0.52 },
  { rx: 0.70, ry: 0.22 }, { rx: 0.70, ry: 0.45 }, { rx: 0.70, ry: 0.60 },
  { rx: 0.50, ry: 0.28 }, { rx: 0.50, ry: 0.72 }, { rx: 0.65, ry: 0.50 },
  { rx: 0.35, ry: 0.50 }, { rx: 0.92, ry: 0.40 }, { rx: 0.08, ry: 0.60 },
];

// Signal dot offsets along each trace (0..1)
const signalOffsets: number[] = PCB_TRACES.map((_, i) => i * 0.25);
const TRACE_VARIATIONS = [1.0, 0.85, 1.15, 0.70];
```

- [ ] **Step 2: Add path-length utilities for trace traversal**

Add after the PCB data:

```typescript
function getTraceLength(trace: TracePoint[], PW: number, PH: number): number {
  let len = 0;
  for (let i = 1; i < trace.length; i++) {
    const dx = (trace[i].rx - trace[i-1].rx) * PW;
    const dy = (trace[i].ry - trace[i-1].ry) * PH;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function getPosAlongTrace(trace: TracePoint[], t: number, PW: number, PH: number): { x: number; y: number } {
  const totalLen = getTraceLength(trace, PW, PH);
  let target = t * totalLen;
  for (let i = 1; i < trace.length; i++) {
    const dx = (trace[i].rx - trace[i-1].rx) * PW;
    const dy = (trace[i].ry - trace[i-1].ry) * PH;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (target <= segLen) {
      const frac = segLen > 0 ? target / segLen : 0;
      return {
        x: (trace[i-1].rx + (trace[i].rx - trace[i-1].rx) * frac) * PW,
        y: (trace[i-1].ry + (trace[i].ry - trace[i-1].ry) * frac) * PH,
      };
    }
    target -= segLen;
  }
  return { x: trace[trace.length - 1].rx * PW, y: trace[trace.length - 1].ry * PH };
}
```

- [ ] **Step 3: Replace renderRight with full PCB render**

Replace the stub `renderRight` with:

```typescript
function renderRight(phase: number) {
  const PW = cvsR.width;
  const PH = cvsR.height;
  const accent = paletteRight(phase);

  ctxR.clearRect(0, 0, PW, PH);
  ctxR.fillStyle = 'rgba(3, 8, 5, 0.97)';
  ctxR.fillRect(0, 0, PW, PH);

  // Grid
  ctxR.strokeStyle = '#091508';
  ctxR.lineWidth = 0.25;
  for (let x = 0; x < PW; x += 10) {
    ctxR.beginPath(); ctxR.moveTo(x, 0); ctxR.lineTo(x, PH); ctxR.stroke();
  }
  for (let y = 0; y < PH; y += 10) {
    ctxR.beginPath(); ctxR.moveTo(0, y); ctxR.lineTo(PW, y); ctxR.stroke();
  }

  // Traces
  ctxR.strokeStyle = accent + '99';
  ctxR.lineWidth = 1;
  PCB_TRACES.forEach(trace => {
    ctxR.beginPath();
    ctxR.moveTo(trace[0].rx * PW, trace[0].ry * PH);
    for (let i = 1; i < trace.length; i++) {
      ctxR.lineTo(trace[i].rx * PW, trace[i].ry * PH);
    }
    ctxR.stroke();
  });

  // Vias
  PCB_VIAS.forEach(via => {
    ctxR.beginPath();
    ctxR.arc(via.rx * PW, via.ry * PH, 2.8, 0, Math.PI * 2);
    ctxR.strokeStyle = accent;
    ctxR.lineWidth = 1;
    ctxR.stroke();
    // Via center dot
    ctxR.beginPath();
    ctxR.arc(via.rx * PW, via.ry * PH, 1, 0, Math.PI * 2);
    ctxR.fillStyle = accent + 'aa';
    ctxR.fill();
  });

  // IC component (ATmega-style)
  const icX = PW * 0.20, icY = PH * 0.42, icW = PW * 0.60, icH = PH * 0.10;
  ctxR.strokeStyle = accent + 'aa';
  ctxR.lineWidth = 1;
  ctxR.strokeRect(icX, icY, icW, icH);
  // IC label (tiny)
  ctxR.fillStyle = accent + '55';
  ctxR.font = `${Math.max(6, PW * 0.08)}px monospace`;
  ctxR.fillText('ATmega', icX + icW * 0.15, icY + icH * 0.65);

  // Capacitors
  const capW = PW * 0.08, capH = PH * 0.04;
  [[0.05, 0.20], [0.05, 0.75]].forEach(([crx, cry]) => {
    ctxR.strokeStyle = accent + '88';
    ctxR.lineWidth = 0.8;
    ctxR.strokeRect(crx * PW - capW / 2, cry * PH - capH / 2, capW, capH);
  });

  // Signal dots
  const speed = 1 + currentPhase * 2.5;
  PCB_TRACES.forEach((trace, ti) => {
    signalOffsets[ti] = (signalOffsets[ti] + 0.00007 * speed * TRACE_VARIATIONS[ti]) % 1;
    const pos = getPosAlongTrace(trace, signalOffsets[ti], PW, PH);

    // Glow ring
    ctxR.beginPath();
    ctxR.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctxR.fillStyle = accent + '38';
    ctxR.fill();

    // Core dot
    ctxR.beginPath();
    ctxR.arc(pos.x, pos.y, 2.2, 0, Math.PI * 2);
    ctxR.fillStyle = accent;
    ctxR.fill();

    // Bright center
    ctxR.beginPath();
    ctxR.arc(pos.x, pos.y, 0.8, 0, Math.PI * 2);
    ctxR.fillStyle = '#ffffff';
    ctxR.fill();
  });
}
```

- [ ] **Step 4: Verify right panel**

```bash
npm run dev
```

Right panel should show: dark green grid, 4 trace paths, 12 via circles, one IC rectangle, two capacitor rectangles. Four glowing dots traverse the traces. As you scroll, dots accelerate and color shifts from green toward aqua.

- [ ] **Step 5: Commit**

```bash
git add src/components/LateralPanels.astro
git commit -m "feat: add PCB canvas to right panel with traces, vias, and signal dots"
```

---

## Task 9: Final Integration + Polish

**Files:**
- Modify: `src/components/LateralPanels.astro`

- [ ] **Step 1: Add mask gradient to both panels (matches existing SVG panels)**

Add to `<style>`:

```css
.panel-left {
  mask-image: linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%);
}
.panel-right {
  mask-image: linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%);
}
```

- [ ] **Step 2: Add opacity fade-in on load**

Add to `<style>`:

```css
.panel {
  opacity: 0;
  transition: opacity 0.8s ease;
}
.panel.ready {
  opacity: 0.85;
}
```

In `<script>`, after `requestAnimationFrame(frame)`:

```typescript
// Fade in after first frame renders
requestAnimationFrame(() => {
  panelL.classList.add('ready');
  panelR.classList.add('ready');
});
```

- [ ] **Step 3: Verify full experience**

```bash
npm run dev
```

Full scroll test checklist:
- Hero (0%): blue star trails on left, green PCB dots on right
- About (~24%): stars fading, proto-atoms appearing
- Projects (~44%): atoms H/He/C/O with electron orbits
- Creative (~58%): atoms N/Na appearing, color shifting to teal
- Courses (~72%): molecular bonds forming
- Labs (~85%): full molecular complexity, both panels aqua
- Contact (100%): maximum bond visibility, PCB dots fast

- [ ] **Step 4: Final commit**

```bash
git add src/components/LateralPanels.astro src/pages/index.astro
git commit -m "feat: complete LateralPanels canvas upgrade — Stars→Molecules left, PCB right"
```

---

## Self-Review

**Spec coverage:**
- §2 Layout (fixed, 80px, 100vh) → Task 1 ✓
- §3 Scroll→phase + 7 sections → Task 3 ✓
- §4 Left panel star field → Task 4 ✓
- §4.3 Proto-atoms → Task 5 ✓
- §4.5–4.6 Atoms + electrons → Task 6 ✓
- §4.7 Quantum jumps → Task 7 ✓
- §4.8 Molecular bonds → Task 7 ✓
- §5 Right panel PCB → Task 8 ✓
- §6 Unified rAF loop → Task 3 ✓
- §7 Astro integration → Task 1 ✓
- §9 Out of scope (no HUD, no grid layout) → correctly excluded ✓

**Type consistency:** `electronAngles`, `electronTrails`, `jumpStates` all indexed `[ai][oi][ei]` consistently across Tasks 6 and 7. `PCB_TRACES` typed as `TracePoint[][]`, used consistently in Task 8. `signalOffsets` array length matches `PCB_TRACES.length`. ✓

**No placeholders:** all code blocks contain complete, runnable code. ✓
