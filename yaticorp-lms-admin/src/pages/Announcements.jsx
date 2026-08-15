/**
 * @author Preethesh Kulal
 * @description Admin page to create and manage student announcements
 */
import React, { useState } from 'react';
import api from '../utils/api';
import { Megaphone, Plus, Trash2, X, Edit } from 'lucide-react';
import useAutoRefresh from '../hooks/useAutoRefresh';

const Announcements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', message: '' });
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAnnouncementId, setSelectedAnnouncementId] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [_isEditing, setIsEditing] = useState(false);
    const [_editId, setEditId] = useState(null);


    const fetchAnnouncements = async () => {
        try {
            const res = await api.get('/admin/announcements');
            setAnnouncements(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(fetchAnnouncements, 30000);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {

            await api.post('/admin/announcements', form);


            // Reset everything after success
            setForm({ title: '', message: '' });
            setShowForm(false);
            setIsEditing(false);
            setEditId(null);

            fetchAnnouncements();

        } catch {
            setErrorMessage('Submission failed. Please try again.');
            setShowErrorModal(true);
        } finally {
            setSaving(false);
        }
    };
    const handleDelete = async () => {
        try {
            await api.delete(`/admin/announcements/${selectedAnnouncementId}`);
            fetchAnnouncements();
            setShowDeleteModal(false);
            setSelectedAnnouncementId(null);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Megaphone size={28} className="text-indigo-600" /> Announcements
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Create and manage announcements visible to all students.</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all"
                >
                    <Plus size={18} /> New Announcement
                </button>
            </div>

            {/* Create Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Megaphone size={18} className="text-indigo-600" /> New Announcement
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. New batch starts Monday"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Message *</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.message}
                                    onChange={e => setForm({ ...form, message: e.target.value })}
                                    placeholder="Write the announcement details..."
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                                    {saving ? 'Posting...' : 'Post Announcement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Announcements List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-16 text-slate-400">Loading...</div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400">
                        <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">No announcements yet.</p>
                        <p className="text-sm mt-1">Click "New Announcement" to create one.</p>
                    </div>
                ) : announcements.map(ann => (
                    <div key={ann._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex gap-4 items-start hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Megaphone size={18} className="text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-base">{ann.title}</p>
                            <p className="text-slate-600 text-sm mt-1 leading-relaxed">{ann.message}</p>
                            <p className="text-xs text-slate-400 mt-2">{new Date(ann.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">

                            {/* ✏️ Edit Button */}
                            <button
                                onClick={() => {
                                    setForm({ title: ann.title, message: ann.message });
                                    setEditId(ann._id);
                                    setIsEditing(true);
                                    setShowForm(true);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Edit announcement"
                            >
                                <Edit size={18} />
                            </button>

                            {/* 🗑 Delete Button */}
                            <button
                                onClick={() => {
                                    setSelectedAnnouncementId(ann._id);
                                    setShowDeleteModal(true);
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                title="Delete announcement"
                            >
                                <Trash2 size={18} />
                            </button>

                        </div>


                    </div>
                ))}
            </div>
            {showDeleteModal && (
                <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center z-50 p-4">

                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">

                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <h2 className="font-bold text-lg text-slate-800">
                                Delete Announcement
                            </h2>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5">
                            <p className="text-sm text-slate-600">
                                Are you sure you want to delete this announcement? This action cannot be undone.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-sm rounded-xl bg-slate-100 hover:bg-slate-200"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showErrorModal && (
                <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center z-50 p-4">

                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-fade-in">

                        {/* Header */}
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-red-600">
                                Submission Failed
                            </h2>
                        </div>

                        {/* Body */}
                        <div className="p-5">
                            <p className="text-sm text-slate-600">
                                {errorMessage}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end p-5 border-t border-slate-100">
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Announcements;
