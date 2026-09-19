// The five screens plus the session runner. Each render function fills `root` and may return a cleanup.

import * as store from './store.js';
import * as L from './logic.js';
import { h, icon, ring, sheet, confirmSheet, toast, primeAudio, chime, applyTheme } from './ui.js';

const RUN_KEY = 'kata.run';
const SEED_KEY = 'kata.seed';

export function getRun() {
  try { return JSON.parse(localStorage.getItem(RUN_KEY)) || null; } catch { return null; }
}
function setRun(run) {
  if (run) localStorage.setItem(RUN_KEY, JSON.stringify(run));
  else localStorage.removeItem(RUN_KEY);
}

const KIND = {
  warmup: { label: 'Warm-up', cls: 'warm', icon: 'repeat' },
  homework: { label: 'Homework', cls: 'hw', icon: 'box' },
  play: { label: 'Free drawing', cls: 'play', icon: 'pen' },
  log: { label: 'Practice', cls: 'hw', icon: 'box' },
};
const MEDIUM = { paper: 'Paper', tablet: 'Tablet' };

function exOf(cur, id) {
  return id ? L.exerciseById(cur, id) : null;
}

function countText(ex, count) {
  return `${count} ${L.unitLabel(ex.unit, count)}`;
}

function quotaText(ex, progress) {
  const s = L.exerciseState(ex, progress);
  return `${s.count} / ${s.quota} ${L.unitLabel(ex.unit, s.quota)}`;
}

function section(title, body, link) {
  return h('section', { class: 'section' },
    h('div', { class: 'section-head' }, h('h2', {}, title), link),
    body,
  );
}

function stat(v, k) {
  return h('div', { class: 'stat' }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k));
}

function ext(url, label = 'Instructions') {
  return h('a', { href: url, target: '_blank', rel: 'noopener', 'aria-label': `${label} (opens drawabox.com)` }, icon('external', 16));
}

function blockRow(cur, b, progress, { minutes = true } = {}) {
  const k = KIND[b.kind];
  const ex = exOf(cur, b.exerciseId);
  let sub;
  if (b.kind === 'play') sub = 'Whatever you feel like drawing';
  else if (ex && b.kind === 'homework') sub = `${ex.unitShort} · ${quotaText(ex, progress)}`;
  else if (ex) sub = ex.unitShort;
  return h('div', { class: 'row' },
    h('div', { class: 'swatch ' + k.cls }, icon(k.icon)),
    h('div', { class: 'grow' },
      h('div', { class: 'label' }, ex ? ex.name : k.label),
      h('div', { class: 'sub' }, b.kind === 'play' ? sub : `${k.label} · ${sub}`),
    ),
    minutes ? h('div', { class: 'val' }, `${b.minutes} min`) : null,
  );
}

// ---------- Today ----------

