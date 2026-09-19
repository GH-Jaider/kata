<script>
  // Practice done without the timer: exercise, count, minutes, medium, photos, a note.
  import Sheet from './Sheet.svelte';
  import { db, cur, recordSession, addPhoto } from '../lib/store.svelte.js';
  import { toast } from '../lib/ui.svelte.js';
  import * as L from '../lib/logic.js';

  let { exerciseId = null, onclose } = $props();
  const units = [...cur.order, ...cur.parallel].map(id => L.unitById(cur, id));
  let selected = $state(exerciseId || L.nextExercise(cur, db.progress)?.id || '');
  let kind = $state('homework');
  let count = $state(1);
  let minutes = $state(15);
  let medium = $state(db.settings.medium);
  let note = $state('');
  let files = $state(null);
  const ex = $derived(selected ? L.exerciseById(cur, selected) : null);

  async function save() {
    const mins = Math.max(0, Number(minutes) || 0);
    if (!ex && !mins) { toast('Add some minutes'); return; }
    const now = new Date().toISOString();
    const session = await recordSession({ date: L.todayKey(), start: now, end: now, note: note.trim(), blocks: [{ kind: ex ? kind : 'play', exerciseId: ex ? ex.id : null, minutes: mins, count: ex ? count : 0, medium }] });
    let failed = 0;
    for (const f of files || []) { try { await addPhoto(f, { exerciseId: ex ? ex.id : null, sessionId: session.id, kind: ex ? kind : 'play' }); } catch { failed++; } }
    toast(failed ? 'Logged, but a photo could not be read' : 'Logged');
    onclose?.();
  }
</script>

<Sheet title="Log practice" {onclose}>
  <div class="field"><label for="lg-ex">Exercise</label>
    <select id="lg-ex" bind:value={selected}>
      <option value="">Free drawing</option>
      {#each units as u}<optgroup label={u.short}>{#each u.exercises as e}<option value={e.id}>{e.name}</option>{/each}</optgroup>{/each}
    </select>
  </div>
  {#if ex}
    <div class="field"><span class="lbl">Counts as</span><div class="seg"><button class:on={kind === 'homework'} onclick={() => (kind = 'homework')}>Study</button><button class:on={kind === 'warmup'} onclick={() => (kind = 'warmup')}>Warm-up</button></div></div>
    <div class="field"><div><span class="lbl">Done</span><div class="hint">{L.unitLabel(ex.unit, count)}</div></div><div class="stepper"><button class="round" onclick={() => (count = Math.max(0, count - 1))} aria-label="Less">−</button><span class="n num">{count}</span><button class="round" onclick={() => (count += 1)} aria-label="More">+</button></div></div>
  {/if}
  <div class="field"><label for="lg-min">Minutes</label><input id="lg-min" type="number" min="0" max="600" step="5" inputmode="numeric" bind:value={minutes}></div>
  <div class="field"><span class="lbl">Medium</span><div class="seg"><button class:on={medium === 'paper'} onclick={() => (medium = 'paper')}>Paper</button><button class:on={medium === 'tablet'} onclick={() => (medium = 'tablet')}>Tablet</button></div></div>
  <div class="field"><div><span class="lbl">Photos</span><div class="hint">{files?.length ? `${files.length} selected` : 'None'}</div></div><label class="btn line" style="height:40px;font-size:15px">Add photos<input class="sr" type="file" accept="image/*" multiple onchange={e => (files = e.target.files)}></label></div>
  <div class="field col"><label for="lg-note">Note</label><textarea id="lg-note" bind:value={note} placeholder="What went well, what to fix next time"></textarea></div>
  <button class="btn" style="width:100%;margin-top:18px" onclick={save}>Save</button>
</Sheet>
