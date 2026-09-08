/**
 * Step 4 — location, skills, availability and preferred job types. Skills
 * come from the board's own vocabulary (SkillInput, /roles/skills); the
 * location can be typed or detected the way the board detects it. The saved
 * profile is what the Jobs search form opens with.
 */
import { useEffect, useState } from 'react';
import { MapPin, LocateFixed, Wrench, CalendarClock, Briefcase, Loader2, Sparkles } from 'lucide-react';
import { verificationApi } from './api';
import { jobsApi, detectLocation } from '../api';
import SkillInput from '../SkillInput';
import { FIELD_LABEL, FIELD_INPUT, FIELD_OK, FIELD_BAD } from '../ui';
import { Card, Heading, PrimaryButton, ErrorNotice } from './ui';
const EXAMPLES = ['JavaScript', 'Python', 'Communication', 'Teaching', 'Customer Service', 'Cooking', 'Retail', 'Graphic Design'];
const Chip = ({ on, onClick, children }) => (<button type="button" aria-pressed={on} onClick={onClick} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`}>{children}</button>);
export default function ProfileStep({ view, onView }) {
    const p = view.steps.profile; const need = view.requirements || {}; const opts = view.options || { availability: [], jobTypes: [] };
    const [location, setLocation] = useState(p.location?.label || ''); const [coords, setCoords] = useState(p.location?.coords || null);
    const [skills, setSkills] = useState(p.skills || []); const [availability, setAvailability] = useState(p.availability || []); const [jobTypes, setJobTypes] = useState(p.jobTypes || []);
    const [skillOptions, setSkillOptions] = useState([]); const [popular, setPopular] = useState([]);
    const [detecting, setDetecting] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(null); const [problems, setProblems] = useState({});
    useEffect(() => { jobsApi.skills().then((r) => { setSkillOptions(r.all || []); setPopular(r.popular || []); }).catch(() => {}); }, []);
    const toggle = (list, set, id) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
    const detect = async () => { setDetecting(true); setProblems((q) => ({ ...q, location: '' })); try { const d = await detectLocation(); setLocation(d.label); setCoords(d.coords); } catch (e) { setProblems((q) => ({ ...q, location: e.message })); } finally { setDetecting(false); } };
    const check = () => { const q = {}; if (need.requireLocation && location.trim().length < 2) q.location = 'Enter the city or area where you want to work.'; if (need.requireSkills && !skills.length) q.skills = 'Add at least one skill.'; setProblems(q); return !Object.keys(q).length; };
    const save = async (e) => { e.preventDefault(); if (!check()) return; setBusy(true); setError(null); try { onView(await verificationApi.profileSave({ location: location.trim(), coords, skills, availability, jobTypes })); } catch (err) { if (err.problems) setProblems(err.problems); else setError(err); } finally { setBusy(false); } };
    return (
        <Card className="animate-fade-in-up">
            <Heading icon={MapPin} title="Complete Your Job Profile">Where you want to work and what you can do. Your job matches start from this.</Heading>
            <form onSubmit={save} noValidate className="space-y-6">
                <div>
                    <label htmlFor="jv-location" className={FIELD_LABEL}>Location{need.requireLocation ? '' : ' (optional)'}</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1"><MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input id="jv-location" type="text" autoComplete="address-level2" placeholder="Search city / location" value={location} onChange={(e) => { setLocation(e.target.value); setCoords(null); setProblems((q) => ({ ...q, location: '' })); }} aria-invalid={!!problems.location} className={`${FIELD_INPUT} pl-10 ${problems.location ? FIELD_BAD : FIELD_OK}`} /></div>
                        <button type="button" onClick={detect} disabled={detecting} title="Use my current location" aria-label="Use my current location" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-white text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-60">{detecting ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}</button>
                    </div>
                    <p className="mt-1.5 min-h-4 text-xs" aria-live="polite">{problems.location ? <span className="font-semibold text-rose-600">{problems.location}</span> : coords ? <span className="text-emerald-700">Location pinned.</span> : <span className="text-slate-400">The city, town or area you want to work in.</span>}</p>
                </div>
                <div>
                    <p className={`${FIELD_LABEL} flex items-center gap-1.5`}><Wrench size={13} /> Skills{need.requireSkills ? '' : ' (optional)'}</p>
                    <SkillInput value={skills} options={skillOptions} popular={popular} onChange={(v) => { setSkills(v); setProblems((q) => ({ ...q, skills: '' })); }} error={problems.skills} />
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><Sparkles size={11} className="text-indigo-500" /> Examples:</span>{EXAMPLES.filter((x) => !skills.includes(x)).slice(0, 6).map((x) => <button key={x} type="button" onClick={() => setSkills([...skills, x])} className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700">{x}</button>)}</div>
                </div>
                <div>
                    <p className={`${FIELD_LABEL} flex items-center gap-1.5`}><CalendarClock size={13} /> Availability</p>
                    <div className="flex flex-wrap gap-2">{opts.availability.map((o) => <Chip key={o.id} on={availability.includes(o.id)} onClick={() => toggle(availability, setAvailability, o.id)}>{o.label}</Chip>)}</div>
                </div>
                <div>
                    <p className={`${FIELD_LABEL} flex items-center gap-1.5`}><Briefcase size={13} /> Preferred Job Type</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{opts.jobTypes.map((o) => { const on = jobTypes.includes(o.id); return (<label key={o.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${on ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'}`}><input type="checkbox" checked={on} onChange={() => toggle(jobTypes, setJobTypes, o.id)} className="h-4 w-4 rounded border-slate-300 accent-indigo-600" />{o.label}</label>); })}</div>
                </div>
                <ErrorNotice error={error} />
                <PrimaryButton type="submit" loading={busy} loadingText="Saving…" icon={Briefcase}>Save &amp; Explore Jobs</PrimaryButton>
            </form>
        </Card>
    );
}
