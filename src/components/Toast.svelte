<script>
  import { fade } from 'svelte/transition';
  import { ui } from '#lib/ui.svelte.js';
</script>
{#if ui.toast}<div class="toast" role="status" transition:fade={{ duration: 120 }}>{ui.toast}</div>{/if}
