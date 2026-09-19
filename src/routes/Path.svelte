<script>
  import Mast from '../components/Mast.svelte';
  import Figure from '../lib/figures/Figure.svelte';
  import { figureFor } from '../lib/figures/library.js';
  import { db, cur, tick } from '../lib/store.svelte.js';
  import { navigate, toast } from '../lib/ui.svelte.js';
  import * as L from '../lib/logic.js';
  import { slide } from 'svelte/transition';

  const order = [...cur.order, ...cur.parallel];
  const units = $derived(order.map(id => L.unitById(cur, id)));
  const next = $derived(L.nextExercise(cur, db.progress));
  const nextStage = $derived(next ? L.stageOf(next, L.countOf(db.progress, next.id)) : null);
  const totals = $derived(L.totals(db.sessions));
  const unitsDone = $derived(units.filter(u => L.unitDone(u, db.progress)).length);
  let open = $state(new Set(next ? [next.unitId] : []));
  function toggle(id) { const s = new Set(open); s.has(id) ? s.delete(id) : s.add(id); open = s; }
  const status = u => L.unitStatus(cur, u, db.progress);
  // The path in its real order, with a heading wherever a lesson starts a new part. Challenges stay where Drawabox puts them.
  const groups = $derived.by(() => {
    const out = [];
    let current = null;
    for (const u of units) {
      const pid = u.kind === 'lesson' ? u.partId : (cur.parallel.includes(u.id) ? 'parallel' : current?.id);
      if (!current || current.id !== pid) { current = { id: pid, name: pid === 'parallel' ? 'In parallel' : (cur.parts.find(p => p.id === pid)?.name || ''), units: [] }; out.push(current); }
      current.units.push(u);
    }
    return out;
  });
  async function plus(ex) { await tick(ex.id, 1); toast(`+1 ${L.unitLabel(ex.unit, 1)}`); }
</script>

