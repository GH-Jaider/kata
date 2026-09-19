<script>
  // How Kata is meant to be used: one screen per setup, snap-scrolled like a deck. A drawing, a title, two lines.
  import Mast from '#components/Mast.svelte';
  import { startTour } from '#lib/tour.js';
  import { navigate } from '#lib/ui.svelte.js';
  import { cur } from '#lib/store.svelte.js';

  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let deck;
  let current = $state(0);
  const total = 6;
  function watch(node) {
    const panels = [...node.querySelectorAll('.panel')];
    const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) current = panels.indexOf(e.target); }, { root: node, threshold: 0.6 });
    panels.forEach(p => io.observe(p));
    return { destroy: () => io.disconnect() };
  }
  function go(i) { deck?.querySelectorAll('.panel')[i]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
</script>

<Mast meta="How Kata is meant to be used" />
<div class="deck" bind:this={deck} use:watch>

  <section class="panel c1">
    <figure class="mock" aria-hidden="true">
      <svg viewBox="0 0 320 200" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="22" y="40" width="130" height="86" rx="5"/><path d="M8 126h158l10 14H-2z" transform="translate(4 0)"/>
        <rect x="32" y="50" width="110" height="66" rx="2"/>
        <rect x="40" y="58" width="40" height="50" fill="currentColor" opacity=".16" stroke="none"/>
        <rect x="84" y="58" width="50" height="22" fill="currentColor" opacity=".3" stroke="none"/>
        <text x="86" y="104" font-size="18" font-weight="700" fill="currentColor" stroke="none" font-family="inherit" letter-spacing="-1">19:56</text>
        <rect x="186" y="34" width="122" height="94" rx="9" transform="rotate(-4 247 81)"/>
        <rect x="196" y="44" width="102" height="74" rx="2" transform="rotate(-4 247 81)"/>
        <path d="M212 96c14-28 34-36 50-22s12 26 34 10" opacity=".7" transform="rotate(-4 247 81)"/>
        <path d="M216 62c10 4 22 3 30-4M230 104c14-2 28 0 40 4" opacity=".45" transform="rotate(-4 247 81)"/>
        <path d="M232 168l66-36" stroke-width="5" opacity=".9"/><path d="M298 132l8-4" stroke-width="5" opacity=".5"/>
      </svg>
    </figure>
    <div class="k">Setup 1 · Mac beside, iPad in front</div>
    <h2 class="h-poster">Kata on the Mac. Procreate on the whole iPad.</h2>
    <p>The clock and the page read from across the desk. Page done on the Mac, or on the iPad if you open Kata there too.</p>
  </section>

  <section class="panel c2">
    <figure class="mock" aria-hidden="true">
      <svg viewBox="0 0 320 200" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="18" y="20" width="284" height="160" rx="14"/><rect x="32" y="34" width="256" height="132" rx="3"/><path d="M202 34v132"/>
        <path d="M60 120c20-40 50-50 70-30s10 40 40 10" opacity=".7"/><path d="M70 70c14 6 30 4 40-8M90 140c18-4 40-2 60 6" opacity=".45"/>
        <rect x="214" y="46" width="62" height="34" fill="currentColor" opacity=".18" stroke="none"/><rect x="214" y="86" width="62" height="34" fill="currentColor" opacity=".3" stroke="none"/><rect x="214" y="126" width="62" height="22" fill="currentColor" opacity=".12" stroke="none"/>
        <text x="220" y="112" font-size="20" font-weight="700" fill="currentColor" stroke="none" font-family="inherit" letter-spacing="-1">19:56</text>
        <path d="M236 176l60-40" stroke-width="5" opacity=".9"/><path d="M296 136l8-5" stroke-width="5" opacity=".5"/>
      </svg>
    </figure>
    <div class="k">Setup 2 · One iPad, split</div>
    <h2 class="h-poster">Kata at a third. Your canvas on the rest.</h2>
    <p>Slide the web app next to Procreate. Page done with the Pencil. The photo is the export from Procreate, or nothing.</p>
  </section>

  <section class="panel c3">
    <figure class="mock" aria-hidden="true">
      <svg viewBox="0 0 320 200" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M40 30l120-10 8 150-120 10z"/><path d="M60 60h80M62 82h74M64 104h84M66 126h70" opacity=".35"/>
        <path d="M60 60c26 0 52-2 80 0" opacity=".5"/><path d="M62 82c24-2 50 0 74 2" opacity=".5"/>
        <path d="M30 168l150-30" stroke-width="5" opacity=".9"/><path d="M180 138l10-2" stroke-width="5" opacity=".5"/>
        <rect x="204" y="44" width="92" height="124" rx="8" transform="rotate(-6 250 106)"/>
        <rect x="216" y="60" width="66" height="26" fill="currentColor" opacity=".18" stroke="none" transform="rotate(-6 250 106)"/><rect x="216" y="92" width="66" height="26" fill="currentColor" opacity=".3" stroke="none" transform="rotate(-6 250 106)"/>
        <text x="220" y="140" font-size="22" font-weight="700" fill="currentColor" stroke="none" font-family="inherit" letter-spacing="-1" transform="rotate(-6 250 106)">19:56</text>
      </svg>
    </figure>
    <div class="k">Setup 3 · Paper, the way Drawabox asks</div>
    <h2 class="h-poster">Fineliner, printer paper, Kata as the clock.</h2>
    <p>Prop the iPad or the phone beside the page. Photo opens the camera when the page is done.</p>
  </section>

  <section class="panel ink">
    <figure class="mock" aria-hidden="true">
      <svg viewBox="0 0 320 200" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="70" y="22" width="180" height="112" rx="6"/><path d="M50 134h220l14 18H36z"/><rect x="84" y="36" width="152" height="84" rx="2"/>
        <rect x="94" y="46" width="42" height="64" fill="currentColor" opacity=".18" stroke="none"/><rect x="140" y="46" width="42" height="64" fill="currentColor" opacity=".3" stroke="none"/><rect x="186" y="46" width="42" height="64" fill="currentColor" opacity=".12" stroke="none"/>
        <path d="M120 168l86-4 4 26-86 4z"/><path d="M132 178h60M134 186h50" opacity=".4"/><path d="M224 196l60-18" stroke-width="5" opacity=".9"/>
      </svg>
    </figure>
    <div class="k">Setup 4 · Mac on the desk, paper in front</div>
    <h2 class="h-poster">The clock from a metre away.</h2>
    <p>Kata in a browser window. Photos with the phone, same address, or later from Journal.</p>
  </section>

  <section class="panel paper">
    <div class="k mute">A session</div>
    <div class="flow" aria-label="Start, warm-up, one page, page done, free drawing, done">
      <div class="f ink"><b>Start</b></div>
      <div class="f c1"><b>Warm-up</b><span>10 min</span></div>
      <div class="f c2"><b>One page</b><span>next on the path</span></div>
      <div class="f c4"><b>Page done</b><span>counts it</span></div>
      <div class="f c3"><b>Free drawing</b><span>optional</span></div>
      <div class="f edge"><b>Done</b><span>your page next to your first</span></div>
    </div>
    <h2 class="h-poster" style="margin-top:22px">Kata plans it. You draw it.</h2>
    <p class="mute">The clock is a suggestion. Next after each step, Finish whenever you want to stop.</p>
  </section>

  <section class="panel paper last">
    <div class="k mute">Counting</div>
    <h2 class="h-poster">One step is one page.</h2>
    <p class="mute">Page done counts it. Didn't finish? Say so and it won't. Drew without the clock? Add it in Path.</p>
    <div class="acts">
      <button class="btn" onclick={() => { navigate('today'); setTimeout(() => startTour({ fresh: false }), 400); }}>Take the tour</button>
      <a class="btn line" href={cur.links.tools} target="_blank" rel="noopener">Drawabox on tools ↗</a>
    </div>
  </section>

  <nav class="dots" aria-label="Screens">
    {#each Array(total) as _, i}<button class:on={i === current} onclick={() => go(i)} aria-label={`Screen ${i + 1}`}></button>{/each}
  </nav>
  {#if current < total - 1}<button class="next" onclick={() => go(current + 1)} aria-label="Next screen">↓</button>{/if}
</div>

<style>
  .deck { position: relative; height: calc(100vh - var(--mast)); overflow-y: auto; scroll-snap-type: y mandatory; overscroll-behavior: contain; }
  .panel { height: calc(100vh - var(--mast)); scroll-snap-align: start; padding: var(--pad); padding-bottom: calc(var(--pad) + 56px + var(--safe-bottom)); display: flex; flex-direction: column; justify-content: flex-end; gap: 10px; }
  .panel.c1 { background: var(--c1); color: var(--c1-ink); }
  .panel.c2 { background: var(--c2); color: var(--c2-ink); }
  .panel.c3 { background: var(--c3); color: var(--c3-ink); }
  .panel.ink { background: var(--ink); color: var(--paper); }
  .panel.paper { background: var(--paper); color: var(--ink); }
  .panel .k { opacity: .8; }
  .panel h2 { max-width: 14ch; }
  .panel p { max-width: 40ch; font-size: clamp(15px, 1.6vw, 18px); opacity: .9; }
  .mock { margin: 0 0 auto; width: 100%; max-width: 420px; align-self: center; padding-top: 6vh; }
  .mock svg { width: 100%; height: auto; }
  .mock svg * { vector-effect: non-scaling-stroke; }
  .flow { display: grid; gap: 4px; margin-top: 12px; }
  .flow .f { padding: 12px 14px; display: grid; gap: 2px; }
  .flow .f b { font-weight: 700; font-size: 17px; letter-spacing: -.02em; }
  .flow .f span { font-size: 13px; opacity: .85; }
  .flow .ink { background: var(--ink); color: var(--paper); }
  .flow .c1 { background: var(--c1); color: var(--c1-ink); }
  .flow .c2 { background: var(--c2); color: var(--c2-ink); }
  .flow .c3 { background: var(--c3); color: var(--c3-ink); }
  .flow .c4 { background: var(--c4); color: var(--c4-ink); }
  .flow .edge { background: var(--paper); color: var(--ink); border: 2px solid var(--ink); }
  .acts { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 18px; }
  .dots { position: fixed; right: 14px; top: 50%; transform: translateY(-50%); display: grid; gap: 10px; z-index: 5; mix-blend-mode: difference; }
  .dots button { width: 10px; height: 10px; border-radius: 50%; border: 2px solid #F5F1E6; opacity: .55; }
  .dots button.on { background: #F5F1E6; opacity: 1; }
  .next { position: fixed; right: var(--pad); bottom: calc(var(--pad) + var(--safe-bottom)); width: 48px; height: 48px; border-radius: 50%; border: 2px solid #F5F1E6; color: #F5F1E6; font-size: 22px; z-index: 5; mix-blend-mode: difference; }
  @media (min-width: 900px) {
    .panel { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; align-content: center; gap: 12px 64px; padding: var(--pad) calc(var(--pad) * 2); }
    .mock { grid-row: 1 / span 3; margin: 0; max-width: 560px; padding: 0; }
    .panel.paper { display: flex; }
    .flow { grid-template-columns: repeat(6, 1fr); max-width: 1100px; }
  }
  @media (min-width: 600px) and (max-width: 899px) { .flow { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 599px) { .dots { top: auto; right: auto; transform: none; left: var(--pad); bottom: calc(var(--pad) + 19px + var(--safe-bottom)); grid-auto-flow: column; } }
</style>