export function renderToday(root, { state, navigate }) {
  const { curriculum: cur, progress, sessions, settings } = state;
  const today = L.todayKey();
  const seed = sessionStorage.getItem(SEED_KEY) || '';
  const plan = L.planSession(cur, progress, settings, { seed, today });
  const st = L.streak(sessions, today);
  const dt = L.dayTotals(sessions).get(today) || { study: 0, play: 0 };
  const run = getRun();
  const hw = plan.blocks.find(b => b.kind === 'homework');
  const warm = plan.blocks.filter(b => b.kind === 'warmup');

  root.append(
    h('div', { class: 'eyebrow' }, L.fmtDate(today, { withYear: true })),
    h('h1', { class: 'title' }, settings.name ? `Hello, ${settings.name}` : 'Today'),
    h('div', { class: 'stats' },
      stat(String(st), st === 1 ? 'day streak' : 'day streak'),
      stat(L.fmtMinutes(dt.study), 'study today'),
      stat(L.fmtMinutes(dt.play), 'play today'),
    ),
  );

  if (run) {
    const b = run.plan.blocks[run.i];
    root.append(section('Session in progress', h('div', { class: 'card' },
      blockRow(cur, b, progress),
      h('div', { class: 'pad' }, h('button', { class: 'btn primary lg block', onclick: () => navigate('session') }, icon('play'), 'Resume session')),
    )));
  } else if (!hw) {
    root.append(section('Course complete', h('div', { class: 'card' }, h('div', { class: 'pad' },
      h('p', {}, 'Every exercise on the path is done. Keep the warm-ups going, and draw for yourself.'),
      h('button', { class: 'btn primary lg block mt-lg', onclick: () => startSession(state, navigate, plan) }, icon('play'), 'Start a warm-up session'),
    ))));
  } else {
    const ex = exOf(cur, hw.exerciseId);
    const stage = L.stageOf(ex, L.countOf(progress, ex.id));
    root.append(section("Today's session", h('div', { class: 'card plan' },
      plan.blocks.map(b => blockRow(cur, b, progress)),
      stage ? h('div', { class: 'stage-note' }, h('b', {}, stage.name + '. '), stage.note, ' ', h('a', { href: stage.url, target: '_blank', rel: 'noopener', style: 'color:var(--accent)' }, 'Read')) : null,
      h('div', { class: 'pad' },
        h('button', { class: 'btn primary lg block', 'data-action': 'start', onclick: () => startSession(state, navigate, plan) }, icon('play'), 'Start session'),
        h('div', { class: 'btns mt' },
          warm.length ? h('button', { class: 'btn sm', onclick: () => { sessionStorage.setItem(SEED_KEY, L.uid()); navigate('today'); } }, icon('shuffle', 16), 'Shuffle') : null,
          h('button', { class: 'btn sm', 'data-action': 'log', onclick: () => openLogSheet({ state, navigate }, { exerciseId: hw.exerciseId }) }, icon('plus', 16), 'Log practice'),
        ),
      ),
    ), h('span', { class: 'link' }, `${plan.blocks.reduce((a, b) => a + (b.kind === 'play' ? 0 : b.minutes), 0)} min study`)));
  }

  const notes = [];
  if (!warm.length && hw) {
    notes.push(h('div', { class: 'callout' }, h('b', {}, 'No warm-ups yet. '), 'They unlock as you complete exercises from Lesson 1 and 2. Then every session opens with 10 minutes of them. ', h('a', { href: cur.links.warmups, target: '_blank', rel: 'noopener' }, 'Why')));
  }
  if (plan.parallel) {
    const p = exOf(cur, plan.parallel);
    notes.push(h('div', { class: 'callout' }, h('b', {}, 'Also open: '), `${p.unitName}, ${quotaText(p, progress)}. One row whenever you like. `, h('a', { href: '#curriculum' }, 'Curriculum')));
  }
  notes.push(h('div', { class: 'callout' }, h('b', {}, 'The 50% rule. '), 'At least half of your drawing time should be for fun, outside the course. Kata counts it as play. ', h('a', { href: cur.links.fiftyPercent, target: '_blank', rel: 'noopener' }, 'Read the rule')));
  root.append(section('Notes', h('div', { style: 'display:grid;gap:10px' }, notes)));

  const doneToday = sessions.filter(s => s.date === today);
  if (doneToday.length) {
    root.append(section('Done today', h('div', { class: 'card' },
      doneToday.flatMap(s => s.blocks.map(b => {
        const ex = exOf(cur, b.exerciseId);
        return h('div', { class: 'row' },
          h('div', { class: 'swatch done' }, icon('check')),
          h('div', { class: 'grow' }, h('div', { class: 'label' }, ex ? ex.name : 'Free drawing'), h('div', { class: 'sub' }, [ex && b.count ? countText(ex, b.count) : null, b.medium ? MEDIUM[b.medium] : null].filter(Boolean).join(' · ') || KIND[b.kind].label)),
          h('div', { class: 'val' }, L.fmtMinutes(b.minutes || 0)),
        );
      })),
    ), h('a', { class: 'link', href: '#log' }, 'Log')));
  }
}

function startSession(state, navigate, plan) {
  primeAudio();
  const begin = medium => {
    const run = { sessionId: L.uid(), start: new Date().toISOString(), plan, i: 0, startedAt: Date.now(), elapsed: 0, paused: false, counts: {}, actual: {}, photos: [], alerted: {}, medium };
    setRun(run);
    navigate('session');
  };
  if (state.settings.medium !== 'both') return begin(state.settings.medium);
  const s = sheet({
    title: 'Drawing on',
    body: h('div', { class: 'btns' },
      h('button', { class: 'btn lg', 'data-medium': 'paper', onclick: () => { s.close(); begin('paper'); } }, 'Paper'),
      h('button', { class: 'btn lg', 'data-medium': 'tablet', onclick: () => { s.close(); begin('tablet'); } }, 'Tablet'),
    ),
  });
}

// ---------- quick log ----------

