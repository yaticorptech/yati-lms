/**
 * @author Preethesh Kulal
 * @description Admin page to create and manage course bundles with Draft/Published filters
 */
import React, { useState } from 'react';
import api from '../utils/api';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { Plus, Edit2, Trash2, Layers, Check, X, AlertCircle, CheckCircle2 } from 'lucide-react'; {/* MY CHANGES — added AlertCircle, CheckCircle2 icons */}
import useAutoRefresh from '../hooks/useAutoRefresh';

const Bundles = () => {
    const [bundles, setBundles] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', thumbnail: '', isPublished: false, courses: [] });

    const [formError, setFormError] = useState(''); // MY CHANGES — state for inline error message
    const [formSuccess, setFormSuccess] = useState(''); // MY CHANGES — state for inline success message

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [bundleToDelete, setBundleToDelete] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchData = async () => {
        try {
            const [bRes, cRes] = await Promise.all([
                api.get('/admin/bundles'),
                api.get('/admin/courses')
            ]);
            setBundles(bRes.data);
            setCourses(cRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(fetchData, 30000);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(''); // MY CHANGES — clear previous error
        setFormSuccess(''); // MY CHANGES — clear previous success
        try {
            if (editId) {
                await api.put(`/admin/bundles/${editId}`, formData);
            } else {
                await api.post('/admin/bundles', formData);
            }
            // MY CHANGES — show green success banner, then auto close modal after 1.2s
            setFormSuccess(editId ? 'Bundle updated successfully!' : 'Bundle created successfully!');
            setTimeout(() => {
                setShowModal(false);
                setFormData({ title: '', description: '', thumbnail: '', isPublished: false, courses: [] });
                setEditId(null);
                setFormError('');
                setFormSuccess('');
                fetchData();
            }, 1200);
        } catch (err) {
            console.error(err);
            // MY CHANGES — show red error banner instead of alert()
            setFormError(err.response?.data?.message || err.message || 'An error occurred while saving the bundle.');
        }
    };

    const confirmDelete = (bundle) => {
        setBundleToDelete(bundle);
        setShowDeleteModal(true);
    };

    const executeDelete = async () => {
        if (!bundleToDelete) return;
        try {
            await api.delete(`/admin/bundles/${bundleToDelete._id}`);
            fetchData();
            setBundleToDelete(null);
            setShowDeleteModal(false);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleCourseInBundle = (courseId) => {
        setFormData(prev => {
            const newCourses = prev.courses.includes(courseId)
                ? prev.courses.filter(id => id !== courseId)
                : [...prev.courses, courseId];
            // MY CHANGES — reset isPublished if courses drop to <=1
            return { ...prev, courses: newCourses, isPublished: newCourses.length <= 1 ? false : prev.isPublished };
        });
    };

    // MY CHANGES — clean open handlers that reset error/success state
    const openCreateModal = () => {
        setEditId(null);
        setFormData({ title: '', description: '', thumbnail: '', isPublished: false, courses: [] });
        setFormError('');
        setFormSuccess('');
        setShowModal(true);
    };

    const openEditModal = (bundle) => {
        setEditId(bundle._id);
        setFormData({
            title: bundle.title,
            description: bundle.description || '',
            thumbnail: bundle.thumbnail || '',
            isPublished: bundle.isPublished,
            courses: bundle.courses.filter(c => c).map(c => c._id)
        });
        setFormError(''); // MY CHANGES
        setFormSuccess(''); // MY CHANGES
        setShowModal(true);
    };

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in z-0 relative pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bundle Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Group multiple courses into sellable packages.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                        {['all', 'published', 'draft'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 font-bold shadow-lg shadow-indigo-600/20 transition-all"
                    >
                        <Plus size={20} /> <span>New Bundle</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {loading ? (
                    <div className="col-span-full p-12 text-center text-slate-400">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="font-medium">Loading bundles...</p>
                    </div>
                ) : bundles.filter(b => statusFilter === 'all' ? true : statusFilter === 'published' ? b.isPublished : !b.isPublished).map(bundle => (
                    <div key={bundle._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col group">
                        <div className="h-44 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                            {bundle.thumbnail ? (
                                <img src={bundle.thumbnail} alt={bundle.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20"></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

                            <div className="relative z-10 p-6 text-center">
                                <Layers size={32} className="text-indigo-400 mx-auto mb-2 opacity-50" />
                                <h3 className="font-bold text-lg text-white drop-shadow-md line-clamp-2">{bundle.title}</h3>
                            </div>

                            <div className="absolute top-4 right-4 z-10">
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shadow-sm tracking-wider uppercase backdrop-blur-md ${bundle.isPublished ? 'bg-emerald-500/90 text-white' : 'bg-slate-800/90 text-slate-300'}`}>
                                    {bundle.isPublished ? 'Published' : 'Draft'}
                                </span>
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="mb-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Included Courses ({bundle.courses.length})</p>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100" title="Bundle ID">ID: {bundle._id.slice(-6)}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {bundle.courses.slice(0, 3).map(c => (
                                        <div key={c._id} className="flex items-center text-sm text-slate-600 font-medium">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2.5"></div>
                                            <span className="truncate">{c.title}</span>
                                        </div>
                                    ))}
                                    {bundle.courses.length > 3 && (
                                        <p className="text-xs text-slate-400 font-medium pl-4 mt-1">+ {bundle.courses.length - 3} more courses</p>
                                    )}
                                    {bundle.courses.length === 0 && (
                                        <div className="text-sm text-slate-400 italic py-2">No courses added yet.</div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                <div className="text-xs text-slate-400">
                                    Created {new Date(bundle.createdAt).toLocaleDateString()}
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => openEditModal(bundle)} // MY CHANGES — replaced inline onClick with clean handler
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        title="Edit Bundle"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => confirmDelete(bundle)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        title="Delete Bundle"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                // MY CHANGES — items-start + pt-20 + overflow-y-auto fixes modal hidden behind header
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 pt-25 overflow-y-auto animate-fade-in text-left">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editId ? 'Edit Bundle' : 'Create New Bundle'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 overflow-y-auto space-y-6 flex-1">

                                {/* MY CHANGES — red inline error banner (shows backend errors like duplicate name) */}
                                {formError && (
                                    <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                                        <AlertCircle size={16} className="shrink-0" />
                                        {formError}
                                    </div>
                                )}

                                {/* MY CHANGES — green inline success banner shown before modal auto-closes */}
                                {formSuccess && (
                                    <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium">
                                        <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                                        {formSuccess}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Bundle Title</label>
                                        <input
                                            type="text" required  maxLength={50} /* ✅ NEW CHANGE*/ value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                        <textarea 
                                            rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        ></textarea>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Thumbnail URL</label>
                                        <input   
                                            type="text" value={formData.thumbnail} onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Included Courses</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1">
                                        {courses.map(course => {
                                            const isSelected = formData.courses.includes(course._id);
                                            return (
                                                <div
                                                    key={course._id}
                                                    onClick={() => toggleCourseInBundle(course._id)}
                                                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                                        {isSelected && <Check size={14} className="text-white" />}
                                                    </div>
                                                    <span className="text-sm font-medium line-clamp-1 flex-1">{course.title}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 pt-2">
    {/* ✅ SHOW ONLY IF >1 COURSE */}
    {formData.courses.length > 1 && (
        <>
            <input
                type="checkbox"
                id="isPub"
                checked={formData.isPublished}
                onChange={e => setFormData({ ...formData, isPublished: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 outline-none"
            />
            <label
                htmlFor="isPub"
                className="text-sm font-semibold text-slate-700 cursor-pointer"
            >
                Published and visible
            </label>
        </>
    )}
</div>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg shadow transition-colors">Save Bundle</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={executeDelete}
                title="Delete Bundle"
                message="Are you sure you want to delete this bundle? The individual courses inside will remain untouched and safely preserved."
                itemName={bundleToDelete?.title}
            />
        </div>
    );
};

export default Bundles;