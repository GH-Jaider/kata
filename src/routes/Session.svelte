<script>
  import { run, elapsedMs, togglePause, setCount, setSkipped, countFor, nextBlock, finishRun, discardRun, addRunPhoto, markAlerted } from '#lib/run.svelte.js';
  import { db, cur, addPhoto } from '#lib/store.svelte.js';
  import { navigate, chime, toast, withTransition } from '#lib/ui.svelte.js';
  import { cardFor } from '#lib/cards.js';
  import Figure from '#lib/figures/Figure.svelte';
  import { figureFor } from '#lib/figures/library.js';
  import * as L from '#lib/logic.js';
  import { startSessionTour, touredSession } from '#lib/tour.js';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  const r = $derived(run.current);
  onMount(() => { if (run.current && !touredSession()) setTimeout(startSessionTour, 900); });
  const block = $derived(r ? r.plan.blocks[r.i] : null);
  const ex = $derived(block?.exerciseId ? L.exerciseById(cur, block.exerciseId) : null);
  const stage = $derived(ex ? L.stageOf(ex, L.countOf(db.progress, ex.id)) : null);
  const card = $derived(ex ? cardFor(ex.id) : null);
  const seen = $derived(ex ? db.progress[ex.id]?.sessions || 0 : 0);
  const cls = $derived(block?.kind === 'warmup' ? 'c1' : block?.kind === 'play' ? 'c3' : 'c2');
  const last = $derived(r ? r.i === r.plan.blocks.length - 1 : true);
  const n = $derived(r ? r.plan.blocks.length : 0);
  const kinds = $derived(r ? [...new Set(r.plan.blocks.map(b => b.kind))] : []);
  const stepNo = $derived(block ? kinds.indexOf(block.kind) + 1 : 0);
  const warmIndex = $derived(block?.kind === 'warmup' ? { i: r.plan.blocks.slice(0, r.i + 1).filter(b => b.kind === 'warmup').length, n: r.plan.blocks.filter(b => b.kind === 'warmup').length } : null);
  // Homework on a page-based exercise: this step is one page. On boxes, cylinders, wheels or rows: one page's worth, adjustable.
  const isPage = $derived(block?.kind === 'homework' && !!ex && ex.kind !== 'reading' && ex.unit === 'pages');
  const isBulk = $derived(block?.kind === 'homework' && !!ex && ex.kind !== 'reading' && ex.unit !== 'pages');
  const skipped = $derived(!!r?.skipped?.[r.i]);
  const count = $derived(r ? countFor(r, r.i) : 0);
  const willComplete = $derived(!!ex && !skipped && L.countOf(db.progress, ex.id) < ex.quota && L.countOf(db.progress, ex.id) + count >= ex.quota);

  let showSteps = $state(false);
  $effect(() => { showSteps = seen < 2 && block?.kind !== 'play'; });
  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 500); return () => clearInterval(t); });
  const elapsed = $derived.by(() => { void now; return r ? elapsedMs() : 0; });
  const remaining = $derived(block ? block.minutes * 60 - elapsed / 1000 : 0);
  $effect(() => { if (!run.current) navigate('today'); });
  $effect(() => {
    if (r && remaining <= 0 && !r.alerted[r.i]) { markAlerted(); if (db.settings.sound) chime(); navigator.vibrate?.(200); }
  });

  const nextBlockName = $derived.by(() => { const nb = r && r.plan.blocks[r.i + 1]; if (!nb) return null; return nb.kind === 'play' ? 'Free drawing' : (L.exerciseById(cur, nb.exerciseId)?.name || kindLabel(nb.kind)); });
  const context = $derived(block?.kind === 'play' ? 'No exercise, no counting. Whatever you like.' : ex ? `${L.exerciseContext(cur, ex)} · ${L.progressWords(ex, db.progress)}${block.kind === 'warmup' ? ' · as a warm-up' : ''}` : '');
  const lessonUrl = $derived(ex ? (stage ? stage.url : ex.url) : null);
  const primary = $derived.by(() => {
    if (!block) return '';
    const end = last ? 'finish' : 'next';
    if (ex?.kind === 'reading') return `Done reading · ${end} →`;
    if (isPage || isBulk) return `Page done · ${end} →`;
    return last ? 'Finish session →' : `Next: ${nextBlockName} →`;
  });

  let confirm = $state(null); // 'end'
  // The moment a page counts: the whole screen turns to the fourth colour and says so, then moves on.
  let moment = $state(null);
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function advance() {
    if (moment) return;
    if ((isPage || isBulk || ex?.kind === 'reading') && !skipped) {
      const done = L.countOf(db.progress, ex.id) + count;
      moment = {
        title: ex.kind === 'reading' ? 'Lesson 0 read.' : isBulk ? `${count} ${L.unitLabel(ex.unit, count)} on the page.` : `Page ${Math.min(ex.quota, done)} of ${ex.quota} done.`,
        sub: willComplete ? `${ex.name} is complete. The path moves on.` : ex.kind === 'reading' ? '' : `${ex.name} · ${Math.min(ex.quota, done)} of ${ex.quota} ${L.unitLabel(ex.unit, ex.quota)}`,
        then: last ? 'Finishing the session' : `Next: ${nextBlockName}`,
      };
      await new Promise(res => setTimeout(res, reduce ? 900 : 1500));
      moment = null;
    }
    if (last) finish(); else withTransition(nextBlock);
  }
  async function finish() { const s = await finishRun(); navigate('done/' + s.id); }
  async function onPhoto(e) {
    let added = 0;
    for (const f of e.target.files || []) {
      try { const id = await addPhoto(f, { exerciseId: ex ? ex.id : null, sessionId: r.sessionId, kind: block.kind, date: L.todayKey() }); addRunPhoto(id); added++; }
      catch { toast('Could not read that image'); }
    }
    e.target.value = '';
    if (added) toast(added === 1 ? 'Photo saved' : `${added} photos saved`);
  }
  function kindLabel(k) { return k === 'warmup' ? 'Warm-up' : k === 'play' ? 'Free drawing' : 'Homework'; }