export function openLogSheet({ state }, { exerciseId = null, kind = 'homework' } = {}) {
  const { curriculum: cur, settings, progress } = state;
  const today = L.todayKey();
  let selected = exerciseId || L.nextExercise(cur, progress)?.id || '';
  let count = 1;
  let medium = settings.medium === 'both' ? 'paper' : settings.medium;
  let blockKind = kind;

  const select = h('select', { 'aria-label': 'Exercise' },
    h('option', { value: '' }, 'Free drawing (play)'),
    L.units(cur).filter(u => cur.order.includes(u.id) || (cur.parallel || []).includes(u.id)).map(u =>
      h('optgroup', { label: u.short || u.name }, u.exercises.map(ex => h('option', { value: ex.id, selected: ex.id === selected }, ex.name))),
    ),
  );
  const unitLbl = h('span', { class: 'muted small' });
  const nEl = h('span', { class: 'n' }, String(count));
  const stepper = h('div', { class: 'stepper' },
    h('button', { 'aria-label': 'Less', onclick: () => { count = Math.max(0, count - 1); nEl.textContent = count; sync(); } }, icon('minus')),
    nEl,
    h('button', { 'aria-label': 'More', onclick: () => { count += 1; nEl.textContent = count; sync(); } }, icon('plus')),
  );
  const minutes = h('input', { type: 'number', min: 0, max: 600, step: 5, value: 15, inputmode: 'numeric', 'aria-label': 'Minutes' });
  const kindSeg = seg([['homework', 'Study'], ['warmup', 'Warm-up']], blockKind, v => { blockKind = v; });
  const mediumSeg = seg([['paper', 'Paper'], ['tablet', 'Tablet']], medium, v => { medium = v; });
  const photoCount = h('span', { class: 'muted small' }, 'None');
  const photos = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr', 'aria-label': 'Photos', onchange: e => { const n = e.target.files?.length || 0; photoCount.textContent = n ? `${n} selected` : 'None'; } });
  const note = h('textarea', { placeholder: 'What went well, what to fix next time', 'aria-label': 'Note' });
  const countField = h('div', { class: 'field' }, h('div', {}, h('label', {}, 'Done'), h('div', { class: 'hint' }, unitLbl)), stepper);
  const kindField = h('div', { class: 'field' }, h('label', {}, 'Counts as'), h('div', { style: 'min-width:180px' }, kindSeg));

  function sync() {
    selected = select.value;
    const ex = exOf(cur, selected);
    countField.style.display = ex ? '' : 'none';
    kindField.style.display = ex ? '' : 'none';
    if (ex) unitLbl.textContent = L.unitLabel(ex.unit, count) + (ex.stages ? ` · ${L.stageOf(ex, L.countOf(progress, ex.id)).name}` : '');
  }
  select.addEventListener('change', sync);
  sync();

  const body = h('div', {},
    h('div', { class: 'card' },
      h('div', { class: 'field' }, h('label', {}, 'Exercise'), select),
      kindField,
      countField,
      h('div', { class: 'field' }, h('label', {}, 'Minutes'), minutes),
      settings.medium === 'both' ? h('div', { class: 'field' }, h('label', {}, 'Medium'), h('div', { style: 'min-width:180px' }, mediumSeg)) : null,
      h('div', { class: 'field' }, h('div', {}, h('label', {}, 'Photos'), h('div', { class: 'hint' }, photoCount)), h('label', { class: 'btn sm' }, icon('camera', 16), 'Add photos', photos)),
      h('div', { class: 'field col' }, h('label', {}, 'Note'), note),
    ),
    h('button', { class: 'btn primary lg block mt-lg', 'data-action': 'save-log', onclick: save }, 'Save'),
  );
  const s = sheet({ title: 'Log practice', body });

  async function save() {
    const ex = exOf(cur, selected);
    const mins = Math.max(0, Number(minutes.value) || 0);
    if (!ex && !mins) { toast('Add some minutes'); return; }
    const now = new Date().toISOString();
    const session = {
      id: L.uid(), date: today, start: now, end: now, note: note.value.trim(),
      blocks: [{ kind: ex ? blockKind : 'play', exerciseId: ex ? ex.id : null, minutes: mins, count: ex ? count : 0, medium }],
    };
    await store.recordSession(session);
    let failed = 0;
    for (const f of photos.files || []) {
      try { await store.addPhoto(f, { exerciseId: ex ? ex.id : null, sessionId: session.id, date: today }); } catch { failed++; }
    }
    s.close();
    toast(failed ? 'Logged, but a photo could not be read' : 'Logged');
  }
}

function seg(options, value, onChange) {
  const el = h('div', { class: 'seg', role: 'radiogroup' });
  for (const [v, label] of options) {
    const b = h('button', { class: v === value ? 'on' : '', role: 'radio', 'aria-checked': v === value ? 'true' : 'false', 'data-value': v, onclick: () => {
      for (const x of el.children) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b ? 'true' : 'false'); }
      onChange(v);
    } }, label);
    el.append(b);
  }
  return el;
}

// ---------- Session runner ----------

