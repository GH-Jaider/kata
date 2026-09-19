<script>
  // First page next to the latest: the app's real feedback.
  import Thumb from './Thumb.svelte';
  import Figure from '#lib/figures/Figure.svelte';
  import { fmtDate } from '#lib/logic.js';
  let { pair = null, figure = 'page', latestLabel = 'Today', onopen } = $props();
</script>

<div class="pair">
  <figure>
    <button class="ph then" onclick={() => pair && onopen?.(pair.first)} disabled={!pair}>
      {#if pair}<Thumb photo={pair.first} alt="First attempt" />{:else}<span class="fig"><Figure name={figure} /></span>{/if}
    </button>
    <figcaption class="cap">{pair ? `Day 1 · ${fmtDate(pair.first.date)}` : 'Your first page will sit here'}</figcaption>
  </figure>
  <figure>
    <button class="ph" onclick={() => pair && onopen?.(pair.latest)} disabled={!pair}>
      {#if pair}<Thumb photo={pair.latest} alt="Latest attempt" />{:else}<span class="fig"><Figure name={figure} /></span>{/if}
    </button>
    <figcaption class="cap"><b>{pair ? (pair.latest.date === pair.first.date && pair.count === 1 ? latestLabel : fmtDate(pair.latest.date)) : latestLabel}</b></figcaption>
  </figure>
</div>

<style>
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  figure { margin: 0; }
  .ph { display: block; width: 100%; aspect-ratio: 4 / 3; background: var(--paper-2); border: 2px solid var(--ink); overflow: hidden; color: var(--ink); }
  .ph.then { border-color: var(--line); color: var(--faint); }
  .ph:disabled { opacity: 1; cursor: default; }
  .fig { display: grid; place-items: center; width: 100%; height: 100%; padding: 14%; }
  .cap { margin-top: 8px; font-weight: 500; font-size: 14px; }
  .cap b { color: var(--c2); }
</style>
