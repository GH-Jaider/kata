<script>
  import PhotoPair from '../components/PhotoPair.svelte';
  import Viewer from '../components/Viewer.svelte';
  import { db, cur, updateSession, setBlockCount } from '../lib/store.svelte.js';
  import { navigate } from '../lib/ui.svelte.js';
  import { figureFor } from '../lib/figures/library.js';
  import * as L from '../lib/logic.js';

  let { id } = $props();
  const s = $derived(db.sessions.find(x => x.id === id));
  $effect(() => { if (!s) navigate('today'); });
  const hw = $derived(s ? s.blocks.find(b => b.kind === 'homework' && b.exerciseId) || s.blocks.find(b => b.exerciseId) : null);
  const ex = $derived(hw ? L.exerciseById(cur, hw.exerciseId) : null);
  const tot = $derived(s ? L.sessionTotals(s) : { study: 0, play: 0 });
  const count = $derived(hw ? hw.count || 0 : 0);
  const week = $derived(L.weekView(db.sessions, L.todayKey(), db.settings.weeklyGoal));
  const pair = $derived(ex ? L.photoPair(db.photos, ex.id) : null);
  const previous = $derived(ex ? L.lastNote(db.sessions.filter(x => x.id !== id), ex.id) : '');
  const next = $derived(L.nextExercise(cur, db.progress));
  let note = $state('');
  let viewing = $state(null);
  async function done() { if (note.trim()) await updateSession(id, { note: note.trim() }); navigate('today'); }
</script>

{#if s}
  <div class="end">
    <div class="body">
      <div class="k mute">Session done · {L.fmtDate(s.date)}</div>
      <h1 class="h-poster" style="margin-top:8px">{L.fmtMinutes(tot.study + tot.play)} of drawing.</h1>
      <ul class="did">
        {#each s.blocks as b, i}
          {@const bex = b.exerciseId ? L.exerciseById(cur, b.exerciseId) : null}
          {#if bex && bex.kind !== 'reading'}
            <li class="edit">
              <div class="what"><b>{bex.name}</b>{b.minutes ? ` · ${b.minutes} min` : ''}</div>
              <div class="ctl"><button class="round sm" onclick={() => setBlockCount(s.id, i, Math.max(0, (b.count || 0) - 1))} aria-label="One less" disabled={!b.count}>−</button><span class="n num">{b.count || 0}</span><button class="round sm" onclick={() => setBlockCount(s.id, i, (b.count || 0) + 1)} aria-label="One more">+</button><span>{L.unitLabel(bex.unit, b.count || 0)}{#if !b.count}<span class="warn"> · not counted, so the path does not move</span>{/if}</span></div>
            </li>
          {:else}<li>{L.blockSentence(cur, b)}</li>{/if}
        {/each}
      </ul>
      {#if ex}<p class="lead" style="margin-top:14px">{[L.exerciseState(ex, db.progress).done ? `${ex.name} is complete.` : `${ex.name}: ${L.countOf(db.progress, ex.id)} of ${ex.quota} ${L.unitLabel(ex.unit, ex.quota)} so far.`, next ? `Next on the path: ${next.name} (${L.exerciseContext(cur, next)}).` : ''].filter(Boolean).join(' ')}</p>{/if}
      <div class="facts">
        {#if ex && ex.kind !== 'reading'}<div><div class="v num">{L.countOf(db.progress, ex.id)}<small>/ {ex.quota}</small></div><div class="l">{L.unitLabel(ex.unit, 2)} of {ex.name.toLowerCase()}</div></div>{/if}
        <div><div class="v num">{week.done}<small>of {week.goal}</small></div><div class="l">Days this week</div></div>
        <div><div class="v num">{L.daysDrawn(db.sessions)}</div><div class="l">Days drawn</div></div>
      </div>
      {#if ex && ex.kind !== 'reading'}
        {#if pair}<div class="pairwrap"><PhotoPair {pair} figure={figureFor(ex.id)} onopen={p => (viewing = p)} /></div>
        {:else}<p class="last">No photo this time. Photograph the page next time and it will sit here next to your first one.</p>{/if}
        {#if previous}<p class="last"><b>Last time you wrote:</b> {previous}</p>{/if}
      {/if}
      <div class="reflect"><div class="k mute">One thing to fix next time</div><input bind:value={note} placeholder="Optional" enterkeyhint="done" onkeydown={e => e.key === 'Enter' && done()}></div>
    </div>
    <div class="foot"><span class="small mute">{next ? 'Today shows the next step. Now or another day.' : 'That is the whole path.'}</span><button class="btn" onclick={done}>Done</button></div>
  </div>
{/if}
{#if viewing}<Viewer photo={viewing} onclose={() => (viewing = null)} />{/if}

<style>
  .end { min-height: 100vh; display: flex; flex-direction: column; padding: calc(var(--pad) + var(--safe-top)) var(--pad) calc(var(--pad) + var(--safe-bottom)); }
  .body { flex: 1; max-width: 900px; }
  .did { list-style: none; padding: 0; margin: 14px 0 0; display: grid; gap: 4px; font-size: 17px; color: var(--mute); }
  .did li::before { content: '· '; }
  .did li.edit::before { content: none; }
  .did li.edit { display: grid; gap: 6px; padding: 8px 0; }
  .did .edit b { color: var(--ink); font-weight: 700; }
  .did .ctl { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .did .round.sm { width: 32px; height: 32px; font-size: 18px; }
  .did .n { font-weight: 700; font-size: 22px; color: var(--ink); min-width: 28px; text-align: center; }
  .did .warn { color: var(--c2); }
  .facts { display: flex; gap: clamp(20px, 5vw, 56px); flex-wrap: wrap; margin-top: 24px; }
  .facts .v { font-size: clamp(44px, 8vw, 96px); font-weight: 700; line-height: .85; letter-spacing: -.05em; }
  .facts .v small { font-size: .3em; letter-spacing: -.01em; margin-left: 6px; opacity: .5; }
  .facts .l { margin-top: 8px; font-weight: 500; }
  .pairwrap { margin-top: 28px; max-width: 760px; }
  .last { margin-top: 14px; font-size: 15px; color: var(--mute); }
  .last b { color: var(--ink); }
  .reflect { margin-top: 28px; }
  .reflect input { width: 100%; font: inherit; font-size: 18px; padding: 14px 0; border: 0; border-bottom: 2px solid var(--ink); background: transparent; color: var(--ink); outline: none; border-radius: 0; }
  .reflect input::placeholder { color: var(--faint); }
  .foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 32px; }
</style>