export function renderSession(root, { state, navigate }) {
  const { curriculum: cur, progress, settings } = state;
  let run = getRun();
  if (!run) {
    root.append(h('div', { class: 'empty' }, h('p', {}, 'No session running.'), h('button', { class: 'btn mt-lg', onclick: () => navigate('today') }, icon('back', 16), 'Back to Today')));
    return;
  }
  const n = run.plan.blocks.length;
  const b = run.plan.blocks[run.i];
  const k = KIND[b.kind];
  const ex = exOf(cur, b.exerciseId);
  const stage = ex ? L.stageOf(ex, L.countOf(progress, ex.id)) : null;
  const last = run.i === n - 1;
  const target = b.minutes * 60;
  let timer = null;

  const clock = h('div', { class: 'clock num' }, L.fmtClock(target));
  const bar = h('div', { class: 'bar accent ring' }, h('i', { style: 'width:0%' }));
  const pauseBtn = h('button', { class: 'btn', 'data-action': 'pause', onclick: togglePause }, icon(run.paused ? 'play' : 'pause'), run.paused ? 'Resume' : 'Pause');
  const countEl = h('span', { class: 'n' }, String(run.counts[run.i] || 0));

  const countBox = ex ? h('div', { class: 'count-box' },
    h('div', { class: 'k' }, `${L.unitLabel(ex.unit, 2)} done in this block`),
    h('div', { class: 'stepper lg' },
      h('button', { 'aria-label': 'Less', onclick: () => bump(-1) }, icon('minus', 24)),
      countEl,
      h('button', { 'aria-label': 'More', 'data-action': 'more', onclick: () => bump(1) }, icon('plus', 24)),
    ),
  ) : null;

  const photoInput = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr', 'aria-label': 'Add photo', onchange: async e => {
    let added = 0;
    for (const f of e.target.files || []) {
      try {
        const id = await store.addPhoto(f, { exerciseId: ex ? ex.id : null, sessionId: run.sessionId, date: L.todayKey() });
        run.photos.push(id);
        setRun(run);
        thumbs.append(await thumb(id));
        added++;
      } catch {
        toast('Could not read that image');
      }
    }
    e.target.value = '';
    if (added) toast(added === 1 ? 'Photo added' : `${added} photos added`);
  } });
  const thumbs = h('div', { class: 'thumbs' });
  Promise.all(run.photos.map(thumb)).then(els => thumbs.append(...els));

  root.append(h('div', { class: 'runner' },
    h('div', { class: 'top' },
      h('button', { class: 'btn sm', onclick: () => navigate('today') }, icon('back', 16), 'Today'),
      h('div', { class: 'dots', 'aria-label': `Block ${run.i + 1} of ${n}` }, run.plan.blocks.map((_, i) => h('i', { class: i < run.i ? 'done' : i === run.i ? 'on' : '' }))),
      h('span', { class: 'faint small num' }, `${run.i + 1} / ${n}`),
    ),
    h('div', { class: 'center' },
      h('div', { class: 'kind ' + k.cls }, k.label),
      h('div', { class: 'name' }, ex ? ex.name : 'Free drawing'),
      h('div', { class: 'note' },
        b.kind === 'play' ? 'Draw whatever you want, no rules. This is the half that keeps you drawing.' : (stage ? `${stage.name}. ${stage.note}` : ex.note),
        ex ? [' ', h('a', { href: stage ? stage.url : ex.url, target: '_blank', rel: 'noopener', style: 'color:var(--accent);font-weight:500' }, 'Instructions')] : null,
      ),
      clock,
      bar,
      countBox,
      h('div', { class: 'mt-lg' }, h('label', { class: 'btn sm' }, icon('camera', 16), 'Add photo', photoInput)),
      thumbs,
    ),
    h('div', { class: 'bottom' },
      h('div', { class: 'btns' },
        pauseBtn,
        h('button', { class: 'btn dark', 'data-action': last ? 'finish' : 'next', onclick: () => (last ? finish() : next()) }, last ? icon('check') : icon('next'), last ? 'Finish' : 'Next'),
      ),
      h('div', { class: 'btns' },
        h('button', { class: 'btn ghost sm', onclick: finishEarly }, 'End session here'),
        h('button', { class: 'btn ghost sm', style: 'color:var(--ink-3)', onclick: discard }, 'Discard'),
      ),
    ),
  ));

  function elapsedMs() {
    return run.elapsed + (run.paused ? 0 : Date.now() - run.startedAt);
  }
  function tick() {
    const sec = elapsedMs() / 1000;
    const remaining = target - sec;
    clock.textContent = remaining >= 0 ? L.fmtClock(remaining) : '+' + L.fmtClock(-remaining);
    clock.classList.toggle('over', remaining < 0);
    bar.firstChild.style.width = `${Math.min(100, (sec / target) * 100)}%`;
    if (remaining <= 0 && !run.alerted[run.i]) {
      run.alerted[run.i] = true;
      setRun(run);
      if (settings.sound) chime();
      if (navigator.vibrate) navigator.vibrate(200);
    }
  }
  function togglePause() {
    if (run.paused) { run.startedAt = Date.now(); run.paused = false; }
    else { run.elapsed = elapsedMs(); run.paused = true; }
    setRun(run);
    pauseBtn.replaceChildren(icon(run.paused ? 'play' : 'pause'), run.paused ? 'Resume' : 'Pause');
  }
  function bump(d) {
    run.counts[run.i] = Math.max(0, (run.counts[run.i] || 0) + d);
    countEl.textContent = run.counts[run.i];
    setRun(run);
  }
  function closeBlock() {
    run.actual[run.i] = Math.round(elapsedMs() / 60000);
  }
  function next() {
    closeBlock();
    run.i += 1;
    run.startedAt = Date.now();
    run.elapsed = 0;
    run.paused = false;
    setRun(run);
    stop();
    root.replaceChildren();
    renderSession(root, { state: store.get(), navigate });
  }
  async function finish() {
    closeBlock();
    const end = new Date().toISOString();
    const blocks = run.plan.blocks.slice(0, run.i + 1).map((bl, i) => ({ kind: bl.kind, exerciseId: bl.exerciseId, minutes: run.actual[i] ?? 0, count: run.counts[i] || 0, medium: run.medium }));
    stop();
    await store.recordSession({ id: run.sessionId, date: run.plan.date, start: run.start, end, blocks, note: '' });
    setRun(null);
    toast('Session saved');
    navigate('today');
  }
  async function finishEarly() {
    if (await confirmSheet({ title: 'End the session here?', text: 'What you did so far gets saved. The remaining blocks are skipped.', ok: 'End and save' })) finish();
  }
  async function discard() {
    if (!await confirmSheet({ title: 'Discard this session?', text: 'Nothing from it will be saved, photos included.', ok: 'Discard', danger: true })) return;
    stop();
    for (const id of run.photos) await store.deletePhoto(id);
    setRun(null);
    navigate('today');
  }
  function stop() {
    clearInterval(timer);
    timer = null;
  }
  tick();
  timer = setInterval(tick, 500);
  return stop;
}

async function thumb(id) {
  const blob = await store.photoBlob(id);
  if (!blob) return h('span', { class: 'ph' });
  const url = URL.createObjectURL(blob);
  const img = h('img', { src: url, alt: '' });
  img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
  return img;
}

// ---------- Curriculum ----------

const open = new Set();

export function renderCurriculum(root, ctx) {
  const { state } = ctx;
  const { curriculum: cur, progress } = state;
  const all = L.units(cur);
  if (!open.size) {
    const active = all.find(u => cur.order.includes(u.id) && L.unitStatus(cur, u, progress) !== 'complete');
    if (active) open.add(active.id);
  }
  const pathUnits = cur.order.map(id => L.unitById(cur, id));
  const overall = pathUnits.reduce((a, u) => a + L.unitProgress(u, progress), 0) / pathUnits.length;

  root.append(
    h('div', { class: 'eyebrow' }, cur.name),
    h('h1', { class: 'title' }, 'Curriculum'),
    h('p', { class: 'subtitle' }, 'The order Drawabox recommends. Every exercise links to its own instructions on ', h('a', { href: cur.site, target: '_blank', rel: 'noopener', style: 'color:var(--accent)' }, 'drawabox.com'), '.'),
    h('div', { class: 'card mt-lg' }, h('div', { class: 'pad' },
      h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, h('span', { class: 'label' }, 'Whole path'), h('span', { class: 'muted small num' }, `${Math.round(overall * 100)}%`)),
      h('div', { class: 'bar mt' }, h('i', { style: `width:${overall * 100}%` })),
    )),
  );

  for (const part of cur.parts) {
    root.append(section(part.name, h('div', { class: 'card' }, part.units.map(u => unitEl(ctx, u)))));
  }
  root.append(h('p', { class: 'tiny faint mt-lg' }, cur.attribution));
}

function unitEl(ctx, u) {
  const { state } = ctx;
  const { curriculum: cur, progress } = state;
  const status = L.unitStatus(cur, u, progress);
  const pct = L.unitProgress(u, progress);
  const done = u.exercises.filter(ex => L.exerciseState(ex, progress).done).length;
  const badge = { complete: ['good', 'Complete'], active: ['accent', 'In progress'], available: ['', 'Up next'], locked: ['', 'Later'] }[status];
  const el = h('div', { class: 'unit' + (open.has(u.id) ? ' open' : ''), 'data-unit': u.id });
  el.append(
    h('button', { class: 'unit-head', 'aria-expanded': open.has(u.id) ? 'true' : 'false', onclick: () => { open.has(u.id) ? open.delete(u.id) : open.add(u.id); el.classList.toggle('open'); el.firstChild.setAttribute('aria-expanded', el.classList.contains('open') ? 'true' : 'false'); } },
      ring(pct, 34, 3, status === 'complete' ? 'var(--good)' : 'var(--ink)'),
      h('div', { class: 'grow' },
        h('div', { class: 'name' }, u.name),
        h('div', { class: 'meta' }, h('span', { class: 'badge ' + badge[0] }, badge[1]), h('span', {}, `${done} of ${u.exercises.length} exercises`)),
      ),
      icon('chevron'),
    ),
    h('div', { class: 'unit-body' },
      h('p', { class: 'summary' }, u.summary),
      h('p', { class: 'tools' }, 'Tools: ' + u.tools),
      h('div', { class: 'links' },
        h('a', { href: u.url, target: '_blank', rel: 'noopener' }, 'Open the lesson'),
        status === 'complete' ? h('a', { href: cur.links.feedback, target: '_blank', rel: 'noopener' }, 'Get feedback') : null,
        (u.after || []).length && status === 'locked' ? h('span', { class: 'faint' }, 'After ' + u.after.map(id => L.unitById(cur, id)?.short || id).join(' and ')) : null,
      ),
      u.exercises.map(ex => exerciseEl(ctx, ex, status)),
    ),
  );
  return el;
}

