# Kata

A daily drawing session on a real curriculum. Kata plans one short session a day, runs the clock, counts your pages and keeps your photos side by side so you can see the change. Poster look: one flat colour per block, giant type, almost no chrome.

The curriculum it ships with is [Drawabox](https://drawabox.com), the free fundamentals course. Kata only indexes its structure (units, exercises, quotas, links) and writes its own short exercise cards. The lessons live on drawabox.com. Kata is not affiliated with Drawabox.

- **Today**: warm-ups picked from exercises you have already done, the next homework on the path, then free drawing. One button.
- **Session**: full-screen block with the exercise's figure, the steps the first two times, a clock that overflows instead of stopping, a page counter and a photo button.
- **Done**: what you did, where you are, your first page next to today's, one line to fix next time. Then nothing else.
- **Path**: the course in its real order, quotas like 62 / 250, a card per exercise with steps and what to watch for.
- **Journal**: photos by day, "then and now" for any exercise photographed twice, the month in dots.
- Weekly goal of 5 of 7 with spare days instead of a streak. Paper or tablet. Light and dark. Installs on iPad, iPhone and Mac. Everything stays on the device; backup to one JSON file.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview
```

On the iPad, open the Mac's address on the same network, then Share → Add to Home Screen. Or deploy `dist/` anywhere static (Vercel, GitHub Pages).

## Stack

Svelte 5 (runes) with Vite. One runtime dependency, driver.js, for the guided tours. No UI library. IndexedDB for data and photos, localStorage for the running session, a small service worker for offline. Bricolage Grotesque (OFL) self-hosted in `public/fonts`.

```
src/
  App.svelte            hash router and shell
  app.css               poster tokens, masthead, buttons, sheets
  routes/               Today, Session, Done, Path, Card, Journal, Settings
  components/           Mast, Week, Sheet, Toast, Thumb, PhotoPair, Viewer, LogSheet
  lib/logic.js          pure planning, progress, weekly goal, history (tested)
  lib/store.svelte.js   state and persistence
  lib/run.svelte.js     the session runner
  lib/cards.js          Kata's own exercise cards
  lib/tour.js           the guided tours (driver.js): first run, and the first session
  lib/figures/          geometry.js (camera, boxes, cylinders from 3D), library.js, Figure.svelte
curricula/drawabox.json the curriculum index
docs/                   design research, mockups and explorations
legacy/                 v0.1, the vanilla prototype
```

## Tours

The first time the app opens, a guided tour walks Today, Path and Journal and explains each part; the first session gets a shorter one for the clock, the counter, the photo and the Next button. Both can be run again from Settings. They are marked as seen in localStorage (`kata.tour`, `kata.tour.session`).

## Figures

Boxes and cylinders are generated from 3D with a pinhole camera, so every edge really converges to its vanishing point; `test/geometry.test.js` checks it. Organic figures are hand-drawn paths in the same style. `Figure.svelte` draws each part in order with Svelte's `draw` transition, and fades instead when the user prefers reduced motion.

## Tests

```
npm test               # curriculum, logic, geometry
npm run dev            # in another terminal
npm run test:browser   # headless Chrome: first session, photo, done, path, card, journal, settings, three widths
```

