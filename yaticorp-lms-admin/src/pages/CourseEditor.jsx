/**
 * @author Preethesh Kulal
 * @description Course builder with drag-and-drop modules, lessons and preview button
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../utils/api';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { Plus, Edit2, Trash2, ArrowLeft, GripVertical, Video, FileText, CheckSquare, Briefcase, ChevronDown, ChevronRight, Settings, ArrowUpDown, UploadCloud, Search, EyeOff, Eye, Book, HelpCircle, Clock, PlayCircle, PenTool, Layout, CheckCircle2, ExternalLink, X } from 'lucide-react';
import AddLessonModal from '../components/AddLessonModal';

const CourseEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState({});
    const [savedToast, setSavedToast] = useState(false);
    const [sessionError, setSessionError] = useState('');
    const [_lessonError, setLessonError] = useState('');

    // Show toast if redirected from lesson save. Mount-only by design: the
    // navigation state is consumed once and then cleared via replaceState.
    useEffect(() => {
        if (location.state?.lessonSaved) {
            setSavedToast(true);
            setTimeout(() => setSavedToast(false), 3000);
            // Clear the state so it doesn't re-show on refresh
            window.history.replaceState({}, '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleModule = (id) => {
        setExpandedModules(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
    };

    // Editing Modals
    const [modModal, setModModal] = useState({ show: false, editId: null, data: { title: '', description: '', dripDays: 0 } });
    const [lessModal, setLessModal] = useState({ show: false, editId: null, moduleId: null, data: { title: '', videoUrl: '', pdfUrl: '', quizId: '', assignmentId: '' } });

    // Custom Delete Modals
    const [deleteModalState, setDeleteModalState] = useState({ show: false, type: '', item: null });

    const fetchCourseData = async () => {
        try {
            const res = await api.get(`/admin/courses/${id}`);
            setCourse(res.data.course);
            // Sort modules locally just mapping order safely
            const mods = res.data.modules.sort((a, b) => a.order - b.order);
            mods.forEach(m => m.lessons.sort((a, b) => a.order - b.order));
            setModules(mods);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourseData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // DRAG AND DROP HANDLERS
    const onDragEnd = async (result) => {
        // Block drag if reorder mode is not active
        if (!reorderMode) return;
        const { destination, source, type } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (type === 'module') {
            const newModules = Array.from(modules);
            const [reordered] = newModules.splice(source.index, 1);
            newModules.splice(destination.index, 0, reordered);

            // Update local state instantly
            const updatedModules = newModules.map((m, index) => ({ ...m, order: index }));
            setModules(updatedModules);

            // Save to server
            await api.put('/admin/modules/reorder', {
                orderData: updatedModules.map(m => ({ id: m._id, order: m.order }))
            });
        }

        if (type === 'lesson') {
            const moduleId = source.droppableId;
            const moduleIndex = modules.findIndex(m => m._id === moduleId);
            const newLessons = Array.from(modules[moduleIndex].lessons);
            const [reordered] = newLessons.splice(source.index, 1);
            newLessons.splice(destination.index, 0, reordered);

            const updatedLessons = newLessons.map((l, index) => ({ ...l, order: index }));

            const newModules = [...modules];
            newModules[moduleIndex].lessons = updatedLessons;
            setModules(newModules);

            await api.put('/admin/lessons/reorder', {
                orderData: updatedLessons.map(l => ({ id: l._id, order: l.order }))
            });
        }
    };

    // MODULE CRUD
    const saveModule = async (e) => {
        e.preventDefault();
        try {
            if (modModal.editId) {
                await api.put(`/admin/modules/${modModal.editId}`, modModal.data);
            } else {
                await api.post('/admin/modules', { ...modModal.data, courseId: id });
            }

            setSessionError(''); // clear error
            setModModal({ show: false, editId: null, data: { title: '', description: '', dripDays: 0 } });
            fetchCourseData();

        } catch (err) {
            console.error(err);

            // 🔴 SHOW ERROR
            if (err.response?.data?.message?.toLowerCase().includes('session')) {
                setSessionError('Session already exists');
            }
        }
    };

    const confirmDeleteModule = (module) => {
        setDeleteModalState({ show: true, type: 'module', item: module });
    };

    const executeDeleteModule = async () => {
        if (!deleteModalState.item) return;
        await api.delete(`/admin/modules/${deleteModalState.item._id}`);
        fetchCourseData();
        setDeleteModalState({ show: false, type: '', item: null });
    };

    // LESSON CRUD
    const saveLesson = async (modalData) => {
        try {
            if (lessModal.editId) {
                await api.put(`/admin/lessons/${lessModal.editId}`, { ...lessModal.data, ...modalData });
            } else {
                const res = await api.post('/admin/lessons', {
                    ...lessModal.data,
                    ...modalData,
                    moduleId: lessModal.moduleId
                });

                if (res.data?._id) {
                    navigate(`/courses/${id}/lessons/${res.data._id}`);
                }
            }

            setLessonError('');
            setLessModal({ show: false, editId: null, moduleId: null, data: { title: '', videoUrl: '', pdfUrl: '', quizId: '', assignmentId: '' } });
            fetchCourseData();

        } catch (err) {
            console.error(err);

            if (err.response?.data?.message?.toLowerCase().includes('lesson')) {
                setLessonError('Lesson already exists');
            }
        }
    };

    const confirmDeleteLesson = (lesson) => {
        setDeleteModalState({ show: true, type: 'lesson', item: lesson });
    };

    const executeDeleteLesson = async () => {
        if (!deleteModalState.item) return;
        await api.delete(`/admin/lessons/${deleteModalState.item._id}`);
        fetchCourseData();
        setDeleteModalState({ show: false, type: '', item: null });
    };

    const [showSettingsDropdown, setSettingsDropdown] = useState(false);
    const [courseModal, setCourseModal] = useState({ show: false, data: { title: '', description: '', thumbnail: '', isPublished: false, price: 0 } });
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [thumbError, setThumbError] = useState('');

    const handleCourseThumbUpload = async (file) => {
        if (!file) return;
        setThumbError('');
        setUploadingThumb(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await api.post('/admin/courses/thumbnail', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setCourseModal(prev => ({ ...prev, data: { ...prev.data, thumbnail: res.data.url } }));
        } catch (err) {
            setThumbError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploadingThumb(false);
        }
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [reorderMode, setReorderMode] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('#settings-dropdown-container')) {
                setSettingsDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTogglePublish = async () => {
        try {
            await api.put(`/admin/courses/${id}`, { ...course, isPublished: !course.isPublished });
            fetchCourseData();
            setSettingsDropdown(false);
        } catch (err) {
            console.error('Failed to toggle publish status:', err);
        }
    };

    const confirmDeleteCourse = () => {
        setDeleteModalState({ show: true, type: 'course', item: course });
        setSettingsDropdown(false);
    };

    const executeDeleteCourse = async () => {
        if (!deleteModalState.item) return;
        try {
            await api.delete(`/admin/courses/${id}`);
            navigate('/courses');
        } catch (err) {
            console.error('Failed to delete course:', err);
        }
    };

    const saveCourseDetails = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/admin/courses/${id}`, courseModal.data);
            setCourseModal({ ...courseModal, show: false });
            fetchCourseData();
        } catch (err) {
            console.error('Failed to save course details:', err);
        }
    };

    if (loading) return <div className="p-10 text-center font-medium text-slate-500">Loading Content Builder...</div>;

    let totalLessons = 0;
    let totalQuizzes = 0;
    let totalHidden = 0;
    modules.forEach(m => {
        m.lessons.forEach(l => {
            totalLessons++;
            if (l.quizId) totalQuizzes++;
            if (l.isPublished === false) totalHidden++;
        });
    });

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-5xl mx-auto">
            {/* Lesson saved toast */}
            {savedToast && (
                <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] bg-emerald-600 text-white px-4 py-3 sm:px-6 sm:py-3.5 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2">
                    <CheckCircle2 size={18} className="flex-shrink-0" />
                    <span>Lesson saved successfully!</span>
                </div>
            )}
            {/* Header top row */}
            <div className="flex items-center space-x-2 text-slate-500 mb-4 group cursor-pointer w-max">
                <Link to="/courses" className="flex items-center hover:text-slate-800 transition-colors">
                    <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" /> <span className="font-semibold text-sm">Back</span>
                </Link>
            </div>

            {/* Status Pills */}
            <div className="flex items-center space-x-2 mb-3">
                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded tracking-wide ${course.isPublished ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-slate-100 text-slate-600'}`}>
                    {course.isPublished ? 'Published' : 'Draft'}
                </span>
            </div>

            {/* Title & Action Buttons Row */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-[28px] font-bold text-slate-800 leading-tight">{course.title}</h1>
                </div>
                <div className="flex items-center space-x-3">

                    {/* Preview Button */}
                    <button
                        onClick={() => {
                            const token = localStorage.getItem('adminToken');
                            const studentUrl = import.meta.env.VITE_STUDENT_URL || 'http://localhost:5173';
                            window.open(`${studentUrl}/preview/${id}?token=${token}`, '_blank');
                        }}
                        className="flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-white text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
                        title="Preview course as student"
                    >
                        <ExternalLink size={15} className="mr-2 text-indigo-500" /> Preview
                    </button>

                    {/* Settings Dropdown Container */}
                    <div id="settings-dropdown-container" className="relative">

                        {showSettingsDropdown && (
                            <div className="absolute top-12 right-0 z-40 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in flex flex-col">
                                <button
                                    onClick={() => {
                                        setCourseModal({
                                            show: true,
                                            data: {
                                                title: course.title || '',
                                                description: course.description || '',
                                                thumbnail: course.thumbnail || '',
                                                isPublished: course.isPublished || false,
                                                price: course.price ?? 0,
                                                creditCost: course.creditCost ?? 0,
                                            }
                                        });
                                        setSettingsDropdown(false);
                                    }}
                                    className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors w-full text-left"
                                >
                                    <Settings size={16} className="mr-3 text-slate-400" /> Edit Details
                                </button>
                                <button
                                    onClick={handleTogglePublish}
                                    className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors border-t border-slate-50 w-full text-left"
                                >
                                    {course.isPublished ? (
                                        <><EyeOff size={16} className="mr-3 text-slate-400" /> Unpublish</>
                                    ) : (
                                        <><Eye size={16} className="mr-3 text-slate-400" /> Publish</>
                                    )}
                                </button>
                                <button
                                    onClick={confirmDeleteCourse}
                                    className="flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors border-t border-slate-50 w-full text-left"
                                >
                                    <Trash2 size={16} className="mr-3 flex-shrink-0" /> Delete Course
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setReorderMode(v => !v)}
                        className={`flex items-center px-4 py-2 border rounded-lg text-sm font-semibold transition-colors shadow-sm hidden sm:flex ${reorderMode ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}
                    >
                        <ArrowUpDown size={16} className="mr-2" /> {reorderMode ? 'Done' : 'Reorder'}
                    </button>
                    <button onClick={() => setModModal({ show: true, editId: null, data: { title: '', description: '', dripDays: 0 } })} className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm">
                        <Plus size={16} className="mr-2" /> Add Section
                    </button>
                </div>
            </div>

            {/* Summary Search Strip */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                <div className="relative w-full sm:w-80">
                    <input
                        type="text"
                        placeholder="Search lessons..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={`w-full pl-9 pr-8 py-2.5 border-2 rounded-xl text-[13px] font-medium placeholder:text-slate-400 focus:outline-none transition-all shadow-sm ${searchTerm ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-white focus:border-indigo-400'}`}
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold text-slate-500">
                    {searchTerm && (
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg">
                            {modules.reduce((acc, m) => acc + m.lessons.filter(l => l.title.toLowerCase().includes(searchTerm.toLowerCase())).length, 0)} match(es)
                        </span>
                    )}
                    <div className="flex items-center gap-1"><EyeOff size={13} className="opacity-60" /> {totalHidden} Draft</div>
                    <div className="flex items-center gap-1"><Book size={13} className="opacity-60" /> {totalLessons} Lessons</div>
                    <div className="flex items-center gap-1"><HelpCircle size={13} className="opacity-60" /> {totalQuizzes} Quizzes</div>
                </div>
            </div>

            {/* Accordion Modules Area */}
            <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-100 shadow-inner min-h-[500px]">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="modules" type="module">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                {modules.map((module, mIndex) => {
                                    const hasMatch = searchTerm && module.lessons.some(l => l.title.toLowerCase().includes(searchTerm.toLowerCase()));
                                    // Auto-expand modules that have matching lessons
                                    const isExpanded = searchTerm ? hasMatch : expandedModules[module._id] !== false;

                                    return (
                                        <Draggable key={module._id} draggableId={module._id} index={mIndex}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className="bg-white rounded-[10px] shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden"
                                                >
                                                    {/* Module Accordion Header */}
                                                    <div
                                                        className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center group cursor-pointer hover:bg-slate-50 transition-colors"
                                                        onClick={() => toggleModule(module._id)}
                                                    >
                                                        <div className="flex items-center space-x-4 mb-3 sm:mb-0 w-full sm:w-auto">
                                                            <button
                                                                className="text-slate-600 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-200"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleModule(module._id);
                                                                }}
                                                            >
                                                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                            </button>
                                                            <span className="font-bold text-slate-800 text-[15px] w-4">{mIndex + 1}</span>
                                                            <h3
                                                                className={`font-bold text-[15px] hover:text-indigo-600 transition-colors py-1 ${hasMatch ? 'text-indigo-700' : 'text-slate-800'}`}
                                                            >
                                                                {module.title}
                                                                {hasMatch && <span className="ml-2 text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">match</span>}
                                                            </h3>
                                                        </div>

                                                        <div className="flex items-center justify-between sm:justify-end sm:space-x-6 w-full sm:w-auto pl-10 sm:pl-0">
                                                            <span className="text-[13px] text-slate-500 font-medium">
                                                                {module.lessons.length} Lessons • {module.lessons.filter(l => l.quizId).length} Quizzes
                                                            </span>

                                                            {/* Module Actions */}
                                                            <div className={`flex items-center space-x-1 transition-opacity ${reorderMode ? 'opacity-100' : 'sm:opacity-0 group-hover:opacity-100'}`} onClick={e => e.stopPropagation()}>
                                                                <div
                                                                    {...(reorderMode ? provided.dragHandleProps : {})}
                                                                    className={`p-1.5 rounded transition-colors ${reorderMode ? 'text-indigo-500 cursor-grab' : 'text-slate-200 cursor-not-allowed'}`}
                                                                    title={reorderMode ? 'Drag to reorder' : 'Enable Reorder mode first'}
                                                                >
                                                                    <ArrowUpDown size={16} />
                                                                </div>
                                                                <button onClick={() => setModModal({ show: true, editId: module._id, data: { title: module.title, description: module.description || '', dripDays: module.dripDays || 0 } })} className="p-1.5 text-slate-400 hover:text-slate-700 rounded"><Edit2 size={16} /></button>
                                                                <button onClick={() => confirmDeleteModule(module)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 size={16} /></button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Lesson Content */}
                                                    {isExpanded && (
                                                        <div className="bg-white border-t border-slate-100">
                                                            <Droppable droppableId={module._id} type="lesson">
                                                                {(provided) => (
                                                                    <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[10px]">
                                                                        {module.lessons
                                                                            .filter(l => !searchTerm || l.title.toLowerCase().includes(searchTerm.toLowerCase()))
                                                                            .map((lesson, lIndex) => (
                                                                                <Draggable key={lesson._id} draggableId={lesson._id} index={lIndex}>
                                                                                    {(provided) => (
                                                                                        <div
                                                                                            ref={provided.innerRef} {...provided.draggableProps}
                                                                                            className={`flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 sm:px-6 border-b border-slate-50 transition-colors group ${searchTerm && lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ? 'bg-yellow-50 border-l-2 border-l-yellow-400' : 'hover:bg-slate-50'}`}
                                                                                        >
                                                                                            {/* Left side info */}
                                                                                            <div
                                                                                                className={`flex items-center space-x-4 sm:pl-8 mb-2 sm:mb-0 cursor-pointer group/title ${lesson.isPublished === false ? 'opacity-60 grayscale' : ''}`}
                                                                                                onClick={() => navigate(`/courses/${id}/lessons/${lesson._id}`)}
                                                                                            >
                                                                                                <span className="text-[13px] font-semibold text-slate-500 w-4">{lIndex + 1}</span>

                                                                                                {/* Colored Icons Based on Learnyst Type */}
                                                                                                {(lesson.videoUrl || lesson.videoId) ? <PlayCircle size={18} className="text-[#2e7d32]" /> :
                                                                                                    lesson.pdfUrl ? <FileText size={18} className="text-[#d32f2f]" /> :
                                                                                                        lesson.quizId ? <HelpCircle size={18} className="text-[#7b1fa2]" /> :
                                                                                                            lesson.assignmentId ? <PenTool size={18} className="text-[#1976d2]" /> :
                                                                                                                <Layout size={18} className="text-slate-400" />}

                                                                                                <span className="font-bold text-[14px] text-slate-700 group-hover/title:text-indigo-600 transition-colors">
                                                                                                    {searchTerm ? (() => {
                                                                                                        const idx = lesson.title.toLowerCase().indexOf(searchTerm.toLowerCase());
                                                                                                        if (idx === -1) return lesson.title;
                                                                                                        return <>
                                                                                                            {lesson.title.slice(0, idx)}
                                                                                                            <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic">{lesson.title.slice(idx, idx + searchTerm.length)}</mark>
                                                                                                            {lesson.title.slice(idx + searchTerm.length)}
                                                                                                        </>;
                                                                                                    })() : lesson.title}
                                                                                                </span>
                                                                                            </div>

                                                                                            {/* Right side info */}
                                                                                            <div className="flex items-center justify-between sm:justify-end sm:space-x-4 pl-12 sm:pl-0 w-full sm:w-auto">
                                                                                                {lesson.isPublished === false ? (
                                                                                                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Hidden</span>
                                                                                                ) : (
                                                                                                    <span className="text-[11px] font-bold text-[#2e7d32] sm:opacity-0 group-hover:opacity-100 transition-opacity">Published</span>
                                                                                                )}
                                                                                                <div className={`flex items-center space-x-1 transition-opacity ${reorderMode ? 'opacity-100' : 'sm:opacity-0 group-hover:opacity-100'}`}>
                                                                                                    <div
                                                                                                        {...(reorderMode ? provided.dragHandleProps : {})}
                                                                                                        className={`p-1.5 rounded transition-colors ${reorderMode ? 'text-indigo-500 cursor-grab' : 'text-slate-200 cursor-not-allowed'}`}
                                                                                                        title={reorderMode ? 'Drag to reorder' : 'Enable Reorder mode first'}
                                                                                                    >
                                                                                                        <ArrowUpDown size={16} />
                                                                                                    </div>
                                                                                                    <button onClick={() => navigate(`/courses/${id}/lessons/${lesson._id}`)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded"><Edit2 size={16} /></button>
                                                                                                    <button onClick={() => confirmDeleteLesson(lesson)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 size={16} /></button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </Draggable>
                                                                            ))}
                                                                        {provided.placeholder}
                                                                    </div>
                                                                )}
                                                            </Droppable>

                                                            {/* Learnyst Full-width Add Lesson Button */}
                                                            <div
                                                                onClick={() => setLessModal({ show: true, editId: null, moduleId: module._id, data: { title: '', videoUrl: '', pdfUrl: '', quizId: '', assignmentId: '' } })}
                                                                className="py-3 bg-[#e8f5e9] hover:bg-[#c8e6c9] cursor-pointer flex items-center justify-center text-[#2e7d32] font-semibold text-[14px] transition-colors"
                                                            >
                                                                <Plus size={16} className="mr-2 stroke-[3]" /> Add lesson
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            {/* MODALS */}
            {courseModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] animate-fade-in">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Edit Course Details</h2>
                            <button onClick={() => setCourseModal({ ...courseModal, show: false })} className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100"><X size={20} /></button>
                        </div>
                        <form onSubmit={saveCourseDetails} className="p-6 space-y-5 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course Title <span className="text-red-500">*</span></label>
                                <input type="text" required maxLength={100} value={courseModal.data.title} onChange={e => setCourseModal(prev => ({ ...prev, data: { ...prev.data, title: e.target.value } }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-800" placeholder="e.g., Complete UI/UX Design Course" />
                                <p className={`text-xs mt-1 text-right ${courseModal.data.title.length >= 90 ? 'text-red-500' : 'text-slate-400'}`}>{courseModal.data.title.length}/100</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course Description <span className="text-red-500">*</span></label>
                                <textarea required value={courseModal.data.description} onChange={e => setCourseModal(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all h-28 resize-none font-medium text-slate-800 placeholder:font-normal" placeholder="A brief description of what students will learn..."></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Thumbnail (Optional)</label>
                                {courseModal.data.thumbnail && (
                                    <div className="mb-2 relative w-full h-40 rounded-xl overflow-hidden border border-slate-200">
                                        <img src={courseModal.data.thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setCourseModal(prev => ({ ...prev, data: { ...prev.data, thumbnail: '' } }))}
                                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <label className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-sm font-medium text-slate-600">
                                    <UploadCloud size={16} />
                                    {uploadingThumb ? 'Uploading...' : (courseModal.data.thumbnail ? 'Change image' : 'Upload from device')}
                                    <input type="file" accept="image/*" className="hidden" disabled={uploadingThumb}
                                        onChange={e => handleCourseThumbUpload(e.target.files?.[0])} />
                                </label>
                                {thumbError && <p className="text-xs text-red-500 mt-1">{thumbError}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price (₹) <span className="text-slate-400 font-normal text-xs">— 0 = Free</span></label>
                                    <input type="number" min="0" value={courseModal.data.price ?? 0} onChange={e => setCourseModal(prev => ({ ...prev, data: { ...prev.data, price: e.target.value === '' ? 0 : Number(e.target.value) } }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-800" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Credit Cost <span className="text-slate-400 font-normal text-xs">— 0 = inactive</span></label>
                                    <input type="number" min="0" value={courseModal.data.creditCost ?? 0} onChange={e => setCourseModal(prev => ({ ...prev, data: { ...prev.data, creditCost: e.target.value === '' ? 0 : Number(e.target.value) } }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-800" placeholder="0" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                                <input type="checkbox" id="editIsPublished" checked={courseModal.data.isPublished} onChange={e => setCourseModal(prev => ({ ...prev, data: { ...prev.data, isPublished: e.target.checked } }))} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="editIsPublished" className="text-sm font-semibold text-slate-700 cursor-pointer">Published to Students</label>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                                <button type="button" onClick={() => setCourseModal({ ...courseModal, show: false })} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 font-bold text-lg">{modModal.editId ? 'Edit Section' : 'Add Section'}</div>
                        <form onSubmit={saveModule} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Title
                                </label>

                                <input
                                    type="text"
                                    required
                                    value={modModal.data.title}
                                    onChange={e => {
                                        setModModal({
                                            ...modModal,
                                            data: { ...modModal.data, title: e.target.value }
                                        });
                                        setSessionError(''); // clear error
                                    }}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                />

                                {/* 🔴 ERROR MESSAGE */}
                                {sessionError && (
                                    <p className="text-red-500 text-xs mt-1 font-medium">
                                        {sessionError}
                                    </p>
                                )}
                            </div>                            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Description</label><textarea value={modModal.data.description} onChange={e => setModModal({ ...modModal, data: { ...modModal.data, description: e.target.value } })} className="w-full px-4 py-2 border border-slate-300 rounded-lg" /></div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Drip: available after (days)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={modModal.data.dripDays ?? 0}
                                    onChange={e => setModModal({ ...modModal, data: { ...modModal.data, dripDays: e.target.value === '' ? 0 : Number(e.target.value) } })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                    placeholder="0"
                                />
                                <p className="text-xs text-slate-400 mt-1">Days after a student enrolls before this section unlocks. 0 = available immediately.</p>
                            </div>
                            <div className="flex justify-end space-x-3"><button type="button" onClick={() => setModModal({ ...modModal, show: false })} className="px-4 py-2 text-slate-600 font-semibold">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={!!sessionError}
                                    className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >Save</button></div>
                        </form>
                    </div>
                </div>
            )}

            <AddLessonModal
                isOpen={lessModal.show}
                onClose={() => setLessModal({ ...lessModal, show: false })}
                initialData={lessModal.data}
                onSave={saveLesson}

            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteModalState.show}
                onClose={() => setDeleteModalState({ show: false, type: '', item: null })}
                onConfirm={
                    deleteModalState.type === 'course' ? executeDeleteCourse :
                        deleteModalState.type === 'module' ? executeDeleteModule :
                            executeDeleteLesson
                }
                title={
                    deleteModalState.type === 'course' ? 'Delete Course' :
                        deleteModalState.type === 'module' ? 'Delete Section' :
                            'Delete Lesson'
                }
                message={
                    deleteModalState.type === 'course'
                        ? 'Are you sure you want to delete this course? All sections and lessons will be permanently removed.'
                        : deleteModalState.type === 'module'
                            ? 'Are you sure you want to delete this section? All lessons inside will be permanently removed as well.'
                            : 'Are you sure you want to delete this lesson?'
                }
                itemName={deleteModalState.item?.title}
            />
        </div>
    );
};

export default CourseEditor;
