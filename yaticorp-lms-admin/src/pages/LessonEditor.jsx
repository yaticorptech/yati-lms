/**
 * @author Preethesh Kulal
 * @description Lesson content editor supporting video, PDF, quiz and assignment types
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, Link as LinkIcon, Cloud, FileText, Upload, Plus, ToggleLeft, ToggleRight, Eye, MonitorPlay, HelpCircle, Trash2, CheckCircle, Download as DownloadIcon, FileSpreadsheet, PlayCircle } from 'lucide-react';
import api from '../utils/api';
import axios from 'axios';
import * as XLSX from 'xlsx';

const LessonEditor = () => {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lessonType, setLessonType] = useState('video'); // 'video' | 'pdf' | 'quiz'
    const [activeTab, setActiveTab] = useState('video');

    // UI states
    const [isFree, setIsFree] = useState(false);
    const [allowDownload, setAllowDownload] = useState(false);
    const [isPublished, setIsPublished] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSavedToast, _setShowSavedToast] = useState(false);

    // Attachments state
    const [attachments, setAttachments] = useState([]); // [{ name, url }]

    // Security / Player / Thumbnail settings
    const [securitySettings, setSecuritySettings] = useState({ enableDRM: false, disableScreenCapture: false, watermarkText: '' });
    const [playerSettings, setPlayerSettings] = useState({ autoplay: false, showControls: true, loop: false, muted: false });
    const [thumbnailUrl, setThumbnailUrl] = useState('');

    // Quiz states
    const [quizData, setQuizData] = useState({ passingScore: 80, questions: [] });
    const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);
    const [currentQuestion, setCurrentQuestion] = useState({ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '' });
    const [showQuestionForm, setShowQuestionForm] = useState(false);

    // Quiz Helper Functions
    const handleAddOption = () => {
        setCurrentQuestion({ ...currentQuestion, options: [...currentQuestion.options, ''] });
    };

    const handleRemoveOption = (idx) => {
        if (currentQuestion.options.length <= 2) {
            alert("A question must have at least 2 options.");
            return;
        }
        const newOptions = currentQuestion.options.filter((_, i) => i !== idx);
        let newCorrect = currentQuestion.correctAnswerIndex;
        if (newCorrect === idx) newCorrect = 0;
        else if (newCorrect > idx) newCorrect -= 1;
        setCurrentQuestion({ ...currentQuestion, options: newOptions, correctAnswerIndex: newCorrect });
    };

    const handleSaveQuestion = () => {
        if (!currentQuestion.questionText.trim()) return alert("Question text is required.");
        if (currentQuestion.options.some(opt => !opt.trim())) return alert("All options must have text.");

        let newQuestions = [...quizData.questions];
        if (editingQuestionIndex >= 0) {
            newQuestions[editingQuestionIndex] = currentQuestion;
        } else {
            newQuestions.push(currentQuestion);
        }

        setQuizData({ ...quizData, questions: newQuestions });
        setShowQuestionForm(false);
        setEditingQuestionIndex(-1);
        setCurrentQuestion({ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '' });
    };

    const handleEditQuestion = (index) => {
        setCurrentQuestion(quizData.questions[index]);
        setEditingQuestionIndex(index);
        setShowQuestionForm(true);
    };

    const handleDeleteQuestion = (index) => {
        if (!window.confirm("Delete this question?")) return;
        const newQuestions = quizData.questions.filter((_, i) => i !== index);
        setQuizData({ ...quizData, questions: newQuestions });
    };

    const downloadExcelTemplate = () => {
        const headers = ["Question Text", "Option 1", "Option 2", "Option 3", "Option 4", "Correct Answer (1-4)", "Explanation"];
        const sampleRow = ["What is the capital of France?", "London", "Berlin", "Paris", "Madrid", 3, "Paris is the capital and most populous city of France."];

        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

        // Auto-size columns to be more readable
        const colWidths = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 50 }];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Quiz Template");
        XLSX.writeFile(wb, "quiz_template.xlsx");
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Convert sheet to JSON array, using headers mapping
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                // Skip the header row (index 0)
                if (data.length <= 1) {
                    alert('No valid questions found in the Excel file. Please check the template.');
                    e.target.value = '';
                    return;
                }

                const parsedQuestions = [];
                let errors = 0;

                for (let i = 1; i < data.length; i++) {
                    const row = data[i];

                    // Skip completely empty rows
                    if (row.length === 0 || row.every(val => !val)) continue;

                    const qText = row[0] || '';
                    const o1 = row[1] ? String(row[1]) : '';
                    const o2 = row[2] ? String(row[2]) : '';
                    const o3 = row[3] ? String(row[3]) : '';
                    const o4 = row[4] ? String(row[4]) : '';
                    const correctRaw = parseInt(row[5]) || 1;
                    const explanation = row[6] || '';

                    if (!qText || !o1 || !o2) {
                        errors++;
                        continue;
                    }

                    // Convert human 1,2,3,4 to array 0,1,2,3
                    const correctIndex = Math.max(0, Math.min(3, correctRaw - 1));
                    const options = [o1, o2, o3, o4].filter(o => o.trim() !== '');

                    if (options.length >= 2) {
                        parsedQuestions.push({
                            questionText: qText,
                            options: options,
                            correctAnswerIndex: Math.min(correctIndex, options.length - 1),
                            explanation: explanation
                        });
                    } else {
                        errors++;
                    }
                }

                if (parsedQuestions.length > 0) {
                    setQuizData(prev => ({
                        ...prev,
                        questions: [...prev.questions, ...parsedQuestions]
                    }));
                    if (errors > 0) {
                        alert(`Successfully imported ${parsedQuestions.length} questions. Skipped ${errors} invalid rows.`);
                    } else {
                        alert(`Successfully imported ${parsedQuestions.length} questions!`);
                    }
                } else {
                    alert('No valid questions found in the Excel file after checking rows.');
                }

            } catch (error) {
                alert('Error parsing Excel file: ' + error.message);
            }
            // Clear file input
            e.target.value = '';
        };

        reader.readAsBinaryString(file);
    };

    // Revert "Saved" to "Save" if the user makes any edits.
    // `saved` is deliberately NOT a dependency: including it would run this on
    // the save itself and clear the indicator before the user ever sees it.
    useEffect(() => {
        if (saved) {
            setSaved(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lesson, isFree, allowDownload, quizData]);

    const handleBunnyUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post('/admin/lessons/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (evt) => { if (evt.total) setUploadProgress(Math.round((evt.loaded * 100) / evt.total)); }
            });
            // Stored on Bunny Storage → served as a direct file, played via the HTML5 player
            setLesson({ ...lesson, videoSource: 'generic', videoUrl: data.url, videoId: '', libraryId: '' });
        } catch (err) {
            console.error('Video upload error:', err);
            alert(err.response?.data?.message || 'Failed to upload video.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                title: lesson.title,
                type: lessonType,
                isFree,
                allowDownload,
                isPublished,
                thumbnailUrl,
                securitySettings,
                playerSettings,
                attachments,
            };

            if (lessonType === 'video') {
                payload.videoSource = lesson.videoSource;
                payload.videoId = lesson.videoId;
                payload.videoUrl = lesson.videoUrl;
                payload.libraryId = lesson.libraryId;
                payload.vdocipherStatus = lesson.vdocipherStatus || 'pre-upload';
            } else if (lessonType === 'pdf') {
                payload.pdfUrl = lesson.pdfUrl;
            }

            await api.put(`/admin/lessons/${lessonId}`, payload);

            if (lessonType === 'quiz') {
                await api.post(`/admin/lessons/${lessonId}/quiz`, {
                    passingScore: quizData.passingScore,
                    questions: quizData.questions
                });
            }

            setSaved(true);
            // Navigate immediately — toast will show on the builder page
            navigate(`/courses/${courseId}`, { state: { lessonSaved: true } });
        } catch (err) {
            console.error('Failed to save lesson:', err);
            alert('Failed to save lesson.');
        } finally {
            setSaving(false);
        }
    };

    const handleVdoCipherUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            // 1. Get credentials from our backend (which calls dev.vdocipher.com/api/videos)
            const { data } = await api.post('/vdocipher/upload-credentials', { title: lesson.title || file.name });
            const { clientPayload, videoId } = data;

            if (!clientPayload) throw new Error("No clientPayload returned from VdoCipher");

            // 2. Upload to VdoCipher (AWS S3) using multipart/form-data
            const formData = new FormData();

            // Append all fields from the policy
            for (const key in clientPayload) {
                if (key !== 'uploadLink') { // Exclude the URL itself
                    formData.append(key, clientPayload[key]);
                }
            }

            // Add the file (MUST be the last element appended)
            formData.append('success_action_status', '201');
            formData.append('success_action_redirect', '');
            formData.append('file', file);

            // Upload using native axios (skips interceptors) to the secure S3 link
            await axios.post(clientPayload.uploadLink, formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            // 3. Set the video ID in form state and mark as queued/processing
            setLesson({ ...lesson, videoSource: 'vdocipher', videoId: videoId, videoUrl: '', vdocipherStatus: 'queued' });
        } catch (err) {
            console.error('Upload error:', err?.response?.data || err);
            alert('Failed to upload video to VdoCipher.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    useEffect(() => {
        const fetchContext = async () => {
            try {
                // Since there is no single-lesson GET endpoint right now, we can fetch all courses and find it, or wait... wait, we don't have a single lesson endpoint?
                // For UI purposes, we just extract what we need from course modules.
                const res = await api.get(`/admin/courses/${courseId}`);
                let foundLesson = null;
                for (const m of res.data.modules) {
                    const match = m.lessons.find(l => l._id === lessonId);
                    if (match) { foundLesson = match; break; }
                }
                setLesson(foundLesson || { title: 'New Lesson', videoUrl: '', vdocipherStatus: 'pre-upload' });
                if (foundLesson) {
                    const savedType = foundLesson.type || (foundLesson.pdfUrl ? 'pdf' : 'video');
                    setLessonType(savedType);
                    setActiveTab(savedType);

                    setIsFree(foundLesson.isFree || false);
                    setAllowDownload(foundLesson.allowDownload || false);
                    setIsPublished(foundLesson.isPublished !== false);
                    setThumbnailUrl(foundLesson.thumbnailUrl || '');
                    if (foundLesson.securitySettings) setSecuritySettings(foundLesson.securitySettings);
                    if (foundLesson.playerSettings) setPlayerSettings(foundLesson.playerSettings);
                    if (foundLesson.attachments) setAttachments(foundLesson.attachments);

                    if (savedType === 'quiz') {
                        try {
                            const quizRes = await api.get(`/admin/lessons/${lessonId}/quiz`);
                            if (quizRes.data) {
                                setQuizData({ passingScore: quizRes.data.passingScore, questions: quizRes.data.questions || [] });
                            }
                        } catch {
                            console.log("No quiz data found yet");
                        }
                    }
                }
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLesson({ title: 'New Lesson', videoUrl: '', vdocipherStatus: 'pre-upload' });
                setLoading(false);
            }
        };
        fetchContext();
    }, [courseId, lessonId]);

    // Polling Vdocipher Status
    useEffect(() => {
        let intervalId;

        const checkStatus = async () => {
            if (!lesson?.videoId || lesson.videoSource !== 'vdocipher') return;
            if (lesson.vdocipherStatus === 'ready') return; // Stop polling if already ready

            try {
                const { data } = await api.get(`/vdocipher/status/${lesson.videoId}`);
                const currentStatus = data.status; // e.g., 'pre-upload', 'queued', 'ready'

                if (currentStatus !== lesson.vdocipherStatus) {
                    setLesson(prev => ({ ...prev, vdocipherStatus: currentStatus }));
                    // Optional: If you want it to auto-save to DB when it flips to ready
                    // await api.put(`/admin/lessons/${lessonId}`, { ...lesson, vdocipherStatus: currentStatus });
                }
            } catch (err) {
                console.error("Failed to check VdoCipher status", err);
            }
        };

        // Poll every 5 seconds if we have a video ID but it's not ready or deleted
        if (lesson?.videoId && lesson?.videoSource === 'vdocipher' && lesson?.vdocipherStatus !== 'ready' && lesson?.vdocipherStatus !== 'deleted') {
            intervalId = setInterval(checkStatus, 5000);
            checkStatus(); // Initial check
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [lesson?.videoId, lesson?.vdocipherStatus, lesson?.videoSource, lessonId]);

    if (loading) return <div className="p-10 text-center text-slate-500 font-medium">Loading Lesson Editor...</div>;

    const tabs = [
        { id: lessonType, label: lessonType === 'pdf' ? 'PDF Document' : (lessonType === 'quiz' ? 'Quiz Builder' : 'Video') },
        { id: 'security', label: 'Security' },
        { id: 'thumbnails', label: 'Thumbnails' },
        { id: 'player', label: 'Player Options' },
    ];

    return (
        <div className="bg-slate-50 min-h-screen text-slate-800 font-sans pb-20">
            {/* ── Top Navigation Bar ── */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                    {/* Left: breadcrumb */}
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 min-w-0">
                        <button
                            onClick={() => navigate(`/courses/${courseId}`)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex-shrink-0"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <span className="hidden sm:inline text-slate-400 hover:text-slate-700 cursor-pointer truncate max-w-[120px]" onClick={() => navigate(`/courses/${courseId}`)}>
                            Course Builder
                        </span>
                        <span className="hidden sm:inline text-slate-300">/</span>
                        <span className="text-slate-700 font-bold truncate max-w-[160px] sm:max-w-xs">{lesson.title}</span>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                       
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm shadow-sm disabled:opacity-50"
                        >
                            {saving ? (
                                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                            ) : (
                                <><CheckCircle size={15} /> Save & Back</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Lesson Header Card ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Lesson type icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        lessonType === 'quiz' ? 'bg-purple-100' :
                        lessonType === 'pdf'  ? 'bg-red-100' :
                        'bg-indigo-100'
                    }`}>
                        {lessonType === 'quiz' ? <HelpCircle size={22} className="text-purple-600" /> :
                         lessonType === 'pdf'  ? <FileText size={22} className="text-red-500" /> :
                         <PlayCircle size={22} className="text-indigo-600" />}
                    </div>

                    {/* Editable title */}
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            value={lesson.title}
                            onChange={e => setLesson({ ...lesson, title: e.target.value })}
                            className="w-full text-xl sm:text-2xl font-black text-slate-900 bg-transparent border-0 border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none transition-colors pb-0.5"
                            placeholder="Lesson title..."
                        />
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wide ${
                                lessonType === 'quiz' ? 'bg-purple-100 text-purple-700' :
                                lessonType === 'pdf'  ? 'bg-red-100 text-red-600' :
                                'bg-indigo-100 text-indigo-700'
                            }`}>
                                {lessonType === 'quiz' ? 'Quiz' : lessonType === 'pdf' ? 'PDF' : 'Video'}
                            </span>
                            <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wide ${
                                isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {isPublished ? 'Published' : 'Draft'}
                            </span>
                            {isFree && (
                                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wide bg-amber-100 text-amber-700">
                                    Free
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick toggles — Publish + Allow Download */}
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setIsPublished(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                isPublished
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            {isPublished ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            {isPublished ? 'Published' : 'Draft'}
                        </button>
                        <button
                            onClick={() => setAllowDownload(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                allowDownload
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            {allowDownload ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            Allow Download
                        </button>
                    </div>
                </div>
            </div>

            {/* Saved toast */}
            {showSavedToast && (
                <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2">
                    <CheckCircle size={16} /> Lesson saved!
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 gap-6">
                <div className="animate-fade-in">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 mb-6 overflow-x-auto gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 sm:px-6 py-2.5 font-bold text-[13px] whitespace-nowrap transition-colors border-b-2 rounded-t-lg ${
                                    activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Video Source Configuration Section */}
                    {activeTab === 'video' && (
                        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-2 duration-300">

                            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center">
                                <MonitorPlay className="mr-3 text-indigo-600" size={24} /> Video Source Configuration
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Video Provider</label>
                                    <select
                                        className="w-full sm:w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium text-slate-700 transition-all"
                                        value={lesson.videoSource || 'youtube'}
                                        onChange={(e) => setLesson({ ...lesson, videoSource: e.target.value })}
                                    >
                                        <option value="vdocipher">VdoCipher (Secure DRM)</option>
                                        <option value="bunny">Bunny.net (Upload from device)</option>
                                        <option value="youtube">YouTube</option>
                                        <option value="generic">Direct URL / Upload (HTML5)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        {lesson.videoSource === 'vdocipher' ? 'Upload to VdoCipher' :
                                            lesson.videoSource === 'bunny' ? 'Bunny.net Configuration' :
                                            lesson.videoSource === 'youtube' ? 'YouTube URL or Video ID' :
                                                'Direct Video URL (.mp4)'}
                                    </label>

                                    {lesson.videoSource === 'vdocipher' ? (
                                        <div className="space-y-4">
                                            {/* Dropzone / Upload Button */}
                                            {!lesson.videoId && !uploading && (
                                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center relative bg-slate-50">
                                                    <input
                                                        type="file"
                                                        accept="video/*"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                        onChange={handleVdoCipherUpload}
                                                        disabled={uploading}
                                                    />
                                                    <Cloud className="text-indigo-400 mb-3" size={32} />
                                                    <p className="font-bold text-slate-700">Click or drag a video file here to upload</p>
                                                    <p className="text-xs text-slate-500 mt-1">Files are securely uploaded directly to VdoCipher.</p>
                                                </div>
                                            )}

                                            {/* Progress Bar */}
                                            {uploading && (
                                                <div className="w-full">
                                                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                                                        <span>Uploading Video...</span>
                                                        <span>{uploadProgress}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                                                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Generated ID Readout */}
                                            {lesson.videoId && !uploading && (
                                                <div className="space-y-3">
                                                    <div className={`p-4 border rounded-xl flex items-center justify-between transition-colors ${lesson.vdocipherStatus === 'ready' ? 'bg-emerald-50 border-emerald-200' :
                                                        lesson.vdocipherStatus === 'deleted' ? 'bg-red-50 border-red-200' :
                                                            'bg-orange-50 border-orange-200'
                                                        }`}>
                                                        <div>
                                                            <div className="flex items-center space-x-2 mb-1">
                                                                {lesson.vdocipherStatus === 'ready' ? (
                                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded">Ready</span>
                                                                ) : lesson.vdocipherStatus === 'deleted' ? (
                                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded">Deleted</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-[10px] font-bold uppercase tracking-wider rounded animate-pulse">Processing</span>
                                                                )}
                                                                <p className={`text-xs font-bold uppercase tracking-widest ${lesson.vdocipherStatus === 'ready' ? 'text-emerald-800' :
                                                                    lesson.vdocipherStatus === 'deleted' ? 'text-red-800' :
                                                                        'text-orange-800'
                                                                    }`}>
                                                                    {lesson.vdocipherStatus === 'ready' ? 'VdoCipher ID Attached' :
                                                                        lesson.vdocipherStatus === 'deleted' ? 'Video Missing in VdoCipher' :
                                                                            'Encoding on VdoCipher'}
                                                                </p>
                                                            </div>
                                                            <p className={`font-mono font-medium text-sm ${lesson.vdocipherStatus === 'ready' ? 'text-emerald-900' :
                                                                lesson.vdocipherStatus === 'deleted' ? 'text-red-900 line-through opacity-50' :
                                                                    'text-orange-900'
                                                                }`}>{lesson.videoId}</p>
                                                        </div>
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-4 ${lesson.vdocipherStatus === 'ready' ? 'bg-emerald-100' :
                                                            lesson.vdocipherStatus === 'deleted' ? 'bg-red-100' :
                                                                'bg-orange-100'
                                                            }`}>
                                                            <Eye size={16} className={
                                                                lesson.vdocipherStatus === 'ready' ? 'text-emerald-600' :
                                                                    lesson.vdocipherStatus === 'deleted' ? 'text-red-600' :
                                                                        'text-orange-600'
                                                            } />
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={(() => setShowDeleteConfirm(true))}
                                                            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors"
                                                        >
                                                            Remove / Replace Video
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Fallback Manual Input */}
                                            {!lesson.videoId && !uploading && (
                                                <div className="mt-4 border-t border-slate-100 pt-4">
                                                    <label className="text-xs font-bold text-slate-500 mb-2 block">Or paste an existing VdoCipher ID:</label>
                                                    <input
                                                        type="text"
                                                        className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium text-slate-700 transition-all"
                                                        placeholder="e.g. 1a2b3c4d5e6f7g8h"
                                                        value={lesson.videoId || ''}
                                                        onChange={(e) => setLesson({ ...lesson, videoId: e.target.value, videoUrl: '' })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : lesson.videoSource === 'bunny' ? (
                                        /* Bunny.net Stream Upload experience */
                                        <div className="space-y-4">
                                            {/* Dropzone / Upload Button */}
                                            {!lesson.videoId && !uploading && (
                                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center relative bg-slate-50">
                                                    <input
                                                        type="file"
                                                        accept="video/*"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                        onChange={handleBunnyUpload}
                                                        disabled={uploading}
                                                    />
                                                    <UploadCloud className="text-indigo-400 mb-3" size={32} />
                                                    <p className="font-bold text-slate-700">Click or drag a video file here to upload</p>
                                                    <p className="text-xs text-slate-500 mt-1">Uploaded to your Bunny Storage and played via HTML5.</p>
                                                </div>
                                            )}

                                            {/* Progress Bar */}
                                            {uploading && (
                                                <div className="w-full">
                                                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                                                        <span>Uploading to Bunny.net...</span>
                                                        <span>{uploadProgress}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                                                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ID Readout & Manual Override */}
                                            {lesson.videoId && !uploading && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                                                    <div>
                                                        <label className="text-xs font-bold text-emerald-700 mb-2 block uppercase tracking-wider">Bunny Video ID</label>
                                                        <input
                                                            type="text"
                                                            className="w-full p-3 text-sm bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-medium"
                                                            value={lesson.videoId || ''}
                                                            onChange={(e) => setLesson({ ...lesson, videoId: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-emerald-700 mb-2 block uppercase tracking-wider">Video Library ID</label>
                                                        <input
                                                            type="text"
                                                            className="w-full p-3 text-sm bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                                                            value={lesson.libraryId || ''}
                                                            onChange={(e) => setLesson({ ...lesson, libraryId: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="col-span-full flex justify-end">
                                                        <button
                                                            onClick={(() => setShowDeleteConfirm(true))}
                                                            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors"
                                                        >
                                                            Remove / Replace Video
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {(!lesson.videoSource || lesson.videoSource === 'generic') && (
                                                <div className="mb-4">
                                                    {!lesson.videoUrl && !uploading && (
                                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center relative bg-slate-50">
                                                            <input
                                                                type="file"
                                                                accept="video/*"
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                                onChange={handleBunnyUpload}
                                                                disabled={uploading}
                                                            />
                                                            <UploadCloud className="text-indigo-400 mb-3" size={32} />
                                                            <p className="font-bold text-slate-700">Click or drag a video file here to upload</p>
                                                            <p className="text-xs text-slate-500 mt-1">Uploaded to your Bunny Storage and played via HTML5.</p>
                                                        </div>
                                                    )}
                                                    {uploading && (
                                                        <div className="w-full">
                                                            <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                                                                <span>Uploading...</span><span>{uploadProgress}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                                                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <p className="text-xs font-semibold text-slate-400 mt-3">or paste a direct video URL</p>
                                                </div>
                                            )}
                                            <input
                                                type="text"
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium text-slate-700 transition-all"
                                                placeholder={
                                                    lesson.videoSource === 'youtube' ? 'e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ' :
                                                        'e.g. https://s3.amazonaws.com/bucket/video.mp4'
                                                }
                                                value={lesson.videoId || lesson.videoUrl || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (lesson.videoSource === 'generic' || (lesson.videoSource === 'youtube' && val.includes('http'))) {
                                                        setLesson({ ...lesson, videoUrl: val, videoId: '' });
                                                    } else {
                                                        setLesson({ ...lesson, videoId: val, videoUrl: '' });
                                                    }
                                                }}
                                            />
                                            <p className="text-xs text-slate-500 mt-2 font-medium">
                                                {lesson.videoSource === 'youtube' && 'You can paste the full URL or just the 11-character video ID.'}
                                                {(!lesson.videoSource || lesson.videoSource === 'generic') && 'Provide a direct link to a supported video format.'}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PDF Configuration Section */}
                    {activeTab === 'pdf' && (
                        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center">
                                <FileText className="mr-3 text-red-500" size={24} /> PDF Document Configuration
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Upload PDF File</label>

                                    {/* Upload Dropzone */}
                                    {!lesson.pdfUrl && !uploading && (
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-red-400 hover:bg-red-50/30 transition-all flex flex-col items-center justify-center relative bg-slate-50 mb-4">
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    setUploading(true);
                                                    setUploadProgress(0);

                                                    try {
                                                        const formData = new FormData();
                                                        formData.append('file', file);
                                                        const res = await api.post('/admin/lessons/upload', formData, {
                                                            headers: { 'Content-Type': 'multipart/form-data' },
                                                            onUploadProgress: (progressEvent) => {
                                                                if (progressEvent.total) setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                                                            }
                                                        });

                                                        setLesson({ ...lesson, pdfUrl: res.data.url });
                                                    } catch (err) {
                                                        console.error('PDF upload error:', err);
                                                        alert(err.response?.data?.message || 'Failed to upload PDF.');
                                                    } finally {
                                                        setUploading(false);
                                                        setUploadProgress(0);
                                                    }
                                                }}
                                                disabled={uploading}
                                            />
                                            <Cloud className="text-red-400 mb-3" size={32} />
                                            <p className="font-bold text-slate-700">Click or drag a PDF file here to upload</p>
                                            <p className="text-xs text-slate-500 mt-1">Files are securely uploaded to your cloud storage.</p>
                                        </div>
                                    )}

                                    {/* Upload Progress */}
                                    {uploading && (
                                        <div className="w-full mb-4">
                                            <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                                                <span>Uploading PDF...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                                <div className="bg-red-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Existing / Uploaded PDF URL Input */}
                                    <label className="text-xs font-bold text-slate-500 mb-2 block">
                                        {lesson.pdfUrl ? 'Uploaded PDF URL:' : 'Or paste an existing PDF URL:'}
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="url"
                                            className={`w-full p-4 border rounded-xl outline-none font-medium transition-all text-sm ${lesson.pdfUrl ? 'bg-red-50 border-red-200 text-red-900 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'bg-white border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                                                }`}
                                            placeholder="e.g. https://s3.amazonaws.com/bucket/document.pdf"
                                            value={lesson.pdfUrl || ''}
                                            onChange={(e) => setLesson({ ...lesson, pdfUrl: e.target.value })}
                                        />
                                        {lesson.pdfUrl && (
                                            <button
                                                onClick={() => setLesson({ ...lesson, pdfUrl: '' })}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors text-xs whitespace-nowrap"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 font-medium">
                                        Provide a direct, publicly accessible link to a PDF document, or upload one above.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quiz Builder Configuration Section */}
                    {activeTab === 'quiz' && (
                        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-800 flex items-center">
                                    <HelpCircle className="mr-3 text-emerald-500" size={24} /> Quiz Builder
                                </h3>
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm font-bold text-slate-700">Passing Score (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-20 p-2 text-center bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                        value={quizData.passingScore}
                                        onChange={(e) => setQuizData({ ...quizData, passingScore: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            {!showQuestionForm ? (
                                <div className="space-y-6">
                                    {quizData.questions.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                            <p className="font-bold text-slate-500 mb-4">No questions added yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {quizData.questions.map((q, idx) => (
                                                <div key={idx} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors bg-white group relative">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-black text-slate-400 mr-3">Q{idx + 1}.</span>
                                                        <h4 className="font-bold text-slate-800 flex-1">{q.questionText}</h4>
                                                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEditQuestion(idx)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg">
                                                                <Eye size={16} />
                                                            </button>
                                                            <button onClick={() => handleDeleteQuestion(idx)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="pl-8 grid grid-cols-2 gap-2 mt-3">
                                                        {q.options.map((opt, oIdx) => (
                                                            <div key={oIdx} className={`text-sm py-1.5 px-3 rounded-lg border flex items-center ${q.correctAnswerIndex === oIdx ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                                                {q.correctAnswerIndex === oIdx && <CheckCircle size={14} className="mr-2 text-emerald-500" />}
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setShowQuestionForm(true)}
                                            className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 rounded-xl font-bold flex items-center justify-center transition-colors shadow-sm"
                                        >
                                            <Plus size={20} className="mr-2" /> Add New Question
                                        </button>

                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                onChange={handleExcelUpload}
                                            />
                                            <div className="w-full h-full py-4 border-2 border-dashed border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-400 rounded-xl font-bold flex items-center justify-center transition-colors shadow-sm cursor-pointer pointer-events-none">
                                                <FileSpreadsheet size={20} className="mr-2" /> Bulk Import Excel
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={downloadExcelTemplate}
                                            className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center transition-colors"
                                        >
                                            <DownloadIcon size={14} className="mr-1" /> Download Excel Template
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-800 text-lg">
                                            {editingQuestionIndex >= 0 ? `Edit Question ${editingQuestionIndex + 1}` : 'New Question'}
                                        </h4>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Question Text</label>
                                        <textarea
                                            className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                                            rows="2"
                                            placeholder="What is..."
                                            value={currentQuestion.questionText}
                                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, questionText: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-4">Answers (Select the correct one)</label>
                                        <div className="space-y-3">
                                            {currentQuestion.options.map((opt, idx) => (
                                                <div key={idx} className={`flex items-center p-2 rounded-xl border ${currentQuestion.correctAnswerIndex === idx ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                                                    <input
                                                        type="radio"
                                                        name="correctAnswer"
                                                        checked={currentQuestion.correctAnswerIndex === idx}
                                                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswerIndex: idx })}
                                                        className="w-5 h-5 mx-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        className="flex-1 bg-transparent outline-none font-medium text-slate-700"
                                                        placeholder={`Option ${idx + 1}`}
                                                        value={opt}
                                                        onChange={(e) => {
                                                            let newOpts = [...currentQuestion.options];
                                                            newOpts[idx] = e.target.value;
                                                            setCurrentQuestion({ ...currentQuestion, options: newOpts });
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveOption(idx)}
                                                        className="p-2 text-slate-400 hover:text-red-500 mx-2"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleAddOption}
                                            className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
                                        >
                                            <Plus size={16} className="mr-1" /> Add Option
                                        </button>
                                    </div>

                                    <div className="pt-4 mt-6 border-t border-slate-200 flex justify-end space-x-3">
                                        <button
                                            onClick={() => {
                                                setShowQuestionForm(false);
                                                setEditingQuestionIndex(-1);
                                                setCurrentQuestion({ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '' });
                                            }}
                                            className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveQuestion}
                                            className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                                        >
                                            Save Question
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xl font-black text-slate-800">Security Settings</h3>
                            <div className="flex justify-between items-center py-4 border-b border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800">Enable DRM Protection</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Prevent unauthorized copying of video content</p>
                                </div>
                                <button onClick={() => setSecuritySettings(p => ({ ...p, enableDRM: !p.enableDRM }))}>
                                    {securitySettings.enableDRM ? <ToggleRight size={36} className="text-emerald-500" strokeWidth={1.5} /> : <ToggleLeft size={36} className="text-slate-300" strokeWidth={1.5} />}
                                </button>
                            </div>
                            <div className="flex justify-between items-center py-4 border-b border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800">Disable Screen Capture</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Block screenshots and screen recording</p>
                                </div>
                                <button onClick={() => setSecuritySettings(p => ({ ...p, disableScreenCapture: !p.disableScreenCapture }))}>
                                    {securitySettings.disableScreenCapture ? <ToggleRight size={36} className="text-emerald-500" strokeWidth={1.5} /> : <ToggleLeft size={36} className="text-slate-300" strokeWidth={1.5} />}
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Watermark Text (optional)</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                                    placeholder="e.g. YATICORP or user email"
                                    value={securitySettings.watermarkText}
                                    onChange={e => setSecuritySettings(p => ({ ...p, watermarkText: e.target.value }))}
                                />
                                <p className="text-xs text-slate-400 mt-1">Displayed as an overlay on the video player.</p>
                            </div>
                        </div>
                    )}

                    {/* Thumbnails Tab */}
                    {activeTab === 'thumbnails' && (
                        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xl font-black text-slate-800">Lesson Thumbnail</h3>
                            {thumbnailUrl && (
                                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                                    <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-48 object-cover" />
                                    <button
                                        onClick={() => setThumbnailUrl('')}
                                        className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg"
                                    >Remove</button>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Thumbnail URL</label>
                                <input
                                    type="url"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                                    placeholder="https://example.com/thumbnail.jpg"
                                    value={thumbnailUrl}
                                    onChange={e => setThumbnailUrl(e.target.value)}
                                />
                            </div>
                            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center bg-slate-50">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                            const fd = new FormData();
                                            fd.append('image', file);
                                            const res = await api.post('/admin/courses/thumbnail', fd, {
                                                headers: { 'Content-Type': 'multipart/form-data' }
                                            });
                                            setThumbnailUrl(res.data.url);
                                        } catch (err) {
                                            alert(err.response?.data?.message || 'Failed to upload thumbnail.');
                                        }
                                    }}
                                />
                                <UploadCloud className="text-indigo-400 mb-2" size={28} />
                                <p className="font-bold text-slate-700 text-sm">Click or drag an image to upload</p>
                                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP recommended</p>
                            </div>
                        </div>
                    )}

                    {/* Player Options Tab */}
                    {activeTab === 'player' && (
                        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xl font-black text-slate-800">Player Options</h3>
                            {[
                                { key: 'autoplay', label: 'Autoplay', desc: 'Start playing automatically when opened' },
                                { key: 'showControls', label: 'Show Controls', desc: 'Display play/pause, volume, and seek bar' },
                                { key: 'loop', label: 'Loop Video', desc: 'Replay automatically when finished' },
                                { key: 'muted', label: 'Start Muted', desc: 'Begin playback with audio muted' },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="flex justify-between items-center py-4 border-b border-slate-100 last:border-0">
                                    <div>
                                        <p className="font-bold text-slate-800">{label}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                    </div>
                                    <button onClick={() => setPlayerSettings(p => ({ ...p, [key]: !p[key] }))}>
                                        {playerSettings[key] ? <ToggleRight size={36} className="text-emerald-500" strokeWidth={1.5} /> : <ToggleLeft size={36} className="text-slate-300" strokeWidth={1.5} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Sidebar removed — toggles moved to header */}
            </div>

            {/* Custom Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Video?</h3>
                            <p className="text-slate-600 font-medium">
                                Are you sure you want to permanently remove and physically delete this video from VdoCipher? This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setShowDeleteConfirm(false);
                                    if (lesson.videoId && lesson.videoSource === 'vdocipher' && lesson.vdocipherStatus !== 'deleted') {
                                        try {
                                            await api.delete(`/vdocipher/video/${lesson.videoId}`);
                                        } catch (e) {
                                            console.error("Could not delete from vdocipher", e);
                                        }
                                    }
                                    setLesson({ ...lesson, videoId: '', vdocipherStatus: 'pre-upload' });
                                }}
                                className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                            >
                                Yes, Delete Video
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default LessonEditor;