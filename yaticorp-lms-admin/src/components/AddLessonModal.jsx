/**
 * @author Preethesh Kulal
 * @description Modal component for adding and editing course lessons
 */
import React, { useState, useEffect } from 'react';
import { Video, Headphones, FileText, MonitorPlay, Users, File, Box, CheckSquare, PenTool, Code, UploadCloud, X } from 'lucide-react';
import api from '../utils/api';

const lessonTypes = [
    { id: 'video', label: 'Video', icon: Video, color: 'text-emerald-500', bg: 'bg-emerald-50', active: true },
    { id: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-500', bg: 'bg-red-50', active: true },
    { id: 'quiz', label: 'Section Quiz', icon: CheckSquare, color: 'text-purple-500', bg: 'bg-purple-50', active: true },
    { id: 'assignment', label: 'Assignment', icon: PenTool, color: 'text-sky-500', bg: 'bg-sky-50', active: true },
    { id: 'audio', label: 'Audio', icon: Headphones, color: 'text-orange-500', bg: 'bg-orange-50', active: false },
    { id: 'slides', label: 'Slides', icon: MonitorPlay, color: 'text-blue-500', bg: 'bg-blue-50', active: false },
    { id: 'live', label: 'Live', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50', active: false },
    { id: 'article', label: 'Article', icon: File, color: 'text-slate-500', bg: 'bg-slate-50', active: false },
    { id: 'scorm', label: 'Scorm/Tincan', icon: Box, color: 'text-pink-500', bg: 'bg-pink-50', active: false },
    { id: 'code', label: 'Code Challenge', icon: Code, color: 'text-slate-700', bg: 'bg-slate-100', active: false },
];

const AddLessonModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('video');
    const [url, setUrl] = useState(''); // video/pdf URL (from upload or pasted)
    const [videoSource, setVideoSource] = useState('youtube');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        if (isOpen && initialData) {
            setTitle(initialData.title || '');
            setUploadError(''); setProgress(0); setFileName('');
            setVideoSource(initialData.videoSource || 'youtube');
            if (initialData.pdfUrl) { setType('pdf'); setUrl(initialData.pdfUrl); }
            else if (initialData.quizId) setType('quiz');
            else if (initialData.assignmentId) setType('assignment');
            else { setType('video'); setUrl(initialData.videoUrl || ''); }
        } else if (isOpen) {
            setTitle(''); setType('video'); setUrl(''); setVideoSource('youtube');
            setUploadError(''); setProgress(0); setFileName('');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleFileUpload = async (file) => {
        if (!file) return;
        setUploadError(''); setProgress(0); setFileName(file.name);
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/admin/lessons/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => { if (e.total) setProgress(Math.round((e.loaded * 100) / e.total)); },
            });
            setUrl(res.data.url);
            if (type === 'video') setVideoSource('generic');
        } catch (err) {
            setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = { title, type };
        if (type === 'video') { data.videoUrl = url; data.videoSource = videoSource; }
        if (type === 'pdf') data.pdfUrl = url;

        onSave(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex mt-10 justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto pt-10">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-fit overflow-hidden mb-10 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Add lesson / Quiz</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-light hover:bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors">×</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Title Input */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-[15px] font-bold text-slate-800">Lesson Title</label>
                            <span className="text-xs font-semibold text-slate-400">{title.length}/60</span>
                        </div>
                        <input
                            type="text"
                            required
                            maxLength={60}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Enter Lesson Title"
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium transition-shadow shadow-sm"
                        />
                    </div>

                    {/* Lesson Type Grid */}
                    <div>
                        <label className="block text-[15px] font-bold text-slate-800 mb-4">Select Lesson Type</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {lessonTypes.map(lt => (
                                <div
                                    key={lt.id}
                                    onClick={() => lt.active && setType(lt.id)}
                                    className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-all 
                                        ${lt.active ? 'cursor-pointer' : 'cursor-not-allowed opacity-40 grayscale'} 
                                        ${type === lt.id && lt.active ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' :
                                            lt.active ? 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50' : 'border-slate-100 bg-slate-50'}`}
                                >
                                    <div className={`p-2 rounded-lg ${lt.bg} ${lt.color}`}>
                                        <lt.icon size={20} />
                                    </div>
                                    <span className="font-bold text-slate-700 text-[13px]">{lt.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upload video/PDF from device, or paste a URL */}
                    {(type === 'video' || type === 'pdf') && (
                        <div className="animate-fade-in bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                            <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide">
                                {type === 'video' ? 'Video' : 'PDF'}
                            </label>

                            {/* Upload from device */}
                            <label className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-sm font-semibold ${uploading ? 'border-emerald-300 bg-emerald-50 text-emerald-600 cursor-wait' : 'border-slate-300 text-slate-600 hover:border-emerald-500 hover:bg-emerald-50'}`}>
                                <UploadCloud size={18} />
                                {uploading ? `Uploading ${progress}%...` : `Upload ${type === 'video' ? 'video' : 'PDF'} from device`}
                                <input
                                    type="file"
                                    accept={type === 'video' ? 'video/*' : 'application/pdf,.pdf'}
                                    className="hidden"
                                    disabled={uploading}
                                    onChange={e => handleFileUpload(e.target.files?.[0])}
                                />
                            </label>

                            {uploading && (
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${progress}%` }} />
                                </div>
                            )}
                            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

                            {url && !uploading && (
                                <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                    <FileText size={14} className="text-emerald-500 shrink-0" />
                                    <span className="truncate flex-1">{fileName || url}</span>
                                    <button type="button" onClick={() => { setUrl(''); setFileName(''); }} className="text-slate-400 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Or paste a URL */}
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1">or paste a {type === 'video' ? 'video / YouTube' : 'PDF'} URL</p>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={e => {
                                        setUrl(e.target.value);
                                        setFileName('');
                                        if (type === 'video') setVideoSource(e.target.value.includes('youtube') ? 'youtube' : 'generic');
                                    }}
                                    placeholder={type === 'video' ? 'https://youtube.com/... or a direct .mp4 URL' : 'https://.../file.pdf'}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-slate-800 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end space-x-4 pt-6 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold border-2 border-slate-200 rounded-full hover:bg-slate-50 transition-colors">Cancel</button>
                        <button type="submit" disabled={uploading} className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 transition-colors shadow-md transform hover:scale-105 duration-200 disabled:opacity-50 disabled:hover:scale-100">Continue</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddLessonModal;
