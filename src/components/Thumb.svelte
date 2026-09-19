<script>
  // A photo from the local store, loaded lazily into an object URL.
  import { photoBlob } from '#lib/store.svelte.js';
  let { photo, alt = '' } = $props();
  let url = $state(null);
  $effect(() => {
    let mine = null;
    photoBlob(photo.id).then(blob => { if (blob) { mine = URL.createObjectURL(blob); url = mine; } });
    return () => { if (mine) URL.revokeObjectURL(mine); };
  });
</script>
{#if url}<img src={url} {alt} width={photo.w} height={photo.h} />{:else}<span class="ph-empty"></span>{/if}
<style>
  img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .ph-empty { display: block; width: 100%; height: 100%; }
</style>