function exerciseEl(ctx, ex, unitStatus) {
  const { state } = ctx;
  const { progress } = state;
  const s = L.exerciseState(ex, progress);
  const stage = L.stageOf(ex, s.count);
  const nEl = h('span', { class: 'n' }, `${s.count} / ${s.quota} ${L.unitLabel(ex.unit, s.quota)}`);
  const barEl = h('div', { class: 'bar thin ' + (s.done ? 'good' : '') }, h('i', { style: `width:${s.pct * 100}%` }));
  const el = h('div', { class: 'ex' + (s.done ? ' done' : '') + (unitStatus === 'locked' ? ' locked' : ''), 'data-exercise': ex.id },
    h('div', { class: 'name' }, ex.name, ext(stage ? stage.url : ex.url)),
    h('div', { class: 'note' }, stage ? `${stage.name}. ${stage.note}` : ex.note),
    h('div', { class: 'prog' }, barEl, nEl),
    h('div', { class: 'ctl stepper' },
      h('button', { 'aria-label': `One less ${L.unitLabel(ex.unit, 1)}`, disabled: s.count === 0, onclick: () => store.tick(ex.id, -1) }, icon('minus')),
      h('button', { 'aria-label': `One more ${L.unitLabel(ex.unit, 1)}`, 'data-action': 'inc', onclick: () => store.tick(ex.id, 1) }, icon('plus')),
    ),
  );
  return el;
}

// ---------- Log ----------

export function renderLog(root, ctx) {
  const { state } = ctx;
  const { curriculum: cur, sessions, photos } = state;
  const urls = [];
  root.append(h('div', { class: 'eyebrow' }, `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`), h('h1', { class: 'title' }, 'Log'));

  const byEx = new Map();
  for (const p of photos) if (p.exerciseId) byEx.set(p.exerciseId, [...(byEx.get(p.exerciseId) || []), p]);
  const comparable = [...byEx.entries()].filter(([, ps]) => ps.length >= 2);
  if (comparable.length) {
    let pick = comparable[0][0];
    const grid = h('div', { class: 'compare mt' });
    const select = h('select', { 'aria-label': 'Exercise to compare', onchange: e => { pick = e.target.value; draw(); } },
      comparable.map(([id]) => h('option', { value: id }, exOf(cur, id)?.name || id)));
    async function draw() {
      const ps = [...byEx.get(pick)].sort((a, b) => a.date.localeCompare(b.date));
      const first = ps[0];
      const latest = ps[ps.length - 1];
      grid.replaceChildren(await figure(first, 'First, ' + L.fmtDate(first.date)), await figure(latest, 'Latest, ' + L.fmtDate(latest.date)));
    }
    async function figure(p, cap) {
      const img = await big(p);
      return h('figure', {}, h('button', { style: 'width:100%', onclick: () => viewer(ctx, p) }, img), h('figcaption', {}, cap));
    }
    draw();
    root.append(section('Then and now', h('div', { class: 'card' }, h('div', { class: 'pad' }, h('div', { class: 'field', style: 'padding:0;border:0' }, h('label', {}, 'Exercise'), select), grid))));
  }

  if (!sessions.length) {
    root.append(h('div', { class: 'empty mt-lg' }, h('div', { class: 'big' }, 'Nothing yet'), h('p', { class: 'mt' }, 'Sessions and logged practice show up here, with your photos.')));
    return;
  }

  const days = new Map();
  for (const s of [...sessions].sort((a, b) => b.start.localeCompare(a.start))) days.set(s.date, [...(days.get(s.date) || []), s]);
  const totals = L.dayTotals(sessions);
  for (const [date, list] of days) {
    const t = totals.get(date) || { study: 0, play: 0 };
    const day = h('div', { class: 'day' }, h('h3', {}, `${L.fmtDate(date)} · ${L.fmtMinutes(t.study)} study · ${L.fmtMinutes(t.play)} play`));
    for (const s of list) {
      const card = h('div', { class: 'card', 'data-session': s.id });
      for (const b of s.blocks) {
        const ex = exOf(cur, b.exerciseId);
        const k = KIND[b.kind];
        card.append(h('div', { class: 'row' },
          h('div', { class: 'swatch ' + k.cls }, icon(k.icon)),
          h('div', { class: 'grow' },
            h('div', { class: 'label' }, ex ? ex.name : 'Free drawing'),
            h('div', { class: 'sub' }, [k.label, ex && b.count ? countText(ex, b.count) : null, b.medium ? MEDIUM[b.medium] : null].filter(Boolean).join(' · ')),
          ),
          h('div', { class: 'val' }, L.fmtMinutes(b.minutes || 0)),
        ));
      }
      if (s.note) card.append(h('p', { class: 'small muted', style: 'padding:0 16px 12px' }, s.note));
      const ps = photos.filter(p => p.sessionId === s.id);
      if (ps.length) {
        const grid = h('div', { class: 'photo-grid' });
        for (const p of ps) grid.append(h('button', { onclick: () => viewer(ctx, p), 'aria-label': 'Open photo' }, thumbLazy(p, urls)));
        card.append(grid);
      }
      card.append(h('div', { class: 'row' },
        h('span', { class: 'faint tiny grow' }, new Date(s.start).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })),
        h('button', { class: 'btn icon', 'aria-label': 'Delete session', 'data-action': 'delete-session', onclick: async () => {
          if (await confirmSheet({ title: 'Delete this session?', text: 'Its minutes, counts and photos are removed from your progress.', ok: 'Delete', danger: true })) { await store.deleteSession(s.id); toast('Deleted'); }
        } }, icon('trash', 18)),
      ));
      day.append(card);
    }
    root.append(day);
  }
  return () => { for (const u of urls) URL.revokeObjectURL(u); };
}

