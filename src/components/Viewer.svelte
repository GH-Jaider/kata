<script>
  import { fade } from 'svelte/transition';
  import Thumb from './Thumb.svelte';
  import { deletePhoto, cur } from '#lib/store.svelte.js';
  import { exerciseById, fmtDate } from '#lib/logic.js';
  import { toast } from '#lib/ui.svelte.js';
  let { photo, onclose } = $props();
  const ex = $derived(exerciseById(cur, photo.exerciseId));
  let confirm = $state(false);
  async function del() { await deletePhoto(photo.id); toast('Photo deleted'); onclose?.(); }
</script>

<svelte:window onkeydown={e => e.key === 'Escape' && onclose?.()} />
<div class="viewer" transition:fade={{ duration: 120 }} onclick={e => { if (e.target === e.currentTarget) onclose?.(); }} role="presentation">
  <div class="img"><Thumb {photo} alt={ex ? ex.name : 'Photo'} /></div>
  <div class="bar">
    <span>{ex ? ex.name : 'Free drawing'} · {fmtDate(photo.date, { withYear: true })}</span>
    <span>
      {#if confirm}<button class="btn text" onclick={del} style="color:var(--c3)">Delete for good</button><button class="btn text dim" onclick={() => (confirm = false)}>Keep</button>
      {:else}<button class="btn text dim" onclick={() => (confirm = true)}>Delete</button>{/if}
      <button class="btn text" onclick={onclose}>Close</button>
    </span>
  </div>
</div>

<style>
  .viewer { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, .94); color: #F5F1E6; display: grid; grid-template-rows: 1fr auto; }
  .img { min-height: 0; display: grid; place-items: center; padding: 16px; }
  .img :global(img) { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
  .bar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px var(--pad) calc(14px + var(--safe-bottom)); font-weight: 500; font-size: 15px; }
  .bar span:last-child { display: flex; gap: 16px; }
</style>
