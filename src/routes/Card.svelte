<script>
  import Mast from '#components/Mast.svelte';
  import Figure from '#lib/figures/Figure.svelte';
  import { figureFor } from '#lib/figures/library.js';
  import { db, cur, tick } from '#lib/store.svelte.js';
  import { startRun } from '#lib/run.svelte.js';
  import { navigate, toast, primeAudio } from '#lib/ui.svelte.js';
  import { cardFor } from '#lib/cards.js';
  import * as L from '#lib/logic.js';

  let { id } = $props();
  const ex = $derived(L.exerciseById(cur, id));
  $effect(() => { if (!ex) navigate('path'); });
  const unit = $derived(ex ? L.unitById(cur, ex.unitId) : null);
  const card = $derived(ex ? cardFor(ex.id) : null);
  const es = $derived(ex ? L.exerciseState(ex, db.progress) : null);
  const p = $derived(ex ? db.progress[ex.id] : null);
  const stage = $derived(ex ? L.stageOf(ex, es.count) : null);
  // Same numbering as the Path list: the step on the path, then the exercise within it.
  const figNo = $derived(ex ? `Fig ${String([...cur.order, ...cur.parallel].indexOf(ex.unitId)).padStart(2, '0')}.${unit.exercises.findIndex(e => e.id === ex.id) + 1}` : '');
  function warmup() {
    primeAudio();
    startRun({ date: L.todayKey(), seed: '', blocks: [{ kind: 'warmup', exerciseId: ex.id, minutes: 5 }] }, db.settings.medium);
    navigate('session');
  }
  async function log() { await tick(ex.id, 1); toast(`+1 ${L.unitLabel(ex.unit, 1)} · ${L.countOf(db.progress, ex.id)} of ${ex.quota}`); }
</script>

{#if ex}
  <Mast meta={unit.short} />
  <main class="page wrap">
    <div class="top"><a href="#/path">← {unit.short}</a><a class="ext" href={stage ? stage.url : ex.url} target="_blank" rel="noopener">Full lesson on drawabox.com ↗</a></div>
    <div class="k mute" style="margin-top:20px">{L.exerciseContext(cur, ex)}{ex.warmup ? ' · warm-up' : ''}</div>
    <h1 class="h-poster" style="margin-top:6px">{ex.name}</h1>
    <div class="meta"><span><b>{ex.quota} {L.unitLabel(ex.unit, ex.quota)}</b> asked</span><span><b>{es.count}</b> done</span>{#if p?.last}<span>Last: {L.fmtDate(p.last)}</span>{/if}{#if stage}<span>Stage: <b>{stage.name}</b></span>{/if}</div>

    <div class="card-grid">
      <div>
        <div class="fig-big" class:c1={ex.warmup} class:c2={!ex.warmup}><figure class="fig"><Figure name={figureFor(ex.id)} animate label={ex.name} /></figure><div class="cap">{stage ? stage.note : ex.note}</div></div>
        {#if card.blurb}<p class="lead" style="margin-top:18px">{card.blurb}</p>{/if}
      </div>
      <div>
        <ol class="steps">{#each card.steps as [b, t]}<li><span><b>{b}</b> {t}</span></li>{/each}</ol>
        {#if card.watch}<div class="watch"><b>Watch for.</b> {card.watch}</div>{/if}
        <div class="acts">{#if ex.warmup && es.count > 0}<button class="btn" onclick={warmup}>5-minute warm-up</button>{/if}<button class="btn text" onclick={log}>Log a {L.unitLabel(ex.unit, 1)}</button></div>
      </div>
    </div>
  </main>
{/if}

<style>
  .top { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  .top a { font-weight: 500; color: var(--mute); }
  .meta { display: flex; gap: 18px; margin-top: 12px; font-weight: 500; color: var(--mute); flex-wrap: wrap; }
  .meta b { color: var(--ink); }
  .card-grid { display: grid; gap: 28px; margin-top: 24px; }
  .fig-big { padding: var(--pad); }
  .fig-big.c1 { background: var(--c1); color: var(--c1-ink); }
  .fig-big.c2 { background: var(--c2); color: var(--c2-ink); }
  .fig-big .fig { max-width: 520px; margin: 0 auto 28px; }
  .fig-big .cap { margin-top: 14px; font-size: 14px; opacity: .85; }
  .steps { list-style: none; padding: 0; margin: 0; counter-reset: s; }
  .steps li { counter-increment: s; display: grid; grid-template-columns: 44px 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line); }
  .steps li::before { content: counter(s); font-size: 34px; font-weight: 700; letter-spacing: -.04em; line-height: 1; color: var(--c2); }
  .steps li b { font-weight: 700; }
  .steps li span { color: var(--mute); }
  .watch { margin-top: 18px; padding: 16px 18px; background: var(--c3); color: var(--c3-ink); }
  .acts { display: flex; gap: 18px; align-items: center; margin-top: 18px; flex-wrap: wrap; }
  @media (min-width: 600px) { .card-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; } }
</style>
