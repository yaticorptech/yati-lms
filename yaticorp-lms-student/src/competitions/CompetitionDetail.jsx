/**
 * One inter-college competition: its details (who organizes it, the game, the
 * dates, the colleges taking part, the team limits, the rules, the prizes and
 * certificates), the knockout round by round, and the winners once decided.
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
import CertificateView from './CertificateView';
import { payOnline } from './razorpay';
import { DetailSkeleton } from './Skeletons';
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
    const [state, setState] = useState({ data: null, error: '' });
    // Paid: look again at once.
    const [n, setN] = useState(0);
    const reload = () => setN((x) => x + 1);

    useEffect(() => {
        let alive = true;
        const load = () => competitionsApi.detail(id)
            .then((data) => { if (alive) setState({ data, error: '' }); })
            .catch((e) => { if (alive) setState((s) => ({ data: s.data, error: e.message })); });
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
    const myTeamId = c.myTeam?.status === 'approved' ? c.myTeam.id : null;
    // A college's own competition: for its students only, in teams it makes.
    const own = !!c.hostOrganizationId;
    // Over: this is its results page (see the top).
    const finished = c.status === 'completed';

    const rules = gameRules(c);
    const mm = data.myMatch;
    const phase = PHASE[c.phase] || { label: c.status };
    // What to do now, for a player in this competition.
    const join = !c.myTeam ? null : c.myTeam.status !== 'approved'
        ? { title: `You play for ${c.myTeam.teamName}`, note: 'Waiting for the organizer to approve the team.' }
        : c.status === 'completed' ? null
            : !mm ? { ok: true, title: `You play for ${c.myTeam.teamName}`, note: c.status === 'live' ? 'No match for your team right now. Your next match appears here once it is drawn.' : 'The matches are drawn once registration closes. Your match appears here then.' }
                : mm.rematchAt && !mm.started ? { ok: true, title: `${mm.roundName}: draw — rematch at ${new Date(mm.rematchAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`, showJoin: mm.playing, note: 'The game was drawn. The rematch opens 5 minutes after it — your joining code shows here then, and you enter it to join again.' }
                : { ok: true, title: `${mm.roundName}: your team's match`, started: mm.started, code: mm.code, joined: mm.joined, to: mm.gameId ? `/competitions/play/${mm.gameId}` : null, showJoin: mm.playing || !mm.started,
                    note: mm.started ? (mm.playing ? (mm.joined ? 'You are in. Back to the game.' : 'The organizer has started your match. Enter your joining code to take your seat.') : 'Your match is on now — a teammate is at the board.') : `Join opens when the organizer starts the match${mm.scheduledAt ? ` (planned for ${fmtDateTime(mm.scheduledAt)})` : ''}. Your joining code appears here then.` };

    return (
        <div className="space-y-5 pb-10 -mt-4 sidebar:-mt-8">
            <Link to={`/competitions?tab=competitions&game=${c.game}`} onClick={goBack} className="-my-2.5 inline-flex min-h-10 items-center gap-1.5 py-2.5 text-sm font-semibold text-slate-500 hover:text-indigo-700">
                <ArrowLeft size={16} aria-hidden="true" /> Back</Link>

            <GameHero game={c.game} bannerUrl={c.bannerUrl} title={c.name} subtitle={`Organized by ${c.organizedBy}`} description={c.description}
                chips={<>
                    <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800">{phase.label}</span>
                    <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold ring-1 ring-white/30">{c.emoji} {c.gameLabel}</span>
                    <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold ring-1 ring-white/30">{own ? 'Your college' : 'Inter-College'}</span>
                </>}
                meta={[[CalendarClock, fmtDateTime(c.startsAt)], [Users, `${c.teamsCount} / ${c.maxTeams} ${own ? 'teams' : 'colleges'}`], [Swords, `${c.teamsPerMatch} teams a match`]]} />

            {/* The entry fee first: until it is paid, no code and no Join. */}
            {data.myPayment && !data.myPayment.paid && !finished ? <PayCard amount={data.myPayment.amount} pay={() => payOnline(() => competitionsApi.pay(c.id), (r) => competitionsApi.payVerify(c.id, r))} onPaid={reload} />
                : join && <JoinCard {...join} label="Join game" />}
            {c.myTeam && c.status === 'completed' && c.myTeam.status === 'approved' && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-violet-50 px-4 py-3 ring-1 ring-violet-100">
                    <UserCheck size={18} className="text-violet-600" aria-hidden="true" />
                    <p className="min-w-0 flex-1 basis-56 text-sm text-violet-900">You played for <strong>{c.myTeam.teamName}</strong> ({c.myTeam.collegeName}).{c.myTeam.place ? <> Your team finished <strong>{ORDINAL[c.myTeam.place]}</strong>.</> : null}</p>
                    {(c.myTeam.place ? c.certificates : c.participationCertificates) && <CertificateView icons load={() => competitionsApi.certificate(c.id)} fileName={`Certificate_${c.name.replace(/\s+/g, '_')}.pdf`} />}
                </div>
            )}
            {/* Registering is the college coordinator's step, in the college's own panel. */}
            {!c.myTeam && ['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase) && (
                <div data-register-note className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <p className="font-bold">{own ? 'Your college is making the teams' : c.phase === 'registration-soon' ? `Registration opens ${fmtDateTime(c.registrationOpensAt)}` : 'Registration is open'}</p>
                    <p className="mt-0.5">{own ? 'This competition is for your college\'s students only. If you want to play, ask your college\'s coordinator to put you in a team.'
                        : 'Colleges register through their coordinator. If you want to play, ask your college\'s coordinator to register the college and add you to the team.'}</p>
                </div>
            )}

            {!finished && (<>
            <section className="grid gap-2.5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                <Fact icon={CalendarClock} label="Date & time">{fmtDateTime(c.startsAt)}</Fact>
                <Fact icon={Clock} label="Registration">{c.registrationOpensAt && c.phase === 'registration-soon' ? `Opens ${fmtDateTime(c.registrationOpensAt)}` : `Closes ${fmtDateTime(c.registrationDeadline)}`}</Fact>
                <Fact icon={Users} label="Player / team requirements">{c.maxTeams} {own ? 'teams' : 'colleges'} · up to {c.playersPerTeam} player{c.playersPerTeam === 1 ? '' : 's'} each{c.playersPerSide > 1 ? ` · ${c.playersPerSide} play a match` : ''}</Fact>
                <Fact icon={Swords} label="Each match">{c.teamsPerMatch} teams · the winner goes through</Fact>
            </section>

            <HowItWorks items={rules} extra={c.rules && <p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{c.rules}</p>} />
            </>)}

            {c.status === 'completed' && c.winners.length > 0 && (
                <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><Trophy size={20} className="text-amber-500" aria-hidden="true" /> Winners</h2>
                    <div className="mx-auto max-w-lg"><Podium winners={c.winners} /></div>
                </section>
            )}

            {finished && teams.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><ListOrdered size={19} className="text-indigo-600" aria-hidden="true" /> Final standings</h2>
                    <Standings teams={teams} rounds={rounds} winners={c.winners} myTeamId={c.myTeam?.id} showCollege={!own} />
                </section>
            )}

            {/* Once it is over the page is just the results. */}
            {!finished && (<>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><Swords size={19} className="text-indigo-600" aria-hidden="true" /> Tournament rounds</h2>
                <Rounds rounds={rounds} myTeamId={myTeamId} />
            </section>

            </>)}

            {!finished && (
                <CollegesCard title={own ? 'Teams' : 'Participating colleges'}
                    empty={own ? 'Your college is making the teams.' : c.status === 'registration' ? 'Colleges are registering now.' : 'No colleges yet.'}
                    rows={teams.map((t) => ({ key: t.id, title: <>{t.teamName} {t.place && <span className="text-amber-600">· {ORDINAL[t.place]}</span>}</>, sub: own ? '' : `${t.collegeName}${t.coordinator?.name ? ` · coordinator ${t.coordinator.name}` : ''}`, names: t.players.map((p) => p.name).join(', '), mine: t.id === c.myTeam?.id }))} />
            )}
        </div>
    );
}
