import { useEffect, useRef, useState } from 'react';
import CareerPathMascot from '../../career/mascot/CareerPathMascot';
import { useMascot, useMascotRegion } from '../../career/mascot/useMascot';
import { expressions, stills } from '../../mascot/mascotConfig';
import { STILLS } from '../../mascot/stills';

/**
 * The mascot workbench, at /dev/mascot in dev builds only. A Career-Path-
 * shaped page — a hero with a Start button, cards, a locked step, notes, a
 * quiz, a "video" — and a button for every moment the mascot can be sent, so
 * each behaviour can be watched on its own without earning it first.
 */
const EXPRESSIONS = Object.keys(expressions).filter((k) => k !== 'crossfadeMs');
const STILL_NAMES = STILLS.filter((s) => s in stills.scale).concat(STILLS.filter((s) => !(s in stills.scale)));

function Controls() {
    const mascot = useMascot();
    const [log, setLog] = useState([]);
    const note = (text) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${text}`, ...l].slice(0, 12));
    const fire = (label, fn) => () => {
        fn();
        note(label);
    };
    const events = [
        ['First view: wave, then point at Start', () => { mascot.react('wave-hi'); mascot.point('start-quest', 'Start here'); }],
        ['Step completed', () => mascot.stepCompleted()],
        ['Phase completed', () => mascot.phaseCompleted()],
        ['Path completed', () => mascot.pathCompleted()],
        ['Badge earned', () => mascot.emit({ type: 'badgeEarned', title: 'Early bird' })],
        ['Quiz passed', () => mascot.quizGraded({ passed: true })],
        ['Quiz failed', () => mascot.quizGraded({ passed: false })],
        ['Answer right', () => mascot.quizAnswer(true)],
        ['Answer wrong', () => mascot.quizAnswer(false)],
        ['Locked step clicked', () => mascot.lockedClicked(document.querySelector('[data-mascot-locked]'), 'Class 11', 'current-roadmap-position')],
        ['Card clicked', () => mascot.cardClicked(document.querySelector('[data-mascot-card]'))],
        ['Timetable opened', () => mascot.timetableOpened()],
        ['Calendar opened', () => mascot.calendarOpened()],
        ['Task started', () => mascot.taskStarted()],
        ['Video playing', () => mascot.video('playing', document.querySelector('[data-mascot-context="video"]'))],
        ['Video paused', () => mascot.video('paused', document.querySelector('[data-mascot-context="video"]'))],
        ['Video ended', () => mascot.video('ended', document.querySelector('[data-mascot-context="video"]'))],
        ['Idle nudge (10s)', () => mascot.emit({ type: 'idleCta', cta: document.querySelector('[data-mascot-target="start-task"]') })],
        ['Sleep', () => mascot.sleep()],
        ['Wake', () => mascot.wake()],
        ['Walk home', () => mascot.emit({ type: 'custom', key: 'home', steps: [{ do: 'home' }] })],
        ['Run to centre', () => mascot.emit({ type: 'custom', key: 'centre', steps: [{ do: 'centre' }] })],
        ['Wander', () => mascot.emit({ type: 'wander' })],
        ['Head shake', () => mascot.emit({ type: 'custom', key: 'shake', steps: [{ do: 'shake' }] })],
        ['Wave (rig)', () => mascot.emit({ type: 'custom', key: 'wave', steps: [{ do: 'gesture', name: 'wave' }] })],
        ['Celebrate (rig)', () => mascot.emit({ type: 'custom', key: 'celebrate', steps: [{ do: 'gesture', name: 'celebrate' }] })],
        ['Clap (rig)', () => mascot.emit({ type: 'custom', key: 'clap', steps: [{ do: 'gesture', name: 'clap' }] })],
        ['Start pressed', () => mascot.emit({ type: 'startClicked' })],
        ['Play pressed', () => mascot.emit({ type: 'playClicked' })],
        ['Confetti', () => mascot.emit({ type: 'custom', key: 'confetti', steps: [{ do: 'confetti' }] })]
    ];
    return (
        <aside className="dev-panel">
            <h2>Moments</h2>
            <div className="dev-grid">
                {events.map(([label, fn]) => (
                    <button key={label} type="button" onClick={fire(label, fn)}>{label}</button>
                ))}
            </div>
            <h2>Point at</h2>
            <div className="dev-grid">
                {['start-quest', 'start-task', 'retry', 'current-roadmap-position', 'rewards', 'calendar-day', 'current-class', 'skill-task', 'pending-task', 'enroll', 'claim-badge'].map((name) => (
                    <button key={name} type="button" onClick={fire(`point ${name}`, () => mascot.point(name, name))}>{name}</button>
                ))}
            </div>
            <h2>Expression</h2>
            <div className="dev-grid">
                {EXPRESSIONS.map((name) => (
                    <button key={name} type="button" onClick={fire(`expression ${name}`, () => mascot.setExpression(name, 4000))}>{name}</button>
                ))}
            </div>
            <h2>Still</h2>
            <div className="dev-grid">
                {STILL_NAMES.map((name) => (
                    <button key={name} type="button" onClick={fire(`still ${name}`, () => mascot.react(name))}>{name}</button>
                ))}
            </div>
            <label className="dev-row">
                <input type="checkbox" checked={!mascot.hidden} onChange={(e) => mascot.setHidden(!e.target.checked)} /> mascot shown
            </label>
            <pre className="dev-log">{log.join('\n')}</pre>
        </aside>
    );
}

function Page() {
    const reading = useMascotRegion('reading');
    const quiz = useMascotRegion('quiz');
    const [picked, setPicked] = useState(null);
    const mascot = useMascot();
    const started = useRef(false);
    useEffect(() => {
        if (started.current) return;
        started.current = true;
        // The Overview's own entrance, so the page opens the way the real one does.
        const t = setTimeout(() => {
            mascot.react('wave-hi');
            mascot.point('start-quest', 'Start here');
        }, 900);
        return () => clearTimeout(t);
    }, [mascot]);

    return (
        <div className="dev-page">
            <section className="dev-hero">
                <div>
                    <p className="dev-eyebrow">Good morning</p>
                    <h1>Your career journey</h1>
                    <p>A stand-in for the Career Path Overview: the hero, its quest button, and the cards below.</p>
                </div>
                <a href="#today" data-mascot-target="start-quest" className="dev-cta">Start today's quest</a>
            </section>

            <section className="dev-cards">
                {['Software Engineer', 'Data Analyst', 'Product Designer'].map((career) => (
                    <button key={career} type="button" data-mascot-card className="dev-card">
                        <strong>{career}</strong>
                        <span>Hover me: it looks. Click: it walks over and points at Enroll.</span>
                    </button>
                ))}
                <button type="button" data-mascot-target="enroll" className="dev-cta">Enroll</button>
            </section>

            <section id="today" className="dev-panel-card">
                <h2>Today's plan</h2>
                <ul className="dev-tasks">
                    <li>
                        <span>Write a README</span>
                        <button type="button" data-mascot-target="start-task" className="dev-cta small">Start</button>
                    </li>
                    <li>
                        <span>Sketch a landing page</span>
                        <button type="button" className="dev-cta small ghost">Start</button>
                    </li>
                </ul>
                <button type="button" data-mascot-locked="today's tasks" data-mascot-prerequisite="start-task" className="dev-cta locked">Add another task (locked)</button>
            </section>

            <section className="dev-roadmap">
                {['Class 11', 'Class 12', 'Degree', 'First job'].map((phase, i) => (
                    <button
                        key={phase}
                        type="button"
                        data-mascot-target={i === 1 ? 'current-roadmap-position' : undefined}
                        data-mascot-locked={i > 1 ? 'Class 12' : undefined}
                        data-mascot-prerequisite={i > 1 ? 'current-roadmap-position' : undefined}
                        className={`dev-node ${i === 1 ? 'now' : i > 1 ? 'locked' : 'done'}`}
                    >
                        {phase}
                    </button>
                ))}
                <button type="button" data-mascot-target="claim-badge" className="dev-cta small">Share badge</button>
            </section>

            <section className="dev-two">
                <div className="dev-panel-card">
                    <h2>Calendar</h2>
                    <div className="dev-calendar">
                        {Array.from({ length: 14 }, (_, i) => (
                            <button key={i} type="button" data-mascot-target={i === 9 ? 'calendar-day' : undefined} className={i === 9 ? 'today' : ''}>{i + 1}</button>
                        ))}
                    </div>
                </div>
                <div className="dev-panel-card">
                    <h2>Timetable</h2>
                    <table className="dev-table">
                        <tbody>
                            <tr><td>09:00</td><td>Maths</td></tr>
                            <tr><td>10:00</td><td><span data-mascot-target="current-class" className="live">Physics · Now</span></td></tr>
                            <tr><td>11:00</td><td><span data-mascot-target="next-class">Chemistry</span></td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="dev-two">
                <div className="dev-panel-card">
                    <h2>Skills</h2>
                    <p>Communication · 3 more tasks to Intermediate</p>
                    <a href="#today" data-mascot-target="skill-task" className="dev-cta small">Today: Write a README</a>
                </div>
                <div className="dev-panel-card">
                    <h2>Rewards</h2>
                    <div data-mascot-target="rewards" className="dev-badge">
                        <strong>Early bird</strong>
                        <span>40 XP to unlock</span>
                        <a href="#today" data-mascot-target="rewards-task" className="dev-cta small">+10 XP with today's task</a>
                    </div>
                    <a href="#today" data-mascot-target="pending-task" className="dev-link">Earn 10 XP now</a>
                </div>
            </section>

            <section ref={reading} data-mascot-context="reading" className="dev-panel-card dev-notes">
                <h2>Notes</h2>
                {Array.from({ length: 6 }, (_, i) => (
                    <p key={i}>
                        Paragraph {i + 1}. While this section is on screen the mascot reads along: its eyes sweep each line, drop to the next,
                        and every few lines it glances up. Scroll it away and the reading stops.
                    </p>
                ))}
            </section>

            <section data-mascot-context="video" className="dev-panel-card dev-video">
                <h2>Video</h2>
                <div className="dev-screen">Use the Video buttons on the right to play, pause and end it.</div>
            </section>

            <section ref={quiz} data-mascot-target="quiz" className="dev-panel-card dev-quiz">
                <h2>Check you got it</h2>
                <p>Which planet is closest to the Sun?</p>
                <div className="dev-answers">
                    {['Venus', 'Mercury', 'Mars'].map((a) => (
                        <button key={a} type="button" className={picked === a ? 'picked' : ''} onClick={() => { setPicked(a); mascot.quizAnswer(a === 'Mercury'); }}>{a}</button>
                    ))}
                </div>
                <button type="button" data-mascot-target="retry" className="dev-cta small ghost">Try again</button>
            </section>
            <div style={{ height: '40vh' }} />
        </div>
    );
}

export default function MascotDemo() {
    return (
        <CareerPathMascot>
            <style>{CSS}</style>
            <main className="dev-main">
                <Page />
            </main>
            <Controls />
        </CareerPathMascot>
    );
}

const CSS = `
.dev-main { position: fixed; inset: 0; right: 340px; overflow: auto; background: #f6f5fb; padding: 24px; font-family: system-ui, sans-serif; color: #1e1b4b; }
.dev-page { max-width: 880px; margin: 0 auto; display: grid; gap: 20px; }
.dev-hero { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 32px; border-radius: 24px; color: #fff; background: linear-gradient(120deg, #6d28d9, #4f46e5); }
.dev-hero h1 { margin: 4px 0 8px; font-size: 28px; }
.dev-eyebrow { opacity: .8; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; margin: 0; }
.dev-cta { display: inline-flex; align-items: center; padding: 12px 20px; border-radius: 14px; background: #fff; color: #4c1d95; font-weight: 800; text-decoration: none; border: 0; cursor: pointer; box-shadow: 0 8px 20px -8px rgba(30,27,75,.5); }
.dev-cta.small { padding: 8px 14px; font-size: 13px; background: linear-gradient(90deg, #7c3aed, #4f46e5); color: #fff; }
.dev-cta.ghost { background: #eef; color: #4c1d95; box-shadow: none; }
.dev-cta.locked { background: #e5e7eb; color: #6b7280; box-shadow: none; cursor: not-allowed; }
.dev-cards { display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 12px; align-items: center; }
.dev-card { display: grid; gap: 4px; text-align: left; padding: 16px; border-radius: 16px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; }
.dev-card span { font-size: 12px; color: #6b7280; }
.dev-panel-card { padding: 20px; border-radius: 20px; background: #fff; border: 1px solid #e5e7eb; }
.dev-panel-card h2 { margin: 0 0 12px; font-size: 16px; }
.dev-tasks { list-style: none; padding: 0; margin: 0 0 12px; display: grid; gap: 8px; }
.dev-tasks li { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 12px; background: #f9fafb; }
.dev-roadmap { display: flex; gap: 16px; align-items: center; padding: 20px; border-radius: 20px; background: #fff; border: 1px solid #e5e7eb; }
.dev-node { width: 96px; height: 72px; border-radius: 16px; border: 0; font-weight: 800; cursor: pointer; }
.dev-node.done { background: #d1fae5; color: #065f46; } .dev-node.now { background: #ede9fe; color: #4c1d95; outline: 3px solid #a78bfa; } .dev-node.locked { background: #f3f4f6; color: #9ca3af; }
.dev-two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dev-calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.dev-calendar button { height: 40px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; }
.dev-calendar button.today { background: linear-gradient(120deg, #7c3aed, #4f46e5); color: #fff; font-weight: 800; }
.dev-table { width: 100%; border-collapse: collapse; } .dev-table td { padding: 8px; border-bottom: 1px solid #eee; }
.dev-table .live { padding: 4px 8px; border-radius: 8px; background: #ede9fe; color: #4c1d95; font-weight: 800; }
.dev-badge { display: grid; gap: 6px; padding: 14px; border-radius: 16px; border: 2px dashed #c4b5fd; background: #f5f3ff; margin-bottom: 8px; }
.dev-link { color: #6d28d9; font-weight: 800; font-size: 13px; }
.dev-notes p { line-height: 1.6; color: #374151; }
.dev-screen { aspect-ratio: 16 / 9; display: grid; place-items: center; border-radius: 12px; background: #111827; color: #9ca3af; }
.dev-answers { display: grid; gap: 8px; margin-bottom: 12px; }
.dev-answers button { text-align: left; padding: 10px 14px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; }
.dev-answers button.picked { border-color: #7c3aed; background: #f5f3ff; }
.dev-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 340px; overflow: auto; padding: 16px; background: #111827; color: #e5e7eb; font: 12px system-ui, sans-serif; }
.dev-panel h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #9ca3af; margin: 14px 0 8px; }
.dev-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.dev-grid button { padding: 6px 9px; border-radius: 8px; border: 1px solid #374151; background: #1f2937; color: #e5e7eb; cursor: pointer; font-size: 11px; }
.dev-grid button:hover { background: #374151; }
.dev-row { display: flex; gap: 8px; align-items: center; margin-top: 14px; }
.dev-log { margin-top: 12px; padding: 10px; border-radius: 8px; background: #0b1020; color: #a5b4fc; white-space: pre-wrap; min-height: 80px; }
@media (max-width: 900px) { .dev-main { right: 0; } .dev-panel { display: none; } .dev-two, .dev-cards { grid-template-columns: 1fr; } }
`;
