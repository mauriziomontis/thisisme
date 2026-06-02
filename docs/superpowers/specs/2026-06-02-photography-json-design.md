# Photography JSON + Optimized Grid — Design Spec

**Date:** 2026-06-02  
**Status:** Approved

---

## Goal

Replace the hardcoded placeholder divs in the `Creative.astro` photography tab with real images driven by a JSON file. Images must be proportionally sized and harmonized to the masonry grid, not served at full resolution.

---

## JSON Schema — `src/content/photos.json`

```json
{
  "photos": [
    { "src": "IMG_001.jpg", "alt": "Description for accessibility" },
    ...
  ]
}
```

- `src`: filename only (no path). Resolved to `public/images/<src>` at build time.
- `alt`: plain text description for screen readers and SEO.
- No `tall` field — derived automatically from image dimensions at build time.

**Initial population:** all 10 existing `IMG_001.jpg`–`IMG_010.jpg` files.

---

## Build-time `tall` Detection

In `Creative.astro` frontmatter:

1. Import `fs` and `sharp` (available in all Astro projects via Vite).
2. For each photo entry, read the file from `public/images/<src>`.
3. Use `sharp().metadata()` to get `width` and `height`.
4. Mark the entry as `tall` if `height > width` (portrait orientation).

This keeps the JSON clean and makes `tall` maintenance-free when photos are added.

---

## Rendering

Use Astro's `<Image>` component from `astro:assets` for automatic optimization:

- `src`: resolved via `import.meta.glob` or direct path reference under `public/`.
- `width`: column width target (~300px, matching the masonry column size).
- `densities`: `[1, 2]` for retina screens.
- `format`: `webp` (with JPEG fallback via `<picture>` if needed, though `<Image>` handles this).

Each photo cell keeps the existing `.photo-placeholder` wrapper with the `tall` class when appropriate. The `<Image>` fills the cell:

```css
.photo-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  border-radius: inherit;
}
```

The cell dimensions remain unchanged:
- Normal: `180px` height (desktop), `160px` (mobile)
- Tall: `260px` height (desktop), `220px` (mobile)

---

## What Does NOT Change

- CSS grid/masonry layout (`.photo-grid { columns: 3 200px; ... }`)
- Responsive breakpoints already in place
- The `tall`/normal height values
- Any other Creative.astro tab (Music, Travel)

---

## Files Touched

| File | Change |
|------|--------|
| `src/content/photos.json` | **New** — 10 photo entries |
| `src/components/Creative.astro` | Replace placeholder loop with JSON-driven `<Image>` loop; add `sharp` metadata read in frontmatter |
