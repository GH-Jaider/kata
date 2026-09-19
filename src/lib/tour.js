// Guided tours with driver.js: one across Today, Path and Journal the first time the app opens (or from Settings),
// and a short one inside the first session. Elements are found by data-tour attributes.
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { navigate } from './ui.svelte.js';

const KEY = 'kata.tour';
const KEY_SESSION = 'kata.tour.session';

export const toured = () => { try { return !!localStorage.getItem(KEY); } catch { return true; } };
export const touredSession = () => { try { return !!localStorage.getItem(KEY_SESSION); } catch { return true; } };
const mark = key => { try { localStorage.setItem(key, '1'); } catch {} };

const has = sel => !!document.querySelector(sel);
const waitFor = (sel, timeout = 3000) => new Promise(resolve => {
  const t0 = Date.now();
  const tick = () => { if (has(sel)) resolve(true); else if (Date.now() - t0 > timeout) resolve(false); else setTimeout(tick, 60); };
  tick();
});

let active = null; // the running driver, for step hooks

const base = {
  showProgress: true,
  allowClose: true,
  overlayOpacity: 0.55,
  stagePadding: 6,
  stageRadius: 0,
  popoverClass: 'kata-tour',
  nextBtnText: 'Next',
  prevBtnText: 'Back',
  doneBtnText: 'Done',
  progressText: '{{current}} of {{total}}',
};

// A step whose "Next" first moves to another screen and waits for it.
function stepThenGo(step, route, sel) {
  return {
    ...step,
    popover: {
      ...step.popover,
      onNextClick: async () => { navigate(route); await waitFor(sel); active?.moveNext(); },
    },
  };
}

export function startTour({ fresh = false } = {}) {
  if (active) return active;
  mark(KEY); // marked at start, so a screen re-mounting mid-tour never starts a second one
  const steps = [];
  steps.push({ element: '[data-tour="nav"]', popover: { title: 'Four places', description: 'Today is your session. Path is the whole course, in order. Journal is your days and your photos. How to shows how to set Kata up next to what you draw on.', side: 'bottom', align: 'center' } });
  steps.push({ element: '[data-tour="blocks"]', popover: { title: 'A session is a few steps', description: fresh
    ? 'Each colour is one step. Your first session is only two: read Lesson 0, then draw whatever you like. From then on there is a teal warm-up first, then one red exercise from the course, then yellow free drawing.'
    : 'Each colour is one step: teal warm-up from exercises you already know, red homework with one exercise from the course, yellow free drawing. Kata picks them; you just draw.', side: 'top', align: 'start' } });
  if (has('[data-tour="homework"]')) steps.push({ element: '[data-tour="homework"]', popover: { title: 'The exercise you are on', description: 'Lesson, exercise number and page count, straight from the course. When an exercise reaches its pages, the path moves to the next one by itself.', side: 'top', align: 'start' } });
  steps.push({ element: '[data-tour="start"]', popover: { title: 'Start runs the clock', description: 'One step at a time. Inside the session, Next moves on, + counts a finished page and Photo keeps the page. "on paper" switches between paper and tablet. "log practice instead" records drawing you did without the clock.', side: 'top', align: 'start' } });
  if (has('[data-tour="week"]')) steps.push({ element: '[data-tour="week"]', popover: { title: 'Five days a week', description: 'That is the goal. The other two are spare days, not failures. There is no streak to break.', side: 'top', align: 'start' } });
  steps.push(stepThenGo({ element: '[data-tour="gear"]', popover: { title: 'Settings', description: 'Session length, days a week, theme, backup, starting over, and this tour again.', side: 'bottom', align: 'end' } }, 'path', '[data-tour="path-list"]'));
  const pathStep = { element: '[data-tour="path-list"]', popover: { title: 'The course', description: 'Seven lessons and four challenges, in the order Drawabox recommends. Open a lesson to see its exercises. The + next to each one counts pages you drew without the clock.', side: 'right', align: 'start' } };
  const nowStep = { element: '[data-tour="now"]', popover: { title: 'Where you are', description: 'The exercise the path is on, with its figure and its count. "Open the card" shows the steps and what to watch for.', side: 'left', align: 'start' } };
  // The now card only exists while the course is unfinished; whichever step is last on Path moves on to Journal.
  const goJournal = step => stepThenGo(step, 'journal', '[data-tour="month"]');
  steps.push(goJournal(pathStep));
  steps.splice(steps.length - 1, 1, pathStep, goJournal(nowStep));
  nowStep.skipMissingElement = true;
  steps.push({ element: '[data-tour="month"]', popover: { title: 'Your days', description: 'Every day you drew, as a dot. Only the days you did count; missed ones are not marked.', side: 'bottom', align: 'end' } });
  steps.push(stepThenGo({ element: '[data-tour="journal-list"]', popover: { title: 'Your pages', description: 'Sessions and photos by day. Photograph an exercise twice and Kata puts your first page next to the latest.', side: 'top', align: 'start' } }, 'today', '[data-tour="start"]'));
  steps.push({ popover: { title: 'That is all', description: 'Press Start when you are ready. "How to" in the top bar shows the three ways to set Kata up next to paper or Procreate. This tour is in Settings whenever you want it.' } });

  const d = driver({ ...base, steps, onDestroyed: () => { mark(KEY); if (active === d) active = null; } });
  active = d;
  d.drive();
  return d;
}

export function startSessionTour() {
  if (active) return active;
  mark(KEY_SESSION);
  const steps = [
    { element: '[data-tour="s-top"]', popover: { title: 'Where you are', description: 'Which step this is, how long it lasts, and what comes next.', side: 'bottom', align: 'start' } },
    { element: '[data-tour="s-head"]', popover: { title: 'What to do', description: 'The exercise, its place in the course, and the steps in Kata\'s words. "Full instructions" opens the lesson on drawabox.com.', side: 'bottom', align: 'start' } },
    { element: '[data-tour="clock"]', popover: { title: 'The clock', description: 'It counts down, then keeps counting past zero. It is a suggestion, not a whistle. Pause if you need to.', side: 'left', align: 'center' } },
  ];
  if (has('[data-tour="count"]')) steps.push({ element: '[data-tour="count"]', popover: { title: 'How many on this page', description: 'This exercise is counted in pieces, not pages. Set how many fit on the page you are about to finish.', side: 'top', align: 'start' } });
  if (has('[data-tour="skip"]')) steps.push({ element: '[data-tour="skip"]', popover: { title: 'One step, one page', description: 'This step is one page of the exercise. Finishing the step counts the page. If you did not finish it, say so here and it will not count.', side: 'top', align: 'start' } });
  steps.push({ element: '[data-tour="photo"]', popover: { title: 'Keep the page', description: 'Photo saves the page so you can see it next to your first one, weeks from now.', side: 'top', align: 'center' } });
  steps.push({ element: '[data-tour="next"]', popover: { title: 'Move on', description: '"Page done" counts the page and goes to the next step; on the last step it closes the session with a summary. That is how the path advances. "Finish early" saves what you did so far.', side: 'top', align: 'end' } });
  const d = driver({ ...base, steps, onDestroyed: () => { mark(KEY_SESSION); if (active === d) active = null; } });
  active = d;
  d.drive();
  return d;
}