function thumbLazy(p, urls) {
  const img = h('img', { alt: '', width: p.w, height: p.h });
  store.photoBlob(p.id).then(blob => { if (blob) { const u = URL.createObjectURL(blob); urls.push(u); img.src = u; } });
  return img;
}

async function big(p) {
  const blob = await store.photoBlob(p.id);
  const img = h('img', { alt: '' });
  if (blob) { const u = URL.createObjectURL(blob); img.src = u; img.addEventListener('load', () => URL.revokeObjectURL(u), { once: true }); }
  return img;
}

async function viewer(ctx, p) {
  const ex = exOf(ctx.state.curriculum, p.exerciseId);
  const img = await big(p);
  const el = h('div', { class: 'viewer', onclick: e => { if (e.target === el) el.remove(); } },
    h('button', { class: 'close btn icon', 'aria-label': 'Close', onclick: () => el.remove() }, icon('close', 26)),
    h('button', { class: 'del btn icon', 'aria-label': 'Delete photo', onclick: async () => {
      if (await confirmSheet({ title: 'Delete this photo?', text: 'This cannot be undone.', ok: 'Delete', danger: true })) { await store.deletePhoto(p.id); el.remove(); }
    } }, icon('trash', 22)),
    img,
    h('div', { class: 'cap' }, [ex ? ex.name : 'Free drawing', L.fmtDate(p.date, { withYear: true })].join(' · ')),
  );
  document.body.append(el);
}

// ---------- Progress ----------

export function renderProgress(root, { state }) {
  const { curriculum: cur, progress, sessions } = state;
  const today = L.todayKey();
  const t = L.totals(sessions);
  const st = L.streak(sessions, today);
  const weeks = 12;
  const map = L.heatmap(sessions, today, weeks);
  const level = d => { const m = d.study + d.play; return m > 0 ? (m < 15 ? 'l1' : m < 40 ? 'l2' : 'l3') : d.count > 0 ? 'l1' : ''; };

  root.append(
    h('div', { class: 'eyebrow' }, `${t.days} ${t.days === 1 ? 'day' : 'days'} of practice`),
    h('h1', { class: 'title' }, 'Progress'),
    h('div', { class: 'stats' }, stat(String(st), 'day streak'), stat(L.fmtMinutes(t.study), 'study, total'), stat(L.fmtMinutes(t.play), 'play, total')),
  );

  root.append(section('Last 12 weeks', h('div', { class: 'card' }, h('div', { class: 'heat-wrap' },
    h('div', { class: 'heat', role: 'img', 'aria-label': 'Practice calendar' }, map.flatMap(col => col.map(d => h('i', { class: d.future ? 'future' : level(d), title: `${L.fmtDate(d.date)}: ${L.fmtMinutes(d.study + d.play)}` })))),
    h('div', { class: 'heat-legend' }, h('span', {}, L.fmtDate(map[0][0].date)), h('span', {}, 'Less to more time per day'), h('span', {}, 'Today')),
  ))));

  const total = t.study + t.play;
  root.append(section('Study and play', h('div', { class: 'card' }, h('div', { class: 'balance' },
    h('div', { class: 'small muted' }, 'The 50% rule asks that the blue half be at least as big as the black one.'),
    h('div', { class: 'track', role: 'img', 'aria-label': `Study ${Math.round((1 - t.ratio) * 100)}%, play ${Math.round(t.ratio * 100)}%` },
      h('i', { class: 's', style: `width:${total ? (t.study / total) * 100 : 50}%` }),
      h('i', { class: 'p', style: `width:${total ? (t.play / total) * 100 : 50}%` }),
      h('i', { class: 'mid' }),
    ),
    h('div', { class: 'legend' }, h('span', {}, 'Study ', h('b', { class: 'num' }, L.fmtMinutes(t.study))), h('span', {}, 'Play ', h('b', { class: 'num' }, L.fmtMinutes(t.play)))),
  ))));

  const unitsPath = [...cur.order, ...(cur.parallel || [])].map(id => L.unitById(cur, id));
  root.append(section('Path', h('div', { class: 'card' }, unitsPath.map(u => {
    const status = L.unitStatus(cur, u, progress);
    const pct = L.unitProgress(u, progress);
    return h('div', { class: 'row' },
      ring(pct, 34, 3, status === 'complete' ? 'var(--good)' : 'var(--ink)'),
      h('div', { class: 'grow' }, h('div', { class: 'label' }, u.name), h('div', { class: 'sub' }, { complete: 'Complete', active: 'In progress', available: 'Up next', locked: 'Later' }[status])),
      h('div', { class: 'val' }, `${Math.round(pct * 100)}%`),
    );
  }))));
}

