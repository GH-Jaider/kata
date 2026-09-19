<script>
  import Mast from '#components/Mast.svelte';
  import Week from '#components/Week.svelte';
  import LogSheet from '#components/LogSheet.svelte';
  import Figure from '#lib/figures/Figure.svelte';
  import { db, cur, setSettings } from '#lib/store.svelte.js';
  import { run, startRun } from '#lib/run.svelte.js';
  import { navigate, primeAudio } from '#lib/ui.svelte.js';
  import * as L from '#lib/logic.js';
  import { startTour, toured } from '#lib/tour.js';
  import { onMount } from 'svelte';

  const today = L.todayKey();
  let seed = $state(sessionStorage.getItem('kata.seed') || '');
  const soFar = $derived(L.todaySoFar(cur, db.sessions, today));
  const since = $derived(L.minutesSinceLastSession(db.sessions, today));
  const continuing = $derived(since !== null && since < 60);
  const plan = $derived(continuing ? L.continuationPlan(cur, db.progress, db.settings, { today, playDone: soFar.play }) : L.planSession(cur, db.progress, db.settings, { seed, today }));
  const week = $derived(L.weekView(db.sessions, today, db.settings.weeklyGoal));
  const fresh = $derived(!Object.keys(db.progress).length);
  const hw = $derived(plan.blocks.find(b => b.kind === 'homework'));
  const warm = $derived(plan.blocks.filter(b => b.kind === 'warmup'));
  const play = $derived(plan.blocks.find(b => b.kind === 'play'));
  const hwEx = $derived(hw ? L.exerciseById(cur, hw.exerciseId) : null);
  const stage = $derived(hwEx ? L.stageOf(hwEx, L.countOf(db.progress, hwEx.id)) : null);
  const view = $derived(run.current ? 'run' : 'plan');
  const studyMin = $derived(plan.blocks.filter(b => b.kind !== 'play').reduce((a, b) => a + b.minutes, 0));
  const stepOf = kind => plan.blocks.findIndex(b => b.kind === kind) + 1;
  const totalSessions = $derived(db.sessions.filter(s => !s.quick).length);
  const explain = $derived(totalSessions < 3);
  let logOpen = $state(false);


  const name = id => L.exerciseById(cur, id)?.name || '';
  function start() { primeAudio(); startRun($state.snapshot(plan), db.settings.medium); navigate('session'); }
  function shuffle() { seed = L.uid(); sessionStorage.setItem('kata.seed', seed); }
  function toggleMedium() { setSettings({ medium: db.settings.medium === 'paper' ? 'tablet' : 'paper' }); }
  onMount(() => { if (!toured() && !run.current) setTimeout(() => startTour({ fresh }), 700); });
</script>

