<script>
  // A thin-line figure. With `animate`, each part draws itself in order (Svelte's draw transition), unless the user
  // prefers reduced motion. Colour comes from currentColor, so it takes the block's ink.
  import { draw } from 'svelte/transition';
  import { figures, glyphs } from './library.js';

  let { name = 'page', glyph = false, animate = false, stroke = 1.25, duration = 520, stagger = 90, delay = 0, label = '' } = $props();
  const lib = $derived(glyph ? glyphs : figures);
  const fig = $derived(lib[name] || figures.page);
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const go = $derived(animate && !reduce);
</script>

{#key name}
  <svg viewBox={fig.viewBox} fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'}>
    {#each fig.parts as p, i (i)}
      {#if p.fill}
        <path d={p.d} fill="currentColor" stroke="none" opacity={p.o ?? 1} transform={p.transform} style={go ? `animation: fig-in 240ms ${delay + stagger * i}ms both` : undefined} />
      {:else if go}
        <path d={p.d} stroke-dasharray={p.dash} opacity={p.o ?? 1} transform={p.transform} in:draw={{ duration, delay: delay + stagger * i }} />
      {:else}
        <path d={p.d} stroke-dasharray={p.dash} opacity={p.o ?? 1} transform={p.transform} />
      {/if}
    {/each}
  </svg>
{/key}

<style>
  svg { width: 100%; height: auto; display: block; overflow: visible; }
  svg :global(path) { vector-effect: non-scaling-stroke; }
  @keyframes fig-in { from { opacity: 0; } }
</style>
