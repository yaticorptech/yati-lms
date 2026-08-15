/**
 * @author Preethesh Kulal
 * @description Admin course listing with status filters, search and course card management
 */
import React, { useState } from 'react';
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-tight">Courses</h1>
                    <p className="text-sm lg:text-base text-slate-500 mt-1">Manage and organize your LMS curriculum</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 md:mt-0">
                    <button
                        onClick={() => { setEditId(null); setFormData({ title: '', description: '', thumbnail: '', isPublished: false, price: 0, duration: 31 }); setShowModal(true); }}
                        className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                    >
                        <Plus size={18} className="mr-2" /> Create Course
                    </button>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
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
                <div className="flex items-center gap-3 px-1 lg:px-0">
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                        {['all', 'published', 'draft'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${statusFilter === f
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
                        className={`text-sm font-bold flex items-center gap-2 border rounded-lg px-3 py-2.5 bg-white transition-colors ${sortOrder === 'oldest' ? 'border-indigo-400 text-indigo-600' : 'border-slate-200 text-slate-600 hover:text-indigo-600'}`}
                    >
                        <Calendar size={16} className="opacity-70" />
                        {sortOrder === 'newest' ? 'Latest First' : 'Oldest First'}
                    </button>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-2xl p-4 lg:p-6 mb-8 shadow-sm relative overflow-hidden">
                {/* Decorative blob shapes */}
                <div className="absolute -top-20 -left-20 w-48 h-48 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

                <div className="relative z-10 flex flex-col items-center justify-center p-3 sm:p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white shadow-sm hover:shadow transition-all duration-300">
                    <div className="text-3xl font-black text-slate-800 tracking-tight">{totalCourses}</div>
                    <div className="text-[11px] font-bold tracking-widest text-slate-500 uppercase mt-2">Total Courses</div>
                </div>
                <div className="relative z-10 flex flex-col items-center justify-center p-3 sm:p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white shadow-sm hover:shadow transition-all duration-300">
                    <div className="text-3xl font-black text-indigo-600 tracking-tight">{publishedCourses}</div>
                    <div className="text-[11px] font-bold tracking-widest text-indigo-500 uppercase mt-2">Published Courses</div>
                </div>
                <div className="relative z-10 flex flex-col items-center justify-center p-3 sm:p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white shadow-sm hover:shadow transition-all duration-300">
                    <div className="text-3xl font-black text-amber-500 tracking-tight">{unpublishedCourses}</div>
                    <div className="text-[11px] font-bold tracking-widest text-amber-500 uppercase mt-2">Draft Courses</div>
                </div>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-500">Loading your courses...</div>
                ) : filteredCourses.map(course => (
                    <div key={course._id} className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-visible hover:shadow-[0_12px_36px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col group relative">
                        <div className="h-48 bg-slate-800 relative overflow-hidden flex items-center justify-center rounded-t-2xl">
                            {course.thumbnail ? (
                                <img src={course.thumbnail} alt={course.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="text-white text-lg font-bold text-center z-10">{course.title}</div>
                            )}

                            {/* Dropdown Toggle Button */}
                            <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setOpenDropdown(openDropdown === course._id ? null : course._id);
                                    }}
                                    className="p-1.5 bg-white/90 backdrop-blur text-slate-700 rounded-lg shadow-sm hover:bg-white hover:text-indigo-600 transition-colors"
                                >
                                    <MoreVertical size={20} />
                                </button>
                            </div>

                            {/* Dropdown Menu */}
                            {openDropdown === course._id && (
                                <div className="absolute top-12 right-3 z-40 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in flex flex-col">
                                    <button
                                        onClick={() => { setEditId(course._id); setFormData(course); setShowModal(true); setOpenDropdown(null); }}
                                        className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors w-full text-left"
                                    >
                                        <Settings size={16} className="mr-3 text-slate-400" /> Edit Details
                                    </button>
                                    <button
                                        onClick={() => handleTogglePublish(course)}
                                        className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors border-t border-slate-50 w-full text-left"
                                    >
                                        {course.isPublished ? (
                                            <><EyeOff size={16} className="mr-3 text-slate-400" /> Unpublish</>
                                        ) : (
                                            <><Eye size={16} className="mr-3 text-slate-400" /> Publish</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => { confirmDelete(course); setOpenDropdown(null); }}
                                        className="flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors border-t border-slate-50 w-full text-left"
                                    >
                                        <Trash2 size={16} className="mr-3 flex-shrink-0" /> Delete Course
                                    </button>
                                </div>
                            )}

                            {/* Overlay Builder Action (on hover, bottom left) */}
                            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm z-20">
                                <Link to={`/courses/${course._id}`} className="px-4 py-2 bg-indigo-600/90 text-white text-sm font-bold rounded-lg hover:bg-indigo-600 transition-colors shadow-lg flex items-center shadow-indigo-500/30" title="Course Builder">
                                    <LayoutList size={16} className="mr-2" /> Builder
                                </Link>
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">

                            {/* ROW 1 → Title + ID */}
                            <div className="flex items-center justify-between gap-3">
                                <h3
                                    className="font-bold text-lg text-slate-900 line-clamp-1 leading-snug"
                                    title={course.title}
                                >
                                    {course.title}
                                </h3>

                                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded whitespace-nowrap">
                                    ID: {course._id}
                                </span>
                            </div>

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

                            {/* ROW 3 → Price + Status */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                <span className="text-lg font-bold text-slate-900">
                                    ₹ {course.price || '5,000'}
                                </span>

                                <span
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md tracking-wide ${course.isPublished
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-red-50 text-red-500'
                                        }`}
                                >
                                    {course.isPublished ? 'Published' : 'Unpublished'}
                                </span>
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in text-left">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editId ? 'Edit Course Settings' : 'Create New Course'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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