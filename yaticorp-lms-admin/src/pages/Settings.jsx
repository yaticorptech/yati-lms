/**
 * @author Preethesh Kulal
 * @description Admin settings: 2FA setup, admin account management with back button
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Plus, Trash2, Smartphone, Bell, ChevronRight, ArrowLeft, CheckCircle2, Eye, EyeOff, Compass, Lock, Unlock, Briefcase } from 'lucide-react';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';

/**
 * One feature switch, stated in plain words.
 *
 * The button says what it will DO rather than what the state is — "Lock" /
 * "Unlock" — because a switch labelled with its current state is read both ways
 * by different people, and this one takes a section away from every student.
 */
const FeatureRow = ({ icon: Icon, title, description, enabled, saving, onToggle }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
            <span className={`p-2 rounded-lg shrink-0 ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <Icon size={18} />
            </span>
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {enabled ? 'Unlocked' : 'Locked'}
                    </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5 max-w-xl">{description}</p>
                <p className="text-xs text-slate-400 mt-1">
                    {enabled
                        ? 'Visible to every student.'
                        : 'Hidden from every student. Their saved roadmaps and progress are kept and come back on unlock.'}
                </p>
            </div>
        </div>

        <button
            onClick={() => onToggle(!enabled)}
            disabled={saving}
            className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                enabled
                    ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
        >
            {enabled ? <Lock size={16} /> : <Unlock size={16} />}
            {saving ? 'Saving…' : enabled ? 'Lock' : 'Unlock'}
        </button>
    </div>
);

const Settings = () => {
    const { admin } = useAuth();
    const navigate = useNavigate();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // New Admin Form
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'admin' });
    const [newAdminPwFocused, setNewAdminPwFocused] = useState(false);

    // Edit Admin Form
    const [showEditAdminModal, setShowEditAdminModal] = useState(false);
    const [editAdminForm, setEditAdminForm] = useState({ _id: '', name: '', email: '', password: '', role: 'admin' });

    // Platform feature switches. Loaded from /admin/settings, which creates the
    // document on first read, so there is always something to show.
    const [features, setFeatures] = useState(null);
    const [savingFeature, setSavingFeature] = useState(null);

    // 2FA Setup State
    const [qrCode, setQrCode] = useState(null);
    const [tokenInput, setTokenInput] = useState('');
    const [setupStep, setSetupStep] = useState(0); // 0 = default, 1 = scan qr, 2 = success

    const isSuperAdmin = admin?.role === 'superadmin';

    const fetchData = async () => {
        try {
            if (isSuperAdmin) {
                const res = await api.get('/admin/admins');
                setAdmins(res.data);
            }
            const settingsRes = await api.get('/admin/settings');
            setFeatures(settingsRes.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Flip one feature switch.
     *
     * The server's reply replaces local state rather than the optimistic value
     * being kept — if the save is refused, the toggle snaps back to what is
     * actually stored instead of showing a lock that was never applied.
     */
    const toggleFeature = async (key, value) => {
        setSavingFeature(key);
        try {
            const res = await api.put('/admin/settings', { [key]: value });
            setFeatures(res.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update settings');
        } finally {
            setSavingFeature(null);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuperAdmin]);

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/admins', newAdmin);
            setShowAdminModal(false);
            setNewAdmin({ name: '', email: '', password: '', role: 'admin' });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create admin'); // Changed message to be more specific
        }
    };

    const openEditModal = (adminData) => {
        setEditAdminForm({
            _id: adminData._id,
            name: adminData.name || '',
            email: adminData.email || '',
            role: 'admin',
            password: '' // Optional password update
        });
        setShowEditAdminModal(true);
    };

    const handleEditAdmin = async (e) => {
        e.preventDefault();
        try {
            const dataToSubmit = { ...editAdminForm };
            if (!dataToSubmit.password) {
                delete dataToSubmit.password;
            }
            await api.put(`/admin/admins/${editAdminForm._id}`, dataToSubmit);
            setShowEditAdminModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update admin');
        }
    };

    const deleteAdmin = async (id) => {
        if (!window.confirm('Delete this admin account?')) return;
        try {
            await api.delete(`/admin/admins/${id}`);
            fetchData();
        } catch (error) { // Changed err to error
            console.error(error); // Used error
        }
    };

    const init2FASetup = async () => {
        try {
            const res = await api.post('/auth/admin/setup-2fa');
            setQrCode(res.data.qrCode);
            // setSecret(res.data.secret); // Removed as per instruction
            setSetupStep(1);
        } catch {
            alert('Failed to update settings');
        }
    };

    const enable2FA = async () => {
        try {
            await api.post('/auth/admin/enable-2fa', { token: tokenInput });
            setSetupStep(2);
            // In a real app we'd update AuthContext admin state to reflect 2FA is enabled
        } catch (err) {
            alert(err.response?.data?.message || 'Invalid Token');
        }
    };

    return (
        <div className="space-y-6 lg:space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Go back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
                        <p className="text-sm lg:text-base text-slate-500 mt-1">Configure security and manage administrator access.</p>
                    </div>
                </div>
            </div>

            {/* Feature Access ----------------------------------------------
                Full width above the rest: this is the only control on the page
                that changes what students see, so it should not be mistaken for
                one of the admin-account settings beside it. */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-slate-50">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Compass size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Student Features</h2>
                        <p className="text-sm text-slate-500">Lock a section to withdraw it from every student at once.</p>
                    </div>
                </div>

                <div className="p-6">
                    {features === null ? (
                        <div className="text-slate-500 text-sm">Loading settings…</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            <div className="pb-6">
                                <FeatureRow
                                    icon={Compass}
                                    title="Career Path"
                                    description="The AI roadmap section: goals, planner, skills, badges and the mentor chat."
                                    enabled={features.isCareerPathEnabled !== false}
                                    saving={savingFeature === 'isCareerPathEnabled'}
                                    onToggle={(next) => toggleFeature('isCareerPathEnabled', next)}
                                />
                            </div>
                            <div className="pt-6">
                                <FeatureRow
                                    icon={Briefcase}
                                    title="Jobs"
                                    description="The job board: search and recommendations, skill-gap analysis and location matching."
                                    enabled={features.isJobsEnabled !== false}
                                    saving={savingFeature === 'isJobsEnabled'}
                                    onToggle={(next) => toggleFeature('isJobsEnabled', next)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Security & 2FA Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-slate-50">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Key size={20} /></div>
                        <h2 className="text-lg font-bold text-slate-800">Two-Factor Authentication (2FA)</h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-4">
                        {setupStep === 0 && (
                            <>
                                <Smartphone size={48} className="text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-600 mb-4 max-w-sm">Secure your admin account using an authenticator app (Google Authenticator, Authy, etc).</p>
                                <button
                                    onClick={init2FASetup}
                                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors w-full sm:w-auto"
                                >
                                    Setup 2FA Now
                                </button>
                            </>
                        )}

                        {setupStep === 1 && (
                            <div className="w-full space-y-4 animate-fade-in">
                                <p className="font-medium text-slate-800">Scan this QR code with your app</p>
                                <div className="bg-white p-4 border border-slate-200 inline-block rounded-xl shadow-sm mx-auto">
                                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                </div>
                                <div className="pt-4 max-w-xs mx-auto">
                                    <input
                                        type="text"
                                        placeholder="Enter 6-digit code"
                                        value={tokenInput}
                                        onChange={e => setTokenInput(e.target.value)}
                                        maxLength="6"
                                        className="w-full px-4 py-3 text-center tracking-[0.5em] text-xl font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        onClick={enable2FA}
                                        disabled={tokenInput.length < 6}
                                        className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                                    >
                                        Verify & Enable
                                    </button>
                                </div>
                            </div>
                        )}

                        {setupStep === 2 && (
                            <div className="text-emerald-500 flex flex-col items-center space-y-3 animate-fade-in">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-xl text-slate-800">2FA Enabled!</h3>
                                <p className="text-slate-500 text-sm">Your account is now protected.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Superadmin Management */}
                {isSuperAdmin ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Shield size={20} /></div>
                                <h2 className="text-lg font-bold text-slate-800">Admin Accounts</h2>
                            </div>
                            <button
                                onClick={() => setShowAdminModal(true)}
                                className="text-sm font-medium bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors flex items-center shadow-sm"
                            >
                                <Plus size={16} className="mr-1" /> Add
                            </button>
                        </div>
                        <div className="p-0 flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-6 text-center text-slate-500">Loading admins...</div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {admins.map(a => (
                                        <li key={a._id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                            <div>
                                                <div className="font-bold text-slate-800 flex items-center">
                                                    {a.name}
                                                    {a.role === 'superadmin' && <span className="ml-2 text-[10px] uppercase font-black tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded shadow-sm">Super</span>}
                                                </div>
                                                <div className="text-sm text-slate-500">{a.email}</div>
                                            </div>
                                            {a._id !== admin.adminId && a.role !== 'superadmin' && ( // Cannot delete self or another superadmin usually, but based on your backend rules
                                                <div className="flex items-center space-x-2">
                                                    <button onClick={() => openEditModal(a)} className="text-slate-400 hover:text-indigo-600 p-2 rounded transition-colors text-sm font-medium">
                                                        Edit
                                                    </button>
                                                    <button onClick={() => deleteAdmin(a._id)} className="text-slate-400 hover:text-red-500 p-2 rounded transition-colors">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-8 text-center">
                        <Shield size={48} className="text-slate-300 mb-4" />
                        <h3 className="font-bold text-slate-700 text-lg">Superadmin Only</h3>
                        <p className="text-slate-500 text-sm mt-2 max-w-xs">You must be a Superadmin to view and manage other administrator accounts.</p>
                    </div>
                )}
            </div>

            {showAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in text-left">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 font-bold text-lg">Create New Administrator</div>
                        <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
                            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label><input type="text" required value={newAdmin.name}  onChange={e => {
      const value = e.target.value;
      // allow only letters and spaces
      if (/^[A-Za-z\s]*$/.test(value)) {
        setNewAdmin({ ...newAdmin, name: value });
      }
    }} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Email</label><input type="email" required value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
<div className="relative">
  <input
    type={showNewPassword ? "text" : "password"}
    required
    value={newAdmin.password}
    onFocus={() => setNewAdminPwFocused(true)}
    onBlur={() => setNewAdminPwFocused(false)}
    onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
  />

  {/* Eye Button */}
  <button
    type="button"
    onClick={() => setShowNewPassword(!showNewPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
  >
    {showNewPassword ? <EyeOff /> : <Eye/>}
  </button>
</div>

<PasswordStrengthChecker password={newAdmin.password} focused={newAdminPwFocused} />                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                                <input
                                    value="Admin"
                                    disabled
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-gray-100"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowAdminModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors">Create Admin</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Admin Modal */}
            {showEditAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in text-left">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 font-bold text-lg">Edit Administrator</div>
                        <form onSubmit={handleEditAdmin} className="p-6 space-y-4">
                            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label><input type="text" required value={editAdminForm.name} onChange={e => setEditAdminForm({ ...editAdminForm, name: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Email</label><input type="email" required value={editAdminForm.email} onChange={e => setEditAdminForm({ ...editAdminForm, email: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
<div className="relative">
  <input
    type={showNewPassword ? "text" : "password"}
    required
    value={newAdmin.password}
    onFocus={() => setNewAdminPwFocused(true)}
    onBlur={() => setNewAdminPwFocused(false)}
    onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
  />

  {/* Eye Button */}
  <button
    type="button"
    onClick={() => setShowNewPassword(!showNewPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
  >
    {showNewPassword ? <EyeOff /> : <Eye/>}
  </button>
</div>

<PasswordStrengthChecker password={newAdmin.password} focused={newAdminPwFocused} />                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                                <input
                                    value="Admin"
                                    disabled
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-gray-100"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowEditAdminModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