<Mast meta={`${cur.name} · ${units.length} units`} />
<main class="page wrap">
  <div class="head">
    <div><div class="k mute">{cur.name} · {units.length} units</div><h1 class="h-poster" style="margin-top:6px">Path</h1></div>
    <div class="stats">
      <div><div class="v num">{L.daysDrawn(db.sessions)}</div><div class="l">Days drawn</div></div>
      <div><div class="v num">{totals.study >= 60 ? Math.floor(totals.study / 60) : totals.study}<small>{totals.study >= 60 ? `h ${totals.study % 60}m` : 'min'}</small></div><div class="l">Study</div></div>
      <div><div class="v num">{unitsDone}<small>of {units.length}</small></div><div class="l">Units</div></div>
    </div>
  </div>

  <div class="path-grid">
    <div data-tour="path-list">
      {#each groups as g (g.id)}
        <section class="part">
          <span class="k mute">{g.name}</span>
          <div class="units">
            {#each g.units as u (u.id)}
              {@const st = status(u)}
              {@const done = u.exercises.filter(ex => L.exerciseState(ex, db.progress).done).length}
              <div class="unit {st}" class:open={open.has(u.id)}>
                <button class="row" onclick={() => toggle(u.id)} aria-expanded={open.has(u.id)}>
                  <div class="no">{u.kind === 'lesson' ? u.short : 'Challenge'}</div>
                  <div><div class="nm">{u.name.replace(/^Lesson \d+: /, '').replace(/^Applying construction to /i, '').replace(/^./, c => c.toUpperCase())}</div><div class="sb">{st === 'locked' && u.after.length ? 'After ' + u.after.map(id => L.unitById(cur, id)?.short).join(' and ') : `${done} of ${u.exercises.length} exercises done`}</div></div>
                  <div class="q num">{u.exercises.length === 1 ? `${L.countOf(db.progress, u.exercises[0].id)}` : done}<small> / {u.exercises.length === 1 ? u.exercises[0].quota : u.exercises.length}</small></div>
                </button>
                {#if st === 'active'}<div class="prog"><i style={`width:${L.unitProgress(u, db.progress) * 100}%`}></i></div>{/if}
                {#if open.has(u.id)}
                  <div class="exs" transition:slide={{ duration: 200 }}>
                    <p class="small mute">{u.summary} <span class="mute">Tools: {u.tools}</span> <a class="ext" href={u.url} target="_blank" rel="noopener">Lesson on drawabox.com ↗</a></p>
                    {#each u.exercises as ex (ex.id)}
                      {@const es = L.exerciseState(ex, db.progress)}
                      <div class="ex" class:done={es.done}>
                        <button class="exname" onclick={() => navigate('card/' + ex.id)}>{ex.name}</button>
                        <span class="exq num">{es.count} / {es.quota} {L.unitLabel(ex.unit, es.quota)}</span>
                        <span class="exctl"><button class="round sm" onclick={() => tick(ex.id, -1)} disabled={!es.count} aria-label="One less">−</button><button class="round sm" onclick={() => plus(ex)} aria-label="One more">+</button></span>
                        <div class="exbar"><i style={`width:${es.pct * 100}%`}></i></div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>

    {#if next}
      <aside class="now-card" data-tour="now">
        <div class="k">Now · {L.exerciseContext(cur, next)}{nextStage ? ' · ' + nextStage.name : ''}</div>
        <h2 class="h-big">{next.name}</h2>
        <figure class="fig"><Figure name={figureFor(next.id)} animate label={next.name} /></figure>
        <div class="big num">{L.countOf(db.progress, next.id)}<small>/ {next.quota} {L.unitLabel(next.unit, next.quota)}</small></div>
        <p class="small" style="opacity:.9">{nextStage ? nextStage.note : next.note}</p>
        <div class="acts"><button class="btn paper" onclick={() => navigate('card/' + next.id)}>Open the card</button><button class="btn text dim" onclick={() => plus(next)}>+1 {L.unitLabel(next.unit, 1)}</button></div>
      </aside>
    {/if}
  </div>
</main>

<style>
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
  .stats { display: flex; gap: clamp(20px, 5vw, 56px); flex-wrap: wrap; }
  .stats .v { font-size: clamp(40px, 6vw, 72px); font-weight: 700; line-height: .85; letter-spacing: -.05em; }
  .stats .v small { font-size: .3em; opacity: .5; margin-left: 4px; letter-spacing: -.01em; }
  .stats .l { margin-top: 6px; font-weight: 500; font-size: 14px; color: var(--mute); }
  .path-grid { display: grid; gap: 28px; margin-top: 32px; }
  .part { margin-top: 28px; }
  .part:first-child { margin-top: 0; }
  .part > .k { display: block; margin-bottom: 10px; }
  .units { border-top: 2px solid var(--ink); }
  .unit { border-bottom: 1px solid var(--line); }
  .unit .row { display: grid; grid-template-columns: 92px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 16px 0; width: 100%; }
  .unit .no { font-size: 13px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; line-height: 1.2; color: var(--faint); }
  .unit .nm { font-weight: 700; font-size: clamp(18px, 2.2vw, 22px); letter-spacing: -.02em; line-height: 1.1; }
  .unit .sb { color: var(--mute); font-size: 14px; margin-top: 4px; }
  .unit .q { font-weight: 700; font-size: 18px; letter-spacing: -.02em; white-space: nowrap; }
  .unit .q small { font-weight: 500; color: var(--mute); }
  .unit.complete .no { color: var(--ok); }
  .unit.active .no, .unit.active .nm { color: var(--c2); }
  .unit.locked .nm, .unit.locked .q { color: var(--faint); }
  .unit .prog { height: 6px; background: var(--paper-2); margin: -6px 0 12px 106px; }
  .unit .prog i { display: block; height: 100%; background: var(--c2); }
  .exs { padding: 0 0 14px 106px; }
  .exs > p { margin-bottom: 10px; }
  .ext { text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; }
  .ex { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 6px 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--line); }
  .exname { font-weight: 700; text-align: left; }
  .ex.done .exname::before { content: "✓ "; color: var(--ok); }
  .exq { font-size: 13px; color: var(--mute); white-space: nowrap; }
  .exctl { display: flex; gap: 6px; }
  .round.sm { width: 34px; height: 34px; font-size: 18px; }
  .exbar { grid-column: 1 / -1; height: 4px; background: var(--paper-2); }
  .exbar i { display: block; height: 100%; background: var(--ink); }
  .ex.done .exbar i { background: var(--ok); }
  .now-card { background: var(--c2); color: var(--c2-ink); padding: var(--pad); display: flex; flex-direction: column; gap: 14px; }
  .now-card .fig { max-width: 420px; }
  .now-card .big { font-size: clamp(64px, 9vw, 120px); font-weight: 700; line-height: .85; letter-spacing: -.06em; }
  .now-card .big small { font-size: .3em; letter-spacing: -.01em; opacity: .75; margin-left: 6px; }
  .acts { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
  @media (min-width: 900px) { .path-grid { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 48px; align-items: start; } .now-card { position: sticky; top: calc(var(--mast) + 24px); } }
</style>
