<script>
  import { onMount } from 'svelte';
  import { db, load } from './lib/store.svelte.js';
  import { loadRun } from './lib/run.svelte.js';
  import { ui, applyTheme } from './lib/ui.svelte.js';
  import Toast from './components/Toast.svelte';
  import Today from './routes/Today.svelte';
  import Session from './routes/Session.svelte';
  import Done from './routes/Done.svelte';
  import Path from './routes/Path.svelte';
  import Card from './routes/Card.svelte';
  import Journal from './routes/Journal.svelte';
  import Settings from './routes/Settings.svelte';
  import HowTo from './routes/HowTo.svelte';

  const views = { today: Today, session: Session, done: Done, path: Path, card: Card, journal: Journal, settings: Settings, howto: HowTo };
  let ready = $state(false);
  const View = $derived(views[ui.route.name] || Today);

  onMount(async () => {
    await load();
    loadRun();
    applyTheme(db.settings.theme);
    ready = true;
  });
</script>

{#if ready}
  {#key ui.route.name + '/' + (ui.route.id || '')}
    <View id={ui.route.id} />
  {/key}
{/if}
<Toast />
