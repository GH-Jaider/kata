// Sample data for ?demo: a few weeks of sessions on a separate database. Nothing here is real.

import { addDays, todayKey, exercises, planSession, seeded } from './logic.js';

export async function seedDemo(store) {
  const state = store.get();
  const cur = state.curriculum;
  const rnd = seeded('kata-demo');
  const today = todayKey();
  // Walk 24 days backwards, skipping a few, planning each day against the progress so far.
  const days = [];
  for (let i = 24; i >= 0; i--) if (rnd() > 0.22 || i === 0) days.push(addDays(today, -i));
  for (const date of days) {
    const plan = planSession(cur, store.get().progress, { ...state.settings, warmupCount: 2 }, { seed: 'demo', today: date });
    const blocks = plan.blocks.map(b => {
      const ex = b.exerciseId ? exercises(cur).find(e => e.id === b.exerciseId) : null;
      let count = 0;
      if (b.kind === 'homework' && ex) count = ex.unit === 'boxes' ? 5 + Math.floor(rnd() * 8) : ex.unit === 'read' ? 1 : 1 + Math.floor(rnd() * 2);
      if (b.kind === 'warmup') count = rnd() > 0.6 ? 1 : 0;
      const minutes = b.kind === 'play' ? Math.round(10 + rnd() * 40) : Math.round(b.minutes * (0.8 + rnd() * 0.5));
      return { ...b, count, minutes, medium: rnd() > 0.5 ? 'paper' : 'tablet' };
    });
    await store.recordSession({ date, start: `${date}T19:00:00`, end: `${date}T20:00:00`, blocks, note: '' });
  }
}
