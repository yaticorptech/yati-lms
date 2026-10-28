/**
 * The learning plan's words (asked 2026-10-24), shared by the start screens,
 * the roadmap and the panel beside the path.
 */
export const PLAN_LABEL = { 14: '2 weeks', 30: '1 month', 60: '2 months', 90: '3 months', 180: '6 months' };
export const planLabel = (days) => PLAN_LABEL[days] || `${days} days`;
export const perDayText = (n) => (n >= 1 ? `about ${Math.round(n)} lesson${Math.round(n) === 1 ? '' : 's'} a day` : 'a lesson most days');

/** Whether the student keeps to the plan: its tone and what to tell them. */
export const planStatus = (p) => (p.over ? { tone: 'red', text: 'Your plan’s time is up. Choose a new time to make a new roadmap.' }
    : p.behind > 0 ? { tone: 'orange', text: `You are ${p.behind} lesson${p.behind === 1 ? '' : 's'} behind. Do a few more today to catch up.` }
        : { tone: 'green', text: 'You are on track.' });

/** The days the roadmap's road marks (RoadmapScene.jsx): the first, the last, and three between (2 weeks: 1, 4, 7, 10, 14). */
export const markedDays = (days) => [...new Set([0, 1, 2, 3, 4].map((k) => (k === 4 ? days : 1 + Math.floor(((days - 1) * k) / 4))))];