// ---------- Settings ----------

export function renderSettings(root, { state, demo }) {
  const { settings, curriculum: cur } = state;
  const opt = (values, current, label = v => String(v)) => values.map(v => h('option', { value: v, selected: v === current }, label(v)));
  const field = (label, control, hint) => h('div', { class: 'field' }, h('div', {}, h('label', {}, label), hint ? h('div', { class: 'hint' }, hint) : null), control);
  const sel = (key, values, label) => h('select', { 'aria-label': key, onchange: e => store.setSettings({ [key]: Number(e.target.value) }) }, opt(values, settings[key], label));

  root.append(
    h('div', { class: 'eyebrow' }, 'Kata'),
    h('h1', { class: 'title' }, 'Settings'),
    section('Session', h('div', { class: 'card' },
      field('Study time', sel('studyMinutes', [15, 20, 25, 30, 40, 45, 60, 90], v => `${v} min`), 'Warm-ups plus homework'),
      field('Warm-ups', sel('warmupMinutes', [5, 10, 15, 20], v => `${v} min`), 'Drawabox suggests 10 to 15'),
      field('Warm-up exercises', sel('warmupCount', [1, 2, 3, 4]), 'Per session'),
      field('Play target', sel('playMinutes', [10, 15, 20, 30, 45, 60, 90], v => `${v} min`), 'Free drawing after the study block'),
    )),
    section('You', h('div', { class: 'card' },
      field('Drawing on', h('div', { style: 'min-width:220px' }, seg([['paper', 'Paper'], ['tablet', 'Tablet'], ['both', 'Both']], settings.medium, v => store.setSettings({ medium: v }))), 'Both asks at the start of each session'),
      field('Sound when a block ends', h('input', { type: 'checkbox', checked: settings.sound, onchange: e => store.setSettings({ sound: e.target.checked }) })),
      field('Name', h('input', { type: 'text', value: settings.name, placeholder: 'Optional', onchange: e => store.setSettings({ name: e.target.value.trim() }) })),
    )),
    section('Appearance', h('div', { class: 'card' },
      field('Theme', h('div', { style: 'min-width:220px' }, seg([['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], settings.theme, v => { applyTheme(v); store.setSettings({ theme: v }); }))),
    )),
    section('Data', h('div', { class: 'card' },
      h('button', { class: 'row tap', onclick: exportBackup }, h('div', { class: 'swatch' }, icon('download')), h('div', { class: 'grow' }, h('div', { class: 'label' }, 'Export backup'), h('div', { class: 'sub' }, 'One JSON file with sessions, progress and photos')), icon('chevron')),
      h('label', { class: 'row tap' }, h('div', { class: 'swatch' }, icon('upload')), h('div', { class: 'grow' }, h('div', { class: 'label' }, 'Import backup'), h('div', { class: 'sub' }, 'Replaces everything on this device')), icon('chevron'), h('input', { type: 'file', accept: 'application/json,.json', class: 'sr', onchange: importBackup })),
      h('button', { class: 'row tap', onclick: erase }, h('div', { class: 'swatch', style: 'color:var(--accent)' }, icon('trash')), h('div', { class: 'grow' }, h('div', { class: 'label', style: 'color:var(--accent)' }, 'Erase everything'), h('div', { class: 'sub' }, 'Sessions, progress, photos and settings')), icon('chevron')),
    )),
    section('About', h('div', { class: 'card' }, h('div', { class: 'pad small muted' },
      h('p', {}, 'Kata is a practice tracker. It plans a short daily session, keeps count of your homework and keeps your photos side by side so you can see the change. Everything stays on this device unless you export it.'),
      h('p', { class: 'mt' }, cur.attribution),
      h('p', { class: 'mt' }, h('a', { href: cur.site, target: '_blank', rel: 'noopener', style: 'color:var(--accent)' }, 'drawabox.com'), ' · ', h('a', { href: cur.links.digital, target: '_blank', rel: 'noopener', style: 'color:var(--accent)' }, 'On drawing digitally'), demo ? ' · Demo data' : ''),
    ))),
  );

  async function exportBackup() {
    const text = await store.exportBackup();
    const blob = new Blob([text], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `kata-backup-${L.todayKey()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    toast('Backup ready');
  }
  async function importBackup(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!await confirmSheet({ title: 'Replace everything with this backup?', text: 'What is on this device now will be overwritten.', ok: 'Replace', danger: true })) { e.target.value = ''; return; }
    try {
      await store.importBackup(await f.text());
      toast('Backup restored');
    } catch (err) {
      toast(err.message || 'Could not read that file');
    }
    e.target.value = '';
  }
  async function erase() {
    if (!await confirmSheet({ title: 'Erase everything?', text: 'Sessions, progress, photos and settings on this device. This cannot be undone.', ok: 'Erase', danger: true })) return;
    await store.wipe();
    localStorage.removeItem(RUN_KEY);
    toast('Erased');
  }
}