</script>

{#if r && block}
  <div class="session {cls}" style={`view-transition-name: block-${block.kind}`}>
    <div class="s-top" data-tour="s-top">
      <span>Step {stepNo} of {kinds.length} · {kindLabel(block.kind)}{warmIndex && warmIndex.n > 1 ? ` ${warmIndex.i} of ${warmIndex.n}` : ''} · {block.minutes} min</span>
      <div class="segs" aria-label={`Step ${r.i + 1} of ${n}`}>{#each r.plan.blocks as b, i}<i class:done={i < r.i} class:on={i === r.i} class:long={b.kind === 'play'}></i>{/each}</div>
      <span class="num">{nextBlockName ? `then: ${nextBlockName}` : 'last step'}</span>
    </div>

    {#key r.i}
    <div class="s-head" data-tour="s-head" in:fly={{ y: 12, duration: reduce ? 0 : 240, delay: 60 }}>
      <div class="k ctx">{context}</div>
      <h1 class="h-poster">{ex ? ex.name : 'Whatever you like.'}</h1>
      <p class="lead">
        {#if block.kind === 'play'}Optional. This is the half that keeps you drawing. The clock is only a suggestion: stop whenever you like, Finish saves what you did.
        {:else if ex.kind === 'reading'}Kata cannot show the lesson itself. <a class="link" href={lessonUrl} target="_blank" rel="noopener">Open Lesson 0 on drawabox.com ↗</a> and come back when you are done.
        {:else}{stage ? `${stage.name}. ${stage.note}` : ex.note} <button class="link" onclick={() => (showSteps = !showSteps)}>{showSteps ? 'Hide steps' : 'Steps'}</button> <a class="link dim" href={lessonUrl} target="_blank" rel="noopener">Full instructions ↗</a>{/if}
      </p>
      {#if showSteps && card}
        <ol class="steps">{#each card.steps as [b, t]}<li><span><b>{b}</b> {t}</span></li>{/each}</ol>
      {/if}
    </div>
    {/key}

    <div class="s-mid">
      <figure class="fig">{#if block.kind === 'play'}<Figure name="leaf" animate />{:else}<Figure name={figureFor(ex.id)} animate label={ex.name} />{/if}</figure>
      <div class="t num" class:over={remaining < 0} data-tour="clock">{remaining >= 0 ? L.fmtClock(remaining) : '+' + L.fmtClock(-remaining)}<small>{remaining >= 0 ? 'left' : 'over'}</small></div>
    </div>

    <div class="s-bottom">
      {#if isBulk}
        <div class="bulk" data-tour="count">
          <span class="lbl">{L.unitLabel(ex.unit, 2)} on this page</span>
          <button class="round" onclick={() => setCount(count - 1)} aria-label="One less" disabled={count <= 0}>−</button>
          <span class="n num">{count}</span>
          <button class="round" onclick={() => setCount(count + 1)} aria-label="One more">+</button>
        </div>
      {:else if isPage}
        {#if skipped}<span class="small skipnote">Not counting this page. <button class="link" onclick={() => setSkipped(false)}>Undo</button></span>
        {:else}<button class="btn text dim" data-tour="skip" onclick={() => setSkipped(true)}>Didn't finish this page</button>{/if}
      {:else}<span></span>{/if}
      <div class="acts">
        <label class="btn text" data-tour="photo">Photo<input class="sr" type="file" accept="image/*" multiple onchange={onPhoto}></label>
        <button class="btn text dim" onclick={togglePause}>{r.paused ? 'Resume' : 'Pause'}</button>
        {#if confirm === 'end'}
          <span class="small">Finish now?</span><button class="btn text" onclick={finish}>Yes, save and finish</button><button class="btn text dim" onclick={() => (confirm = null)}>Keep going</button><button class="btn text dim" onclick={async () => { await discardRun(); navigate('today'); }}>Discard everything</button>
        {:else}
          {#if !last}<button class="btn text dim" onclick={() => (confirm = 'end')}>Finish early</button>{:else}<button class="btn text dim" onclick={() => (confirm = 'end')}>Discard</button>{/if}
          <button class="btn paper next" data-tour="next" onclick={advance}>{primary}</button>
        {/if}
      </div>
    </div>

    {#if moment}
      <div class="moment" transition:fade={{ duration: reduce ? 0 : 180 }}>
        <div class="moment-in" in:fly={{ y: reduce ? 0 : 18, duration: reduce ? 0 : 320, delay: 80 }}>
          <div class="k">{moment.then}</div>
          <div class="big">{moment.title}</div>
          {#if moment.sub}<div class="sub">{moment.sub}</div>{/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .session { position: relative; }
  .moment { position: absolute; inset: 0; z-index: 5; background: var(--c4); color: var(--c4-ink); display: grid; align-content: end; padding: var(--pad); padding-bottom: calc(var(--pad) * 2 + var(--safe-bottom)); }
  .moment .k { opacity: .75; }
  .moment .big { font-weight: 700; line-height: .95; letter-spacing: -.035em; font-size: clamp(44px, 9vw, 120px); margin-top: 10px; max-width: 14ch; }
  .moment .sub { margin-top: 14px; font-size: clamp(16px, 2vw, 22px); opacity: .9; max-width: 40ch; }
  .session { min-height: 100vh; display: flex; flex-direction: column; padding: calc(var(--pad) + var(--safe-top)) var(--pad) calc(var(--pad) + var(--safe-bottom)); }
  .session.c1 { background: var(--c1); color: var(--c1-ink); }
  .session.c2 { background: var(--c2); color: var(--c2-ink); }
  .session.c3 { background: var(--c3); color: var(--c3-ink); }
  .s-top { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 500; gap: 12px; white-space: nowrap; }
  .s-top .segs { flex: 1; justify-content: center; }
  .s-head { margin-top: 20px; }
  .s-head .h-poster { max-width: 12ch; }
  .s-head .lead { margin-top: 10px; }
  .link { font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  .link.dim { font-weight: 500; opacity: .8; }
  .ctx { opacity: .8; margin-bottom: 8px; }
  .steps { margin: 14px 0 0; padding: 0; list-style: none; counter-reset: s; max-width: 60ch; display: grid; gap: 6px; font-size: 15px; opacity: .92; }
  .steps li { counter-increment: s; display: grid; grid-template-columns: 22px 1fr; gap: 8px; }
  .steps li::before { content: counter(s); font-weight: 700; }
  .s-mid { flex: 1; display: grid; gap: 20px; align-items: center; margin-top: 16px; grid-template-rows: auto auto; }
  .s-mid .fig { max-width: 260px; justify-self: center; width: 100%; }
  .s-mid .t { font-weight: 700; line-height: .85; letter-spacing: -.07em; font-size: clamp(88px, 24vw, 200px); text-align: right; white-space: nowrap; min-width: 0; }
  .s-mid .t small { display: block; font-size: 15px; letter-spacing: 0; font-weight: 500; opacity: .8; margin-top: 12px; white-space: normal; }
  .session.c2 .s-mid .t.over, .session.c1 .s-mid .t.over { color: #121212; }
  .s-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 18px; margin-top: 16px; }
  .bulk { display: flex; align-items: center; gap: 12px; }
  .bulk .lbl { font-size: 15px; font-weight: 700; margin-right: 4px; }
  .bulk .n { font-size: 44px; font-weight: 700; line-height: .9; letter-spacing: -.05em; min-width: 44px; text-align: center; }
  .skipnote { opacity: .9; }
  .acts { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
  .acts label { cursor: pointer; }
  .acts .next { margin-left: auto; transition: background var(--t) var(--ease), color var(--t) var(--ease); }
  @media (max-width: 599px) { .s-bottom { flex-direction: column; align-items: stretch; } .acts { width: 100%; } }
  @media (min-width: 600px) {
    .s-mid { grid-template-rows: none; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 32px; }
    .s-mid .fig { max-width: 300px; justify-self: start; }
    .s-mid .t { font-size: clamp(88px, 15vw, 200px); }
  }
  @media (min-width: 900px) {
    .s-head .h-poster { font-size: clamp(56px, 6.5vw, 96px); }
    .s-mid .fig { max-width: 480px; }
    .s-mid .t { font-size: clamp(160px, 16.5vw, 300px); }
  }
</style>
