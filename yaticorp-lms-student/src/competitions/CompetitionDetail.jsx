/**
 * One inter-college competition: its details (who organizes it, the game, the
 * dates, the colleges taking part, the team limits, the rules, the prizes and
 * certificates), the knockout round by round, and the winners once decided.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, CalendarClock, Building2, Users, ScrollText, Trophy, Award, Clock, Swords, Gift, Download, Loader2, UserCheck
} from 'lucide-react';
import { competitionsApi, ORDINAL, fmtDateTime } from './api';
import { StatusChip, GameChip, Rounds, Podium } from './parts';
import { saveBlob } from '../native/saveFile';

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
    const { id } = useParams();
    const [state, setState] = useState({ data: null, error: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        const load = () => competitionsApi.detail(id)
            .then((data) => { if (alive) setState({ data, error: '' }); })
            .catch((e) => { if (alive) setState((s) => ({ data: s.data, error: e.message })); });
        load();
        // Live matches change underneath the page: look again every 15 seconds.
        const timer = setInterval(load, 15000);
        return () => { alive = false; clearInterval(timer); };
    }, [id]);

    const { data, error } = state;
    if (!data) {
        return error
            ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error} <Link to="/competitions?tab=competitions" className="font-bold underline">Back to competitions</Link></div>
            : <div className="space-y-4"><div className="skeleton h-40 rounded-3xl" /><div className="skeleton h-64 rounded-3xl" /></div>;
    }
    const { competition: c, teams, rounds } = data;
    const myTeamId = c.myTeam?.status === 'approved' ? c.myTeam.id : null;
    const download = () => {
        setSaving(true);
        competitionsApi.certificate(c.id).then((blob) => saveBlob(blob, `Certificate_${c.name.replace(/\s+/g, '_')}.pdf`, { title: 'Certificate' }))
            .catch(() => {}).finally(() => setSaving(false));
    };

    return (
        <div className="space-y-5 pb-10">
            <Link to="/competitions?tab=competitions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700">
                <ArrowLeft size={16} aria-hidden="true" /> Competitions
            </Link>

            <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {c.bannerUrl && <img src={c.bannerUrl} alt="" className="h-36 w-full object-cover sm:h-48" />}
                <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-3xl" aria-hidden="true">{c.emoji}</span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5"><StatusChip status={c.status} phase={c.phase} /><GameChip emoji={c.emoji} label={c.gameLabel} /><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">Inter-College</span></div>
                        <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">{c.name}</h1>
                        <p className="text-sm text-slate-500">Organized by {c.organizedBy}</p>
                        {c.description && <p className="mt-2 max-w-3xl text-sm text-slate-600">{c.description}</p>}
                    </div>
                </div>

                {c.myTeam && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-violet-50 px-4 py-3 ring-1 ring-violet-100">
                        <UserCheck size={18} className="text-violet-600" aria-hidden="true" />
                        <p className="min-w-0 flex-1 text-sm text-violet-900">
                            You play for <strong>{c.myTeam.teamName}</strong> ({c.myTeam.collegeName}){c.myTeam.status !== 'approved' ? ' — waiting for the organizer to approve the team.' : '.'}
                            {c.myTeam.place ? <> Your team finished <strong>{ORDINAL[c.myTeam.place]}</strong>.</> : null}
                        </p>
                        {c.status === 'completed' && c.myTeam.status === 'approved' && (c.myTeam.place ? c.certificates : c.participationCertificates) && (
                            <button type="button" onClick={download} disabled={saving}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                                {saving ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Download size={13} aria-hidden="true" />} My certificate
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    <Fact icon={CalendarClock} label="Date & time">{fmtDateTime(c.startsAt)}</Fact>
                    <Fact icon={Clock} label="Registration">{c.registrationOpensAt && c.phase === 'registration-soon' ? `Opens ${fmtDateTime(c.registrationOpensAt)}` : `Closes ${fmtDateTime(c.registrationDeadline)}`}</Fact>
                    <Fact icon={Users} label="Player / team requirements">{c.maxTeams} colleges · up to {c.playersPerTeam} player{c.playersPerTeam === 1 ? '' : 's'} each{c.playersPerSide > 1 ? ` · ${c.playersPerSide} play a match` : ''}</Fact>
                    <Fact icon={Swords} label="Each match">{c.teamsPerMatch} teams · the winner goes through</Fact>
                </div>

                {/* Registering is the college coordinator's step, in the college's own panel. */}
                {!c.myTeam && ['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase) && (
                    <div data-register-note className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        <p className="font-bold">{c.phase === 'registration-soon' ? `Registration opens ${fmtDateTime(c.registrationOpensAt)}` : 'Registration is open'}</p>
                        <p className="mt-0.5">Colleges register through their coordinator. If you want to play, ask your college's coordinator to register the college and add you to the team.</p>
                    </div>
                )}
                </div>
            </header>

            {c.status === 'completed' && c.winners.length > 0 && (
                <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><Trophy size={20} className="text-amber-500" aria-hidden="true" /> Winners</h2>
                    <div className="mx-auto max-w-lg"><Podium winners={c.winners} /></div>
                </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><Swords size={19} className="text-indigo-600" aria-hidden="true" /> Tournament rounds</h2>
                <Rounds rounds={rounds} myTeamId={myTeamId} />
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><Gift size={19} className="text-indigo-600" aria-hidden="true" /> Prizes &amp; rewards</h2>
                    {c.prizeDetails && <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">🏆 {c.prizeDetails}</p>}
                    {c.prizes.length === 0 && !c.participationXp ? (!c.prizeDetails && <p className="text-sm text-slate-500">No prizes announced.</p>) : (
                        <ul className="space-y-2">
                            {c.prizes.map((p) => (
                                <li key={p.place} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${p.place === 1 ? 'bg-amber-100 text-amber-700' : p.place === 2 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>{ORDINAL[p.place]}</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900">{p.title || `${ORDINAL[p.place]} place`}</p>
                                        <p className="text-xs text-slate-600">{[p.xp && `${p.xp} XP`, p.rewardPoints && `${p.rewardPoints} reward points`].filter(Boolean).join(' + ') || 'Recognition'} for each player{p.description ? ` · ${p.description}` : ''}</p>
                                    </div>
                                </li>
                            ))}
                            {c.participationXp > 0 && <li className="text-xs text-slate-600">Every player of every team: {c.participationXp} XP for taking part.</li>}
                        </ul>
                    )}
                    <p className="mt-3 flex items-center gap-2 text-xs text-slate-600"><Award size={14} className="text-indigo-500" aria-hidden="true" />
                        {c.certificates && c.participationCertificates ? 'Certificates for every player: Winner, Runner-up and Third Place certificates, and a participation certificate for everyone else.'
                            : c.certificates ? 'Certificates for the winner, runner-up and third place.'
                                : c.participationCertificates ? 'A participation certificate for every player.' : 'This competition does not give certificates.'}
                    </p>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><ScrollText size={19} className="text-indigo-600" aria-hidden="true" /> Competition rules</h2>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{c.rules || 'The usual rules of the game apply. The organizer\'s decision on any dispute is final.'}</p>
                </section>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><Building2 size={19} className="text-indigo-600" aria-hidden="true" /> Participating colleges <span className="text-sm font-semibold text-slate-400">({teams.length})</span></h2>
                {teams.length === 0 ? <p className="text-sm text-slate-500">{c.status === 'registration' ? 'Colleges are registering now.' : 'No colleges yet.'}</p> : (
                    <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {teams.map((t) => (
                            <li key={t.id} className={`rounded-2xl border p-3 ${t.id === c.myTeam?.id ? 'border-violet-200 bg-violet-50/50' : 'border-slate-200'}`}>
                                <p className="truncate text-sm font-bold text-slate-900">{t.teamName} {t.place && <span className="text-amber-600">· {ORDINAL[t.place]}</span>}</p>
                                <p className="truncate text-xs text-slate-500">{t.collegeName}{t.coordinator?.name ? ` · coordinator ${t.coordinator.name}` : ''}</p>
                                <p className="mt-1 truncate text-xs text-slate-600">{t.players.map((p) => p.name).join(', ')}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
