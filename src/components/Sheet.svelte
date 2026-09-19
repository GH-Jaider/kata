<script>
  import { fade, fly } from 'svelte/transition';
  let { title = '', onclose, children } = $props();
  function key(e) { if (e.key === 'Escape') onclose?.(); }
</script>

<svelte:window onkeydown={key} />
<div class="sheet-back" transition:fade={{ duration: 120 }} onclick={e => { if (e.target === e.currentTarget) onclose?.(); }} role="presentation">
  <div class="sheet" role="dialog" aria-label={title} transition:fly={{ y: 24, duration: 160 }}>
    <div class="head"><h2>{title}</h2><button class="btn text" onclick={onclose} aria-label="Close">✕</button></div>
    {@render children?.()}
  </div>
</div>
