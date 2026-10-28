/**
 * One inter-college competition: its details (who organizes it, the game, the
 * dates, the colleges taking part, the team limits, the rules, the prizes and
 * certificates), the knockout round by round, and the winners once decided.
 *
 * A quiz or a hackathon (asked 2026-10-23) shows the quiz, or the problem and
 * the team's project, in place of the rounds (ChallengeBox); one entered by
 * students on their own has its Sign up here.
 *
 * Once it is over this is its results page (Results → View Full Results): the
 * winners, the final standings of every team, the rounds and the rules. The
 * prizes box and the list of colleges taking part are left out there — the
 * standings name every team, and the prizes have been given.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Users, Trophy, Clock, Swords, Download, Loader2, UserCheck, ListOrdered } from 'lucide-react';
import { competitionsApi, ORDINAL, PHASE, fmtDateTime } from './api';
import { Rounds, Podium, Standings } from './parts';
import { GameHero, JoinCard, HowItWorks, CollegesCard, PayCard } from './GameInfo';
import { gameRules } from './gameRules';
import CertificateInline from './CertificateInline';
import { payOnline } from './razorpay';
import { DetailSkeleton } from './Skeletons';
import { SignUpBox, QuizBox, HackathonBox } from './ChallengeBox';
import PriceTag from '../components/rewards/PriceTag';
import useGoBack from '../hooks/useGoBack';

const Fact = ({ icon: Icon, label, children }) => (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100"><Icon size={17} aria-hidden="true" /></span>
        <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <div className="text-sm font-semibold text-slate-800">{children}</div>
        </div>
    </div>
);

export default function CompetitionDetail() {
    const goBack = useGoBack();
    const { id } = useParams();
    // `tick` counts the loads, so a quiz or hackathon box looks again with the page.
    const [state, setState] = useState({ data: null, error: '', tick: 0 });
    // Paid: look again at once.
    const [n, setN] = useState(0);
    const reload = () => setN((x) => x + 1);

    useEffect(() => {
        let alive = true;
        const load = () => competitionsApi.detail(id)
            .then((data) => { if (alive) setState((s) => ({ data, error: '', tick: s.tick + 1 })); })
            .catch((e) => { if (alive) setState((s) => ({ ...s, data: s.data, error: e.message })); });
        load();
        // Live matches change underneath the page, and Join turns on when the
        // organizer starts mine: look again every 5 seconds.
        const timer = setInterval(load, 5000);
        return () => { alive = false; clearInterval(timer); };
    }, [id, n]);

    const { data, error } = state;
    if (!data) {
        return error
            ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error} <Link to="/competitions?tab=competitions" className="font-bold underline">Back to competitions</Link></div>
            : <DetailSkeleton />;
    }
    const { competition: c, teams, rounds } = data;
    // A quiz or a hackathon: no rounds; perhaps entered by students on their own.
    const challenge = ['quiz', 'hackathon'].includes(c.kind);
    const solo = c.entry === 'individual';
    const myTeamId = c.myTeam?.status === 'approved' ? c.myTeam.id : null;
    // A college's own competition: for its students only, in teams it makes.
    const own = !!c.hostOrganizationId;
    // Over: this is its results page (see the top).
    const finished = c.status === 'completed';

    const rules = gameRules(c);
    const mm = data.myMatch;
    const phase = PHASE[c.phase] || { label: c.status };
    // What to do now, for a player in this competition.
    const join = !c.myTeam || solo ? null : c.myTeam.status !== 'approved'
        ? { title: `You play for ${c.myTeam.teamName}`, note: 'Waiting for the organizer to approve the team.' }
        : c.status === 'completed' ? null
            : challenge ? { ok: true, title: `You play for ${c.myTeam.teamName}`, note: c.kind === 'quiz' ? 'Take the quiz below while it is open.' : 'Read the problem below and hand in your team\'s project before it is due.' }
            : !mm ? { ok: true, title: `You play for ${c.myTeam.teamName}`, note: c.status === 'live' ? 'No match for your team right now. Your next match appears here once it is drawn.' : 'The matches are drawn once registration closes. Your match appears here then.' }
                : mm.rematchAt && !mm.started ? { ok: true, title: `${mm.roundName}: draw — rematch at ${new Date(mm.rematchAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`, showJoin: mm.playing, note: 'The game was drawn. The rematch opens 5 minutes after it — your joining code shows here then, and you enter it to join again.' }
                : { ok: true, title: `${mm.roundName}: your team's match`, started: mm.started, code: mm.code, joined: mm.joined, to: mm.gameId ? `/competitions/play/${mm.gameId}` : null, showJoin: mm.playing || !mm.started,
                    note: mm.started ? (mm.playing ? (mm.joined ? 'You are in. Back to the game.' : 'The organizer has started your match. Enter your joining code to take your seat.') : 'Your match is on now — a teammate is at the board.') : `Join opens when the organizer starts the match${mm.scheduledAt ? ` (planned for ${fmtDateTime(mm.scheduledAt)})` : ''}. Your joining code appears here then.` };

    return (
        <div className="space-y-5 pb-10 -mt-4 sidebar:-mt-8">
            <Link to={`/competitions?tab=competitions&game=${c.game}`} onClick={goBack} className="-my-2.5 inline-flex min-h-10 items-center gap-1.5 py-2.5 text-sm font-semibold text-slate-500 hover:text-indigo-700">
                <ArrowLeft size={16} aria-hidden="true" /> Back</Link>
            <div className="!mt-2 flex flex-wrap items-center gap-2" data-competition-badges>
                <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">{phase.label}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-200">{c.emoji} {c.gameLabel}</span>
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-200">{own ? 'Your college' : 'Inter-College'}</span>
            </div>

            {/* Its status, game and kind: beside Back, off the picture (asked 2026-10-28). */}
            <GameHero game={c.game} bannerUrl={c.bannerUrl} title={c.name} subtitle={`Organized by ${c.organizedBy}`} description={c.description}
                meta={[[CalendarClock, fmtDateTime(c.startsAt)], [Users, `${c.teamsCount} / ${c.maxTeams} ${solo ? 'students' : own ? 'teams' : 'colleges'}`], challenge ? [Clock, `${c.kind === 'quiz' ? 'Closes' : 'Projects due'} ${fmtDateTime(c.endsAt)}`] : [Swords, `${c.teamsPerMatch} teams a match`]]} />

            {/* The entry fee first: until it is paid, no code and no Join. */}
            {data.myPayment && !data.myPayment.paid && !finished ? <PayCard amount={data.myPayment.amount} pay={() => payOnline(() => competitionsApi.pay(c.id), (r) => competitionsApi.payVerify(c.id, r))} onPaid={reload} />
                : join && <JoinCard {...join} label="Join game" />}
            {solo && !finished && <SignUpBox competition={c} onChanged={(d) => setState((s) => ({ data: d, error: '', tick: s.tick + 1 }))} />}
            {c.myTeam && c.status === 'completed' && c.myTeam.status === 'approved' && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-violet-50 px-4 py-3 ring-1 ring-violet-100">
                    <UserCheck size={18} className="text-violet-600" aria-hidden="true" />
                    <p className="min-w-0 flex-1 basis-56 text-sm text-violet-900">{solo ? <>You took part.</> : <>You played for <strong>{c.myTeam.teamName}</strong> ({c.myTeam.collegeName}).</>}{c.myTeam.place ? <> {solo ? 'You' : 'Your team'} finished <strong>{ORDINAL[c.myTeam.place]}</strong>.</> : null}</p>
                </div>
            )}
            {/* Registering is the college coordinator's step, in the college's own panel. */}
            {!solo && !c.myTeam && ['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase) && (
                <div data-register-note className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <p className="font-bold">{own ? 'Your college is making the teams' : c.phase === 'registration-soon' ? `Registration opens ${fmtDateTime(c.registrationOpensAt)}` : 'Registration is open'}</p>
                    <p className="mt-0.5">{own ? 'This competition is for your college\'s students only. If you want to play, ask your college\'s coordinator to put you in a team.'
                        : 'Colleges register through their coordinator. If you want to play, ask your college\'s coordinator to register the college and add you to the team.'}</p>
                </div>
            )}

            {!finished && (<>
            <section className="grid gap-2.5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                <Fact icon={CalendarClock} label={c.kind === 'quiz' ? 'Quiz opens' : c.kind === 'hackathon' ? 'Starts' : 'Date & time'}>{fmtDateTime(c.startsAt)}</Fact>
                <Fact icon={Clock} label="Registration">{c.registrationOpensAt && c.phase === 'registration-soon' ? `Opens ${fmtDateTime(c.registrationOpensAt)}` : `Closes ${fmtDateTime(c.registrationDeadline)}`}</Fact>
                <Fact icon={Users} label={solo ? 'Who can enter' : 'Player / team requirements'}>{solo ? `Any student, on their own · up to ${c.maxTeams}` : `${c.maxTeams} ${own ? 'teams' : 'colleges'} · up to ${c.playersPerTeam} player${c.playersPerTeam === 1 ? '' : 's'} each${c.playersPerSide > 1 ? ` · ${c.playersPerSide} play a match` : ''}`}</Fact>
                {c.kind === 'quiz' ? <Fact icon={Clock} label="The quiz">{c.questionsCount} questions · {c.minutes} min · closes {fmtDateTime(c.endsAt)}</Fact>
                    : c.kind === 'hackathon' ? <Fact icon={Clock} label="Projects due">{fmtDateTime(c.endsAt)}</Fact>
                        : <Fact icon={Swords} label="Each match">{c.teamsPerMatch} teams · the winner goes through</Fact>}
            </section>

            {challenge && (c.kind === 'quiz' ? <QuizBox competition={c} tick={state.tick} /> : <HackathonBox competition={c} tick={state.tick} />)}

            <HowItWorks items={rules} extra={c.rules && <p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{c.rules}</p>} />
            </>)}

            {c.status === 'completed' && c.winners.length > 0 && (
                <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><Trophy size={20} className="text-amber-500" aria-hidden="true" /> Winners</h2>
                    <div className="mx-auto max-w-lg"><Podium winners={c.winners} /></div>
                </section>
            )}

            {/* My certificate, on the page, above the standings. */}
            {c.myTeam && c.status === 'completed' && c.myTeam.status === 'approved' && (c.myTeam.place ? c.certificates : c.participationCertificates) && (
                <CertificateInline load={() => competitionsApi.certificate(c.id)} fileName={`Certificate_${c.name.replace(/\s+/g, '_')}.pdf`} />
            )}
            {finished && !challenge && teams.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><ListOrdered size={19} className="text-indigo-600" aria-hidden="true" /> Final standings</h2>
                    <Standings teams={teams} rounds={rounds} winners={c.winners} myTeamId={c.myTeam?.id} showCollege={!own} />
                </section>
            )}

            {/* Once it is over the page is just the results. */}
            {!finished && !challenge && (<>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><Swords size={19} className="text-indigo-600" aria-hidden="true" /> Tournament rounds</h2>
                <Rounds rounds={rounds} myTeamId={myTeamId} />
            </section>

            </>)}

            {!finished && (
                <CollegesCard title={solo ? 'Students taking part' : own ? 'Teams' : 'Participating colleges'}
                    empty={solo ? 'Nobody has signed up yet.' : own ? 'Your college is making the teams.' : c.status === 'registration' ? 'Colleges are registering now.' : 'No colleges yet.'}
                    rows={teams.map((t) => ({ key: t.id, title: <>{t.teamName} {t.place && <span className="text-amber-600">· {ORDINAL[t.place]}</span>}</>, sub: own ? '' : `${t.collegeName}${t.coordinator?.name ? ` · coordinator ${t.coordinator.name}` : ''}`, names: t.solo ? '' : t.players.map((p) => p.name).join(', '), mine: t.id === c.myTeam?.id }))} />
            )}
        </div>
    );
}