<div class="today-page">
  <Mast meta={`${L.fmtDate(today)} · week ${week.done} of ${week.goal}`} />

  {#if view === 'run'}
    {@const r = run.current}
    {@const b = r.plan.blocks[r.i]}
    <div class="blocks one">
      <section class="blk {b.kind === 'warmup' ? 'c1' : b.kind === 'play' ? 'c3' : 'c2'}">
        <div class="k">Session in progress · block {r.i + 1} of {r.plan.blocks.length}</div>
        <div class="n">{b.exerciseId ? name(b.exerciseId) : 'Free drawing'}</div>
        <div class="d">The clock kept running. Pick up where you were, or end it from inside.</div>
      </section>
    </div>
    <button class="bar-btn ink" onclick={() => navigate('session')}>Resume <span class="aside">{L.fmtClock(Math.max(0, b.minutes * 60 - (r.elapsed + (r.paused ? 0 : Date.now() - r.startedAt)) / 1000))} left in this block</span></button>

  {:else}
    <div class="blocks" class:two={plan.blocks.length === 2} class:one={plan.blocks.length === 1} data-tour="blocks">
      {#if warm.length}
        <section class="blk c1" style="view-transition-name: block-warmup">
          <div class="k">Step 1 · Warm-up</div>
          <div class="n">{warm.map(b => name(b.exerciseId)).join('. ')}.</div>
          <div class="d">{warm.length === 1 ? 'A short exercise you already know.' : `${['Two', 'Three', 'Four'][warm.length - 2] || warm.length} short exercises you already know, ${warm[0].minutes} min each.`}</div>
          <div class="m num">{warm.reduce((a, b) => a + b.minutes, 0)}<small>min</small></div>
        </section>
      {/if}
      {#if hw}
        <section class="blk c2" data-tour="homework" style="view-transition-name: block-homework">
          <div class="k">Step {stepOf('homework')} · {fresh ? 'First session' : 'Homework'} · {L.exerciseContext(cur, hwEx)}</div>
          <div class="n">{hwEx.name}</div>
          <div class="d">{hwEx.kind === 'reading' ? 'Read it on drawabox.com, about 15 minutes. Reading counts as the exercise.' : `${L.progressWords(hwEx, db.progress).replace(/^./, c => c.toUpperCase())}${stage ? ' · ' + stage.name : ''}. ${stage ? stage.note : hwEx.note}`}</div>
          <div class="m num">{hw.minutes}<small>min</small></div>
        </section>
      {:else}
        <section class="blk c2"><div class="k">Course complete</div><div class="n">Warm-ups and free drawing from here.</div></section>
      {/if}
      {#if play}
      <section class="blk c3" style="view-transition-name: block-play">
        <div class="k">Step {stepOf('play')} · Free drawing · optional</div>
        <div class="n">Whatever you like.</div>
        <div class="d">{fresh ? 'No exercise, no counting. Just draw something you enjoy, and stop whenever you like.' : 'Half of your drawing time is yours, no exercise, no counting. Stop whenever you like, or skip it.'}</div>
        <div class="m num">{play.minutes}<small>min</small></div>
      </section>
      {/if}
    </div>
    {#if fresh}
      <div class="page fresh-note">
        <div class="glyphs">{#each [...cur.order, ...cur.parallel] as uid, i}<span class:on={i === 0}><Figure name={uid} glyph /></span>{/each}</div>
        <div class="how">
          <p><b>How this works.</b> Drawabox is 7 lessons and 4 challenges, in order. Each lesson is a handful of exercises, each with a page count.</p>
          <p>Kata gives you one session a day, in steps: a short warm-up, one exercise from the path, then drawing for yourself. Press Start and Kata runs the clock. Press Next after each step, tap + for every page you finish, and photograph the page if you want to see it next to your first one later.</p>
          <p>Warm-ups appear once you have done a few exercises. The first session is just reading Lesson 0. <button class="btn text" style="font-size:15px;text-decoration:underline;text-underline-offset:3px" onclick={() => startTour({ fresh })}>Show me around</button></p>
        </div>
      </div>
    {:else if soFar.sessions || soFar.items.length}
      <div class="page sofar">
        <div class="k">Today so far</div>
        <p class="line">{[`${L.fmtMinutes(soFar.study)} study`, soFar.play ? `${L.fmtMinutes(soFar.play)} free drawing` : null, ...soFar.items.map(it => `${it.name}, ${it.count} ${L.unitLabel(it.unit, it.count)}`)].filter(Boolean).join(' · ')}</p>
        <div class="line small"><Week {week} /><span>{week.done} of {week.goal} this week{week.reserve ? ` · ${week.reserve} spare` : ''}{continuing ? ' · no warm-up needed, you just did one' : ''}</span></div>
        {#if explain && hwEx}<p class="line small how-line">{continuing ? 'Continue' : 'Start'} runs the clock on {hwEx.name.toLowerCase()}. {plan.blocks.length > 1 ? 'Press Next when your pages are done, Finish whenever you want to stop. Free drawing is optional.' : 'Press Finish when your pages are done.'}</p>{/if}
      </div>
    {:else}
      <div class="page weekrow" data-tour="week"><Week {week} /><span class="small mute">{week.done} of {week.goal} this week{week.reserve ? ` · ${week.reserve} spare` : ''}</span>{#if warm.length}<button class="btn text dim" onclick={shuffle}>Shuffle warm-ups</button>{/if}{#if explain && hwEx}<span class="small mute">Start runs the clock on {hwEx.name.toLowerCase()}. Press Next when your pages are done, Finish whenever you want to stop. Free drawing is optional.</span>{/if}</div>
    {/if}
    <div class="bar-btn" class:ink={fresh} data-tour="start">
      <button class="go" onclick={start}>{continuing ? 'Continue' : 'Start'}</button>
      <span class="aside"><span class="long">about {studyMin} min ·</span><button onclick={toggleMedium}>on {db.settings.medium}</button><span class="long">·</span><button class="long" onclick={() => (logOpen = true)}>log practice instead</button></span>
    </div>
  {/if}
</div>

{#if logOpen}<LogSheet exerciseId={hw?.exerciseId} onclose={() => (logOpen = false)} />{/if}

<style>
  .today-page { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; }
  .blocks { display: grid; grid-template-rows: repeat(3, minmax(0, 1fr)); }
  .blocks.two { grid-template-rows: 2fr 1fr; }
  .blocks.one { grid-template-rows: 1fr; }
  .blk { position: relative; padding: var(--pad); display: flex; flex-direction: column; justify-content: flex-end; gap: 8px; overflow: hidden; min-height: 150px; }
  .blk.c1 { background: var(--c1); color: var(--c1-ink); }
  .blk.c2 { background: var(--c2); color: var(--c2-ink); }
  .blk.c3 { background: var(--c3); color: var(--c3-ink); }
  .blk .k { opacity: .8; padding-right: 36%; }
  .blk .n { font-weight: 700; line-height: .95; letter-spacing: -.03em; font-size: clamp(26px, 5vw, 44px); max-width: 18ch; }
  .blk .d { opacity: .85; max-width: 44ch; font-size: clamp(14px, 1.5vw, 16px); }
  .blk .m { position: absolute; right: var(--pad); top: calc(var(--pad) - 8px); font-weight: 700; line-height: .8; letter-spacing: -.06em; font-size: clamp(64px, 16vw, 120px); }
  .blk .m small { font-size: clamp(14px, 1.6vw, 18px); letter-spacing: 0; font-weight: 500; margin-left: 4px; }
  .go { font-size: inherit; font-weight: inherit; letter-spacing: inherit; }
  .weekrow { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .fresh-note { display: grid; gap: 14px; }
  .how { display: grid; gap: 8px; max-width: 62ch; font-size: 15px; color: var(--mute); }
  .how b { color: var(--ink); }
  .glyphs { display: flex; flex-wrap: wrap; gap: 6px; }
  .glyphs span { width: 30px; height: 30px; border: 2px solid var(--ink); opacity: .22; display: grid; place-items: center; padding: 4px; }
  .glyphs span.on { opacity: 1; background: var(--c2); border-color: var(--c2); color: var(--c2-ink); }
  .sofar { background: var(--ink); color: var(--paper); display: grid; gap: 8px; }
  .sofar .k { opacity: .6; }
  .sofar .line { font-weight: 500; font-size: 17px; line-height: 1.4; }
  .sofar .line.small { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; font-size: 14px; font-weight: 400; opacity: .8; }
  .sofar .how-line { display: block; opacity: .7; }
  @media (min-width: 900px) {
    .blocks, .blocks.two, .blocks.one { grid-template-rows: none; grid-auto-flow: column; }
    .blocks { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .blocks.two { grid-template-columns: 2fr 1fr; }
    .blocks.one { grid-template-columns: 1fr; }
    .blk { min-height: 0; padding-bottom: calc(var(--pad) + 8px); }
    .blk .n, .blk .d { max-width: 16ch; }
    .blk .d { max-width: 40ch; }
    .blk .k { padding-right: 0; }
    .blk .m { position: static; margin-bottom: 18px; font-size: clamp(120px, 12vw, 190px); }
    .fresh-note { grid-template-columns: auto 1fr; align-items: center; gap: 28px; }
  }
</style>
