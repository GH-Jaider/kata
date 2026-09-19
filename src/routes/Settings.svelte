<script>
  import Mast from '#components/Mast.svelte';
  import { db, cur, setSettings, exportBackup, importBackup, wipe } from '#lib/store.svelte.js';
  import { toast, applyTheme } from '#lib/ui.svelte.js';
  import * as L from '#lib/logic.js';
  import { startTour } from '#lib/tour.js';
  import { navigate } from '#lib/ui.svelte.js';

  const sel = (key, values, label = v => String(v)) => ({ key, values, label });
  let confirm = $state(null);
  async function doExport() {
    const text = await exportBackup();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = `kata-backup-${L.todayKey()}.json`;
    document.body.append(a); a.click(); a.remove();
    toast('Backup ready');
  }
  async function doImport(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try { await importBackup(await f.text()); applyTheme(db.settings.theme); toast('Backup restored'); }
    catch (err) { toast(err.message || 'Could not read that file'); }
    e.target.value = '';
  }
  async function erase() { await wipe(); localStorage.removeItem('kata.run'); confirm = null; toast('Erased'); }
</script>

<Mast meta="Settings" />
<main class="page wrap">
  <div class="k mute">Kata</div>
  <h1 class="h-poster" style="margin-top:6px">Settings</h1>

  <section class="group">
    <span class="k mute">Session</span>
    <div class="field"><div><span class="lbl">Study time</span><div class="hint">Warm-ups plus homework</div></div><select value={db.settings.studyMinutes} onchange={e => setSettings({ studyMinutes: Number(e.target.value) })}>{#each [15, 20, 25, 30, 40, 45, 60, 90] as v}<option value={v}>{v} min</option>{/each}</select></div>
    <div class="field"><div><span class="lbl">Warm-ups</span><div class="hint">Drawabox suggests 10 to 15</div></div><select value={db.settings.warmupMinutes} onchange={e => setSettings({ warmupMinutes: Number(e.target.value) })}>{#each [5, 10, 15, 20] as v}<option value={v}>{v} min</option>{/each}</select></div>
    <div class="field"><div><span class="lbl">Warm-up exercises</span><div class="hint">Per session</div></div><select value={db.settings.warmupCount} onchange={e => setSettings({ warmupCount: Number(e.target.value) })}>{#each [1, 2, 3, 4] as v}<option value={v}>{v}</option>{/each}</select></div>
    <div class="field"><div><span class="lbl">Free drawing</span><div class="hint">The 50% rule: at least as much as study</div></div><select value={db.settings.playMinutes} onchange={e => setSettings({ playMinutes: Number(e.target.value) })}>{#each [10, 15, 20, 30, 45, 60, 90] as v}<option value={v}>{v} min</option>{/each}</select></div>
    <div class="field"><div><span class="lbl">Days a week</span><div class="hint">The rest are spare days, not failures</div></div><select value={db.settings.weeklyGoal} onchange={e => setSettings({ weeklyGoal: Number(e.target.value) })}>{#each [3, 4, 5, 6, 7] as v}<option value={v}>{v} of 7</option>{/each}</select></div>
  </section>

  <section class="group">
    <span class="k mute">You</span>
    <div class="field"><span class="lbl">Drawing on</span><div class="seg"><button class:on={db.settings.medium === 'paper'} onclick={() => setSettings({ medium: 'paper' })}>Paper</button><button class:on={db.settings.medium === 'tablet'} onclick={() => setSettings({ medium: 'tablet' })}>Tablet</button></div></div>
    <div class="field"><span class="lbl">Sound when a block ends</span><div class="seg"><button class:on={db.settings.sound} onclick={() => setSettings({ sound: true })}>On</button><button class:on={!db.settings.sound} onclick={() => setSettings({ sound: false })}>Off</button></div></div>
    <div class="field"><span class="lbl">Theme</span><div class="seg">{#each [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']] as [v, l]}<button class:on={db.settings.theme === v} onclick={() => { applyTheme(v); setSettings({ theme: v }); }}>{l}</button>{/each}</div></div>
  </section>

  <section class="group">
    <span class="k mute">Data</span>
    <div class="field"><div><span class="lbl">Export backup</span><div class="hint">One JSON file with sessions, progress and photos</div></div><button class="btn line" style="height:40px;font-size:15px" onclick={doExport}>Export</button></div>
    <div class="field"><div><span class="lbl">Import backup</span><div class="hint">Replaces everything on this device</div></div><label class="btn line" style="height:40px;font-size:15px">Choose file<input class="sr" type="file" accept="application/json,.json" onchange={doImport}></label></div>
    <div class="field"><div><span class="lbl" style="color:var(--c2)">Start over</span><div class="hint">Erases sessions, progress, photos and settings on this device</div></div>
      {#if confirm === 'erase'}<span style="display:flex;gap:12px"><button class="btn text" style="color:var(--c2)" onclick={erase}>Yes, start over</button><button class="btn text dim" onclick={() => (confirm = null)}>Keep</button></span>
      {:else}<button class="btn line" style="height:40px;font-size:15px" onclick={() => (confirm = 'erase')}>Start over</button>{/if}
    </div>
  </section>

  <section class="group">
    <span class="k mute">How Kata works</span>
    <p class="small mute" style="margin-top:10px">Drawabox is 7 lessons and 4 challenges, in order. Each lesson is a handful of exercises with a page count. Kata plans one session a day in steps: a short warm-up from exercises you already know, one exercise from the path, then drawing for yourself. Start runs the clock; Next moves to the next step; + counts a finished page; Photo keeps the page so you can compare it with your first one later. When an exercise reaches its page count, the path moves to the next one.</p>
    <button class="btn line" style="height:40px;font-size:15px;margin-top:12px" onclick={() => { navigate('today'); setTimeout(() => startTour({ fresh: false }), 400); }}>Take the tour</button>
    <a class="btn line" style="height:40px;font-size:15px;margin-top:12px;margin-left:10px" href="#/howto">How to set it up</a>
  </section>

  <section class="group">
    <span class="k mute">About</span>
    <p class="small mute" style="margin-top:10px">Kata plans one short drawing session a day, runs the clock, counts your pages and keeps your photos side by side so you can see the change. Everything stays on this device unless you export it.</p>
    <p class="small mute" style="margin-top:10px">{cur.attribution} <a class="ext" href={cur.site} target="_blank" rel="noopener">drawabox.com ↗</a></p>
  </section>
</main>

<style>
  .group { margin-top: 32px; max-width: 720px; }
  .group > .k { display: block; margin-bottom: 6px; }
  .ext { text-decoration: underline; text-underline-offset: 3px; }
</style>
