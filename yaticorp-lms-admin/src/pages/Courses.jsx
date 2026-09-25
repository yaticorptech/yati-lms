/**
 * @author Preethesh Kulal
 * @description Admin course listing with status filters, search and course card management
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { Plus, Edit2, Trash2, LayoutList, FilePlus, ArrowUpDown, Filter, Calendar, Info, X, MoreVertical, Settings, Eye, EyeOff } from 'lucide-react';
import useAutoRefresh from '../hooks/useAutoRefresh';
const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [titleError, setTitleError] = useState('');

    const navigate = useNavigate();

    // Modals & Dropdown
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(null);

    const [formData, setFormData] = useState({ title: '', description: '', thumbnail: '', isPublished: false, price: 0, duration: 31 });
    const [editId, setEditId] = useState(null);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [thumbError, setThumbError] = useState('');

    const handleThumbnailUpload = async (file) => {
        if (!file) return;
        setThumbError('');
        setUploadingThumb(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await api.post('/admin/courses/thumbnail', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setFormData(prev => ({ ...prev, thumbnail: res.data.url }));
        } catch (err) {
            setThumbError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploadingThumb(false);
        }
    };

    const handleTogglePublish = async (course) => {
        try {
            await api.put(`/admin/courses/${course._id}`, { ...course, isPublished: !course.isPublished });
            fetchCourses();
            setOpenDropdown(null);
        } catch (err) {
            console.error('Failed to toggle publish status:', err);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await api.get('/admin/courses');
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(fetchCourses, 30000);
    

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await api.put(`/admin/courses/${editId}`, formData);
                fetchCourses();
            } else {
                const newCourse = await api.post('/admin/courses', formData);
                if (newCourse.data && newCourse.data._id) {
                    navigate(`/courses/${newCourse.data._id}`);
                } else {
                    fetchCourses();
                }
            }
            setShowModal(false);
            setFormData({ title: '', description: '', thumbnail: '', isPublished: false, price: 0, duration: 31 });
        } catch (err) {
            console.error(err);

            if (err.response?.data?.message?.toLowerCase().includes('exists')) {
                setTitleError('Title is already created');
            }
        }
    };

    const confirmDelete = (course) => {
        setCourseToDelete(course);
        setShowDeleteModal(true);
    };

    const executeDelete = async () => {
        if (!courseToDelete) return;
        try {
            await api.delete(`/admin/courses/${courseToDelete._id}`);
            fetchCourses();
            setCourseToDelete(null);
            setShowDeleteModal(false); // Close modal after successful delete
        } catch (err) {
            console.error(err);
        }
    };

    // The ⋮ menu closes on any press outside it, and on Escape.
    useEffect(() => {
        if (!openDropdown) return undefined;
        const onDown = (e) => { if (!e.target.closest?.('[data-course-menu]')) setOpenDropdown(null); };
        const onKey = (e) => { if (e.key === 'Escape') setOpenDropdown(null); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [openDropdown]);

    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.isPublished).length;
    const unpublishedCourses = totalCourses - publishedCourses;

    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');

    const filteredCourses = courses
        .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(c => statusFilter === 'published' ? c.isPublished : statusFilter === 'draft' ? !c.isPublished : true)
        .sort((a, b) => sortOrder === 'newest' ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt));

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in relative z-0 max-w-7xl mx-auto pb-10">
            {/* Header section */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-tight">Courses</h1>
                    <p className="text-sm lg:text-base text-slate-500 mt-1">Manage and organize your LMS curriculum</p>
                </div>
                <button
                    onClick={() => { setEditId(null); setFormData({ title: '', description: '', thumbnail: '', isPublished: false, price: 0, duration: 31 }); setShowModal(true); }}
                    aria-label="Create Course"
                    className="flex shrink-0 items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                    <Plus size={18} /> <span className="hidden sm:inline">Create Course</span><span className="sm:hidden">New</span>
                </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="relative w-full lg:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Filter size={18} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-11 pr-10 py-3 rounded-xl border-2 focus:outline-none text-sm transition-all ${searchTerm ? 'border-indigo-500 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500'}`}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 p-1">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="flex items-stretch gap-2 sm:gap-3">
                    <div className="flex flex-1 gap-1 bg-slate-100 p-1 rounded-xl lg:flex-none">
                        {['all', 'published', 'draft'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                aria-pressed={statusFilter === f}
                                className={`flex-1 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold transition-all lg:flex-none ${statusFilter === f
                                    ? 'bg-white text-indigo-600 shadow'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setSortOrder(v => v === 'newest' ? 'oldest' : 'newest')}
                        aria-label={sortOrder === 'newest' ? 'Sorted latest first' : 'Sorted oldest first'}
                        className={`shrink-0 text-sm font-bold flex items-center gap-2 border rounded-xl px-3 bg-white transition-colors ${sortOrder === 'oldest' ? 'border-indigo-400 text-indigo-600' : 'border-slate-200 text-slate-600 hover:text-indigo-600'}`}
                    >
                        <ArrowUpDown size={16} className="opacity-70" />
                        <span className="hidden sm:inline">{sortOrder === 'newest' ? 'Latest First' : 'Oldest First'}</span>
                        <span className="sm:hidden">{sortOrder === 'newest' ? 'Latest' : 'Oldest'}</span>
                    </button>
                </div>
            </div>

            {/* Stats: three across at every width, compact on a phone. */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-2xl p-2.5 sm:p-4 lg:p-6 shadow-sm relative overflow-hidden">
                {/* Decorative blob shapes */}
                <div className="absolute -top-20 -left-20 w-48 h-48 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

                {[
                    { value: totalCourses, label: 'Total', long: 'Total Courses', tone: 'text-slate-800', sub: 'text-slate-500' },
                    { value: publishedCourses, label: 'Published', long: 'Published Courses', tone: 'text-indigo-600', sub: 'text-indigo-500' },
                    { value: unpublishedCourses, label: 'Drafts', long: 'Draft Courses', tone: 'text-amber-500', sub: 'text-amber-500' }
                ].map((stat) => (
                    <div key={stat.long} className="relative z-10 flex min-w-0 flex-col items-center justify-center rounded-xl border border-white bg-white/60 px-1 py-3 sm:p-4 shadow-sm backdrop-blur-sm">
                        <div className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${stat.tone}`}>{stat.value}</div>
                        <div className={`mt-1 sm:mt-2 max-w-full truncate text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-widest ${stat.sub}`}>
                            <span className="sm:hidden">{stat.label}</span><span className="hidden sm:inline">{stat.long}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 pb-20">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-500">Loading your courses...</div>
                ) : filteredCourses.map(course => (
                    <div key={course._id} className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-visible hover:shadow-[0_12px_36px_-4px_rgba(0,0,0,0.1)] lg:hover:-translate-y-1 transition-all duration-300 flex flex-col group relative">
                        <Link to={`/courses/${course._id}`} aria-label={`Open ${course.title} in the builder`}
                            className="h-36 sm:h-44 bg-gradient-to-br from-slate-800 to-indigo-900 relative overflow-hidden flex items-center justify-center rounded-t-2xl">
                            {course.thumbnail ? (
                                <img src={course.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="z-10 flex flex-col items-center gap-2 px-6 text-center text-white">
                                    <BookOpen size={28} className="text-indigo-300" />
                                    <span className="line-clamp-2 text-base font-bold">{course.title}</span>
                                </div>
                            )}
                            <span className={`absolute left-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-bold shadow-sm ${course.isPublished ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'}`}>
                                {course.isPublished ? 'Published' : 'Draft'}
                            </span>
                        </Link>


                        <div className="p-4 sm:p-5 flex-1 flex flex-col">

                            {/* ROW 1 → Title, and the ID under it */}
                            <h3 className="font-bold text-lg text-slate-900 line-clamp-2 leading-snug" title={course.title}>
                                {course.title}
                            </h3>
                            <span className="mt-1 w-fit max-w-full truncate text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                ID: {course._id}
                            </span>

                            {/* ROW 2 → Lessons + Date */}
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-[13px] text-slate-500 font-medium">
                                    {course.lessonsCount || 0} {course.lessonsCount === 1 ? 'Lesson' : 'Lessons'}
                                </span>

                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                    <Calendar size={12} />
                                    {course.createdAt
                                        ? new Date(course.createdAt).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })
                                        : '—'}
                                </div>
                            </div>

                            {/* ROW 3 → Price, and the actions — always visible, since a
                                touchscreen has no hover to reveal them. */}
                            <div className="mt-auto flex items-center gap-2 pt-3">
                                <span className="mr-auto text-lg font-bold text-slate-900 tabular-nums">
                                    {Number(course.price) > 0 ? `₹ ${Number(course.price).toLocaleString('en-IN')}` : 'Free'}
                                </span>
                                <Link to={`/courses/${course._id}`} title="Course Builder"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100">
                                    <LayoutList size={16} /> Builder
                                </Link>
                                <div className="relative" data-course-menu>
                                    <button
                                        onClick={() => setOpenDropdown(openDropdown === course._id ? null : course._id)}
                                        aria-label={`More actions for ${course.title}`} aria-haspopup="menu" aria-expanded={openDropdown === course._id}
                                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    {openDropdown === course._id && (
                                        <div role="menu" className="absolute bottom-full right-0 z-40 mb-2 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl animate-fade-in">
                                            <button role="menuitem"
                                                onClick={() => { setEditId(course._id); setFormData(course); setShowModal(true); setOpenDropdown(null); }}
                                                className="flex w-full items-center px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                                            >
                                                <Settings size={16} className="mr-3 text-slate-400" /> Edit Details
                                            </button>
                                            <button role="menuitem"
                                                onClick={() => handleTogglePublish(course)}
                                                className="flex w-full items-center border-t border-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                                            >
                                                {course.isPublished
                                                    ? <><EyeOff size={16} className="mr-3 text-slate-400" /> Unpublish</>
                                                    : <><Eye size={16} className="mr-3 text-slate-400" /> Publish</>}
                                            </button>
                                            <button role="menuitem"
                                                onClick={() => { confirmDelete(course); setOpenDropdown(null); }}
                                                className="flex w-full items-center border-t border-slate-50 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 size={16} className="mr-3 flex-shrink-0" /> Delete Course
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in text-left">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editId ? 'Edit Course Settings' : 'Create New Course'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Course Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={100}
                                    value={formData.title}
                                    onChange={e => {
                                        setFormData({ ...formData, title: e.target.value });
                                        setTitleError(''); // clear error when typing
                                    }}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter course title"
                                />
                                {/* 🔴 ERROR MESSAGE HERE */}
                                {titleError && (
                                    <p className="text-red-500 text-xs mt-1 font-medium">
                                        {titleError}
                                    </p>
                                )}                                <p className={`text-xs mt-1 text-right ${formData.title.length >= 90 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                                    {formData.title.length}/100 characters
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required rows="3" maxLength={500} value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Brief description of what students will learn"
                                ></textarea>
                                <p className={`text-xs mt-1 text-right ${formData.description.length >= 450 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                                    {formData.description.length}/500 characters
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Thumbnail</label>
                                {formData.thumbnail && (
                                    <div className="mb-2 relative w-full h-40 rounded-lg overflow-hidden border border-slate-200">
                                        <img src={formData.thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setFormData({ ...formData, thumbnail: '' })}
                                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <label className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-sm font-medium text-slate-600">
                                    <FilePlus size={16} />
                                    {uploadingThumb ? 'Uploading...' : (formData.thumbnail ? 'Change image' : 'Upload from device')}
                                    <input type="file" accept="image/*" className="hidden" disabled={uploadingThumb}
                                        onChange={e => handleThumbnailUpload(e.target.files?.[0])} />
                                </label>
                                {thumbError && <p className="text-xs text-red-500 mt-1">{thumbError}</p>}
                            </div>
                            <div className="flex items-center space-x-3 pt-2">
                                <input
                                    type="checkbox" id="isPublished" checked={formData.isPublished} onChange={e => setFormData({ ...formData, isPublished: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 outline-none"
                                />
                                <label htmlFor="isPublished" className="text-sm font-semibold text-slate-700 cursor-pointer">Published to Students</label>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Price (₹)</label>
                                <input
                                    type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={!!titleError}
                                    className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >                                    {editId ? 'Save Changes' : 'Create Course'}
                                </button>
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
                title="Delete Course"
                message="Are you sure you want to delete this course? This will permanently remove all associated modules and lessons inside."
                itemName={courseToDelete?.title}
            />
        </div>
    );
};

// Simple BookOpen icon to fallback when no thumbnail
const BookOpen = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    </svg>

);



export default Courses;