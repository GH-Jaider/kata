<script>
  import Mast from '#components/Mast.svelte';
  import PhotoPair from '#components/PhotoPair.svelte';
  import Thumb from '#components/Thumb.svelte';
  import Viewer from '#components/Viewer.svelte';
  import { db, cur, deleteSession } from '#lib/store.svelte.js';
  import { toast } from '#lib/ui.svelte.js';
  import { figureFor } from '#lib/figures/library.js';
  import * as L from '#lib/logic.js';

  const today = L.todayKey();
  const [Y, M] = today.split('-').map(Number);
  const monthName = new Date(Y, M - 1, 1).toLocaleDateString('en', { month: 'long' });
  const daysInMonth = new Date(Y, M, 0).getDate();
  const firstDow = (new Date(Y, M - 1, 1).getDay() + 6) % 7;
  const totals = $derived(L.dayTotals(db.sessions));
  const monthDays = $derived(Array.from({ length: daysInMonth }, (_, i) => { const d = `${Y}-${String(M).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`; return { d, on: totals.has(d), now: d === today, future: d > today }; }));
  const drawnThisMonth = $derived(monthDays.filter(x => x.on).length);
  const comparable = $derived(L.comparable(cur, db.photos));
  let pick = $state(null);
  const pickId = $derived(pick || comparable[0]?.id || null);
  const pair = $derived(pickId ? L.photoPair(db.photos, pickId) : null);
  const days = $derived.by(() => {
    const map = new Map();
    for (const s of [...db.sessions].sort((a, b) => (b.start || b.date).localeCompare(a.start || a.date))) map.set(s.date, [...(map.get(s.date) || []), s]);
    return [...map.entries()];
  });
  let viewing = $state(null);
  const name = id => L.exerciseById(cur, id)?.name || 'Free drawing';
  const kindOf = p => p.kind || 'homework';
  let confirmDel = $state(null);
  async function del(id) { await deleteSession(id); confirmDel = null; toast('Session deleted'); }
</script>

<Mast meta={`${monthName} · ${drawnThisMonth} days drawn`} />
<main class="page wrap">
  <div class="head">
    <div><div class="k mute">{monthName} · {drawnThisMonth} {drawnThisMonth === 1 ? 'day' : 'days'} drawn</div><h1 class="h-poster" style="margin-top:6px">Journal</h1></div>
    <div class="month" role="img" data-tour="month" aria-label={`${drawnThisMonth} days drawn in ${monthName}`}>
      {#each Array(firstDow) as _}<i class="blank"></i>{/each}
      {#each monthDays as d}<i class:on={d.on} class:now={d.now} class:blank={d.future}></i>{/each}
    </div>
  </div>

  {#if comparable.length}
    <section class="thennow">
      <PhotoPair {pair} figure={figureFor(pickId)} latestLabel="Latest" onopen={p => (viewing = p)} />
      <div>
        <div class="k mute">Then and now</div>
        <select class="sel" bind:value={pick}>{#each comparable as ex}<option value={ex.id}>{ex.name}</option>{/each}</select>
        <p class="small mute" style="margin-top:8px">Your first page of an exercise next to the latest. Any exercise you have photographed twice.</p>
      </div>
    </section>
  {:else if !db.sessions.length}
    <p class="lead" style="margin-top:32px">Nothing yet. Sessions, pages and photos land here. Photograph the same exercise twice and Kata puts the first next to the latest.</p>
  {:else}
    <p class="small mute" style="margin-top:24px">Photograph an exercise twice and the first page appears next to the latest, here.</p>
  {/if}

  <div class="days" data-tour="journal-list">
    {#each days as [date, list] (date)}
      {@const t = totals.get(date) || { study: 0, play: 0 }}
      {@const photos = db.photos.filter(p => list.some(s => s.id === p.sessionId))}
      <section class="day">
        <div class="hd"><b>{L.fmtDate(date)}</b><span class="small mute num">{L.fmtMinutes(t.study)} study · {L.fmtMinutes(t.play)} play</span></div>
        {#if photos.length}
          <div class="tiles">
            {#each photos as p (p.id)}
              <figure class="tile {kindOf(p) === 'warmup' ? 'c1' : kindOf(p) === 'play' ? 'c3' : 'c2'}">
                <button class="ph" onclick={() => (viewing = p)}><Thumb photo={p} alt={name(p.exerciseId)} /></button>
                <figcaption class="cap"><b>{name(p.exerciseId)}</b><span>{kindOf(p) === 'warmup' ? 'Warm-up' : kindOf(p) === 'play' ? 'Free' : list.find(s => s.id === p.sessionId)?.blocks[0]?.medium || ''}</span></figcaption>
              </figure>
            {/each}
          </div>
        {/if}
        <ul class="lines">
          {#each list as s (s.id)}
            <li>
              <span>{s.blocks.map(b => `${b.exerciseId ? name(b.exerciseId) : 'Free drawing'}${b.count ? ` · ${b.count} ${L.unitLabel(L.exerciseById(cur, b.exerciseId)?.unit || 'pages', b.count)}` : ''}${b.minutes ? ` · ${b.minutes} min` : ''}`).join('  ·  ')}{#if s.note}<em> — {s.note}</em>{/if}</span>
              {#if confirmDel === s.id}<span class="del"><button class="btn text dim" onclick={() => del(s.id)} style="color:var(--c2)">Delete for good</button><button class="btn text dim" onclick={() => (confirmDel = null)}>Keep</button></span>
              {:else}<button class="btn text dim" onclick={() => (confirmDel = s.id)}>Delete</button>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</main>
{#if viewing}<Viewer photo={viewing} onclose={() => (viewing = null)} />{/if}

<style>
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
  .thennow { margin-top: 28px; display: grid; gap: 20px; }
  .sel { display: block; margin-top: 6px; font: inherit; font-weight: 700; font-size: 20px; letter-spacing: -.02em; color: var(--c2); background: transparent; border: 0; padding: 0; max-width: 100%; }
  .days { display: grid; gap: 32px; margin-top: 32px; }
  .day .hd { display: flex; justify-content: space-between; align-items: baseline; border-top: 2px solid var(--ink); padding-top: 10px; gap: 12px; }
  .day .hd b { font-size: 20px; letter-spacing: -.02em; }
  .tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 14px; }
  .tile { margin: 0; }
  .tile .ph { display: block; width: 100%; aspect-ratio: 4 / 3; overflow: hidden; background: var(--paper-2); }
  .tile.c1 .ph { background: var(--c1); } .tile.c2 .ph { background: var(--c2); } .tile.c3 .ph { background: var(--c3); }
  .tile .cap { display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; gap: 8px; }
  .tile .cap span { color: var(--mute); text-transform: capitalize; }
  .lines { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 8px; font-size: 14px; color: var(--mute); }
  .lines li { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .lines em { color: var(--ink); font-style: italic; }
  .del { display: flex; gap: 12px; }
  @media (min-width: 600px) { .tiles { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 900px) { .thennow { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); align-items: end; } .tiles { grid-template-columns: repeat(4, 1fr); } }
</style>
