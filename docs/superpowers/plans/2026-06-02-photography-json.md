# Photography JSON + Optimized Grid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded photo placeholders in Creative.astro with real images driven by `photos.json`, sized harmoniously in the masonry grid via `object-fit: cover` and sharp-based `tall` detection.

**Architecture:** `photos.json` holds `src` + `alt` per photo. Creative.astro frontmatter reads image dimensions at build time using `sharp` (available as Astro transitive dep) and enriches each entry with a computed `tall: boolean`. The template renders `<img>` tags inside existing `.photo-placeholder` cells. CSS is updated to fill cells properly.

**Tech Stack:** Astro 6, sharp (transitive dep), CSS `object-fit: cover`, `columns` masonry grid.

---

### Task 1: Create `src/content/photos.json`

**Files:**
- Create: `src/content/photos.json`

- [ ] **Step 1: Create the file with all 10 entries**

```json
{
  "photos": [
    { "src": "IMG_001.jpg", "alt": "Sunset over a city skyline with church tower silhouettes" },
    { "src": "IMG_002.jpg", "alt": "Stone water basin with wooden ladles at a Japanese shrine" },
    { "src": "IMG_003.jpg", "alt": "Cat sleeping on an ancient marble column capital" },
    { "src": "IMG_004.jpg", "alt": "Colorful folded silk fabrics stacked at a market stall" },
    { "src": "IMG_005.jpg", "alt": "Ancient olive tree in a rocky Mediterranean landscape" },
    { "src": "IMG_006.jpg", "alt": "Castel Sant Angelo and Ponte Sant Angelo reflected in the Tiber, Rome" },
    { "src": "IMG_007.jpg", "alt": "Dramatic sunset over a marina with sailboat masts silhouetted" },
    { "src": "IMG_008.jpg", "alt": "Primitive trail sign among red rock formations at Arches National Park" },
    { "src": "IMG_009.jpg", "alt": "Ceiling installation of hundreds of colourful Murano glass flowers" },
    { "src": "IMG_010.jpg", "alt": "Blue sky with white clouds and a power line crossing the frame" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/content/photos.json
git commit -m "feat: add photos.json content file"
```

---

### Task 2: Update Creative.astro frontmatter — import photos + compute `tall`

**Files:**
- Modify: `src/components/Creative.astro` (frontmatter block, lines 1–7)

- [ ] **Step 1: Replace the frontmatter block**

Current frontmatter (lines 1–7):
```typescript
---
import music from '../content/music.json';
import GlobeCanvas from './GlobeCanvas.astro';

const tabs = ['Travel', 'Music', 'Photography'];
const BASE = import.meta.env.BASE_URL; // '/thisisme/'
---
```

Replace with:
```typescript
---
import music from '../content/music.json';
import photosData from '../content/photos.json';
import GlobeCanvas from './GlobeCanvas.astro';
import sharp from 'sharp';
import { join } from 'path';

const tabs = ['Travel', 'Music', 'Photography'];
const BASE = import.meta.env.BASE_URL; // '/thisisme/'

const photos = await Promise.all(
  photosData.photos.map(async (photo) => {
    const filePath = join(process.cwd(), 'public', 'images', photo.src);
    const meta = await sharp(filePath).metadata();
    const tall = (meta.height ?? 0) > (meta.width ?? 0);
    return { ...photo, tall };
  })
);
---
```

- [ ] **Step 2: Verify build compiles without errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build completes with no errors. If sharp import fails with "Cannot find module 'sharp'", run `npm install sharp` first.

- [ ] **Step 3: Commit**

```bash
git add src/components/Creative.astro
git commit -m "feat: compute tall flag from image dimensions at build time"
```

---

### Task 3: Replace photography tab HTML with real images

**Files:**
- Modify: `src/components/Creative.astro` (photography tab section, `<!-- Photography -->` block)

- [ ] **Step 1: Locate and replace the photography tab HTML**

Find this block (currently around line 109–118):
```astro
<!-- Photography -->
<div class="tab-panel" data-panel="photography">
  <div class="photo-grid">
    {[1,2,3,4,5,6].map((i) => (
      <div class={`photo-placeholder reveal ${i % 3 === 0 ? 'tall' : ''}`}>
        <span class="label">photo {i}</span>
      </div>
    ))}
  </div>
</div>
```

Replace with:
```astro
<!-- Photography -->
<div class="tab-panel" data-panel="photography">
  <div class="photo-grid">
    {photos.map((photo) => (
      <div class={`photo-placeholder reveal${photo.tall ? ' tall' : ''}`}>
        <img
          src={`${BASE}images/${photo.src}`}
          alt={photo.alt}
          loading="lazy"
          decoding="async"
        />
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Verify build still compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build completes, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Creative.astro
git commit -m "feat: render real photos from photos.json in photography tab"
```

---

### Task 4: Update `.photo-placeholder` CSS to display images correctly

**Files:**
- Modify: `src/components/Creative.astro` (style block — `.photo-placeholder` and `.photo-placeholder.tall` rules)

- [ ] **Step 1: Update the existing `.photo-placeholder` rule**

Find (currently around line 323–335):
```css
.photo-grid { columns: 3 200px; gap: 0.75rem; margin-bottom: 1.5rem; }
.photo-placeholder {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  height: 180px;
  display: flex;
  align-items: flex-end;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  break-inside: avoid;
}
.photo-placeholder.tall { height: 260px; }
```

Replace with:
```css
.photo-grid { columns: 3 200px; gap: 0.75rem; margin-bottom: 1.5rem; }
.photo-placeholder {
  border-radius: 8px;
  height: 180px;
  overflow: hidden;
  display: block;
  margin-bottom: 0.75rem;
  break-inside: avoid;
}
.photo-placeholder.tall { height: 260px; }
.photo-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  transition: transform 0.4s ease;
}
.photo-placeholder:hover img { transform: scale(1.05); }
```

- [ ] **Step 2: Also update the responsive breakpoint rules for `.photo-placeholder`**

Find and update the mobile rules (in the `@media (max-width: 480px)` block):
```css
.photo-grid { columns: 1; }
.photo-placeholder { height: 160px; }
.photo-placeholder.tall { height: 220px; }
```

These heights stay the same — no change needed there.

- [ ] **Step 3: Verify build + dev preview**

```bash
npm run build 2>&1 | tail -5
npm run dev
```

Open `http://localhost:4321/thisisme/` in a browser, navigate to the Creative section, click the Photography tab. Verify:
- All 10 photos appear in the masonry grid
- IMG_004 (colorful fabrics, portrait) renders taller than the rest
- Images fill their cells with no whitespace or distortion
- Hover produces a gentle zoom

- [ ] **Step 4: Commit**

```bash
git add src/components/Creative.astro
git commit -m "feat: style photo cells with object-fit cover and hover zoom"
```
