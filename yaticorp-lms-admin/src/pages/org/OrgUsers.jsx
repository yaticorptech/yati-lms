/**
 * Users: the people who sign in to this organization's dashboard with every
 * right it has — add one (name, email, a first password), rename them or set
 * a new password, take one away. The owner (the account the organization
 * registered with) cannot be removed, and only the owner edits it. Teachers
 * with a limited sign-in are under Teachers. What each user did is in the
 * Audit log. Server: src/organizations/users.js.
 */
import React, { useState } from 'react';
import { UserCog, Plus, Pencil, Trash2, Loader2, Crown } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, LABEL, INPUT, BTN, BTN2, Banner, Rows, Empty, PageHeader, Avatar, LoadFailed, Dialog, DialogTitle } from '../../components/orgUi';
import PasswordStrengthChecker from '../../components/PasswordStrengthChecker';
import { formatDate, relativeDay } from '../../utils/dates';

const errorOf = (err, fallback) => err.response?.data?.message || fallback;

/** Add a user, or edit `user` (name, and a new password if one is typed). */
const UserDialog = ({ user, onClose, onDone }) => {
    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', password: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(''); };
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try {
            const res = user
                ? await api.put(`/organizations/me/users/${user._id}`, { name: form.name, ...(form.password ? { password: form.password } : {}) })
                : await api.post('/organizations/me/users', form);
            onDone(res.data.message);
        } catch (err) { setError(errorOf(err, 'Could not save.')); setBusy(false); }
    };
    return (
        <Dialog onClose={() => { if (!busy) onClose(); }}>
            <form onSubmit={submit} className="flex min-h-0 flex-col">
                <div className="border-b border-slate-100 p-5"><DialogTitle>{user ? `Edit ${user.name}` : 'Add a user'}</DialogTitle></div>
                <div className="space-y-3 p-5">
                    <label className="block"><span className={LABEL}>Name</span><input className={INPUT} value={form.name} onChange={set('name')} required /></label>
                    <label className="block"><span className={LABEL}>Email</span><input type="email" className={INPUT} value={form.email} onChange={set('email')} disabled={!!user} required={!user} placeholder="name@college.edu" /></label>
                    <label className="block">
                        <span className={LABEL}>{user ? 'New password (leave blank to keep)' : 'First password'}</span>
                        <input type="text" className={INPUT} value={form.password} onChange={set('password')} autoComplete="new-password" required={!user} />
                        <PasswordStrengthChecker password={form.password} focused={!!form.password} />
                    </label>
                    {!user && <p className="text-xs text-slate-500">They sign in on the organization sign-in page with this email and password, and can do everything you can. Share the password with them yourself.</p>}
                    {error && <Banner>{error}</Banner>}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                    <button type="button" onClick={onClose} disabled={busy} className={BTN2}>Cancel</button>
                    <button type="submit" disabled={busy} className={BTN}>{busy && <Loader2 size={16} className="animate-spin" />}{user ? 'Save' : 'Add user'}</button>
                </div>
            </form>
        </Dialog>
    );
};

const OrgUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState(null);     // { kind, text }
    const [editing, setEditing] = useState(null);   // 'new', or a user

    const load = async ({ signal, isCurrent = () => true, fresh = true } = {}) => {
        if (fresh) setLoading(true);
        try {
            const res = await api.get('/organizations/me/users', { signal });
            if (!isCurrent()) return;
            setUsers(res.data.users || []); setFailed(false);
        } catch { if (isCurrent() && fresh) setFailed(true); }
        finally { if (isCurrent()) setLoading(false); }
    };
    const reload = useAutoRefresh(load, 60000, []);
    const done = (text) => { setEditing(null); setNotice({ kind: 'ok', text }); reload(); };
    const remove = async (u) => {
        if (!window.confirm(`Remove ${u.name}? They can no longer sign in to this dashboard. What they did stays in the audit log.`)) return;
        try { done((await api.delete(`/organizations/me/users/${u._id}`)).data.message); }
        catch (err) { setNotice({ kind: 'error', text: errorOf(err, 'Could not remove.') }); }
    };
    const me = users.find((u) => u.you);

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={UserCog} title="Users" subtitle="People who sign in to this dashboard with full access. Teachers with a limited sign-in are under Teachers.">
                <button onClick={() => setEditing('new')} className={`${BTN} shrink-0`}><Plus size={16} /> Add user</button>
            </PageHeader>
            {notice && <Banner kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Banner>}
            <div className={`${CARD} overflow-hidden`}>
                {loading ? <Rows count={3} height="h-14" /> : failed ? <LoadFailed what="your users" onRetry={reload} /> : users.length === 0 ? (
                    <Empty icon={UserCog}>No users yet.</Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {users.map((u) => {
                            const canEdit = !u.owner || me?.owner;
                            return (
                                <li key={u._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                    <div className="flex min-w-0 items-center gap-3.5">
                                        <Avatar name={u.name} />
                                        <div className="min-w-0">
                                            <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-800">
                                                {u.name}
                                                {u.owner && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Crown size={11} /> Owner</span>}
                                                {u.you && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">You</span>}
                                            </p>
                                            <p className="break-all text-xs text-slate-500">{u.email}</p>
                                            <p className="text-[11px] text-slate-400">Added {formatDate(u.createdAt)} · last sign-in {u.lastSignIn ? relativeDay(u.lastSignIn).toLowerCase() : 'not recorded yet'}</p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        {canEdit && <button onClick={() => setEditing(u)} className={BTN2}><Pencil size={15} /> Edit</button>}
                                        {!u.owner && !u.you && (
                                            <button onClick={() => remove(u)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 size={15} /> Remove</button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            {editing && <UserDialog user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={done} />}
        </div>
    );
};

export default OrgUsers;
