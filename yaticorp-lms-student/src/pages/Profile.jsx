import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import Cropper from 'react-easy-crop';
import { User, CreditCard, Mail, Phone, Award, Download, Loader2, Edit2, Check, X, Camera, ZoomIn, ZoomOut, Compass, Zap, ArrowRight } from 'lucide-react';

// Helper: convert crop area to a cropped blob
const getCroppedBlob = (imageSrc, pixelCrop) =>
    new Promise((resolve) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
            canvas.toBlob(resolve, 'image/jpeg', 0.92);
        };
    });

const Profile = () => {
    const { user, setUser, isCareerPathEnabled } = useContext(AuthContext);
    const [certificates, setCertificates] = useState([]);
    // Career Path standing. Fetched here so the profile shows one student rather
    // than two: credits are earned in courses, XP and levels in Career Path, and
    // until now neither page mentioned the other's existence.
    const [career, setCareer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [certError, setCertError] = useState(null);

    // Edit mode
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Profile picture
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const photoInputRef = useRef(null);

    // Photo viewer
    const [viewingPhoto, setViewingPhoto] = useState(false);

    // Crop modal
    const [cropSrc, setCropSrc] = useState(null);       // raw data URL of selected image
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

    useEffect(() => {
        const fetchCertificates = async () => {
            try {
                api.get('/user/profile')
                    .then(r => setCareer(r.data?.user || null))
                    .catch(() => setCareer(null));
                const res = await api.get('/certificates');
                setCertificates(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCertificates();
    }, []);

    const openEdit = () => {
        setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
        setFormErrors({});
        setSaveSuccess(false);
        setEditing(true);
    };

    const validate = () => {
        const errors = {};
        if (!form.name.trim()) errors.name = 'Name is required';
        else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
        else if (form.name.trim().length > 60) errors.name = 'Name must be 60 characters or less';

        if (!form.email.trim()) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address (e.g. name@domain.com)';

        if (!form.phone.trim()) errors.phone = 'Phone number is required';
        else {
            // Strip all non-digit characters to count digits
            const digits = form.phone.replace(/\D/g, '');
            if (digits.length < 7 || digits.length > 15) errors.phone = 'Phone must be 7–15 digits (international format supported, e.g. +91 98765 43210)';
        }

        return errors;
    };

    const handleSave = async () => {
        const errors = validate();
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
        setSaving(true);
        try {
            const res = await api.put('/user/profile', {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
            });
            const updated = { ...user, ...res.data };
            setUser(updated);
            localStorage.setItem('studentData', JSON.stringify(updated));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            setEditing(false);
        } catch (err) {
            setFormErrors({ api: err.response?.data?.message || 'Failed to save. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    // Step 1: user picks a file → open crop modal
    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
        if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10MB.'); return; }
        const reader = new FileReader();
        reader.onload = () => { setCropSrc(reader.result); setCrop({ x: 0, y: 0 }); setZoom(1); };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Step 2: user confirms crop → send cropped blob to backend → Cloudinary → MongoDB
    const handleCropConfirm = async () => {
        if (!croppedAreaPixels || !cropSrc) return;
        setUploadingPhoto(true);
        setCropSrc(null);
        try {
            const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
            const fd = new FormData();
            fd.append('profilePicture', blob, 'profile.jpg');
            // POST to our backend — it uploads to Cloudinary and saves URL to MongoDB
            const res = await api.post('/user/profile/picture', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const profilePicture = res.data.profilePicture;
            const updated = { ...user, profilePicture };
            setUser(updated);
            localStorage.setItem('studentData', JSON.stringify(updated));
        } catch {
            alert('Failed to upload photo. Please try again.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleDownloadCertificate = async (cert) => {
        setDownloadingId(cert._id);
        setCertError(null);
        try {
            const res = await api.post(
                '/certificates/generate',
                { courseId: cert.courseId?._id || cert.courseId },
                { responseType: 'blob' }
            );
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Certificate_${(cert.courseId?.title || 'Course').replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            setCertError('Failed to download certificate. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const getInitials = (name = '') =>
        name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    return (
        <div className="space-y-8 animate-fade-in relative z-0 max-w-4xl mx-auto">
            {/* Floating success toast */}
            {saveSuccess && (
                <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2">
                    <Check size={16} /> Profile updated successfully!
                </div>
            )}
            {/* Profile Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                    {/* Avatar with upload */}
                    <div className="relative flex-shrink-0">
                        <div
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-indigo-100 flex items-center justify-center cursor-pointer"
                            onClick={() => user?.profilePicture && setViewingPhoto(true)}
                            title={user?.profilePicture ? 'Click to view photo' : ''}
                        >
                            {user?.profilePicture ? (
                                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                            ) : (
                                <span className="text-3xl font-bold text-indigo-600">{getInitials(user?.name)}</span>
                            )}
                        </div>
                        {/* Camera button */}
                        <button
                            onClick={() => photoInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-60"
                            title="Change photo"
                        >
                            {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        </button>
                        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                    </div>

                    {/* Info / Edit form */}
                    <div className="flex-1 w-full text-center sm:text-left">
                        {!editing ? (
                            <>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{user?.name}</h1>
                                        <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-slate-500 text-sm">
                                            <CreditCard size={14} />
                                            <span>Student Card ID:</span>
                                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">{user?.cardNumber}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={openEdit}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm transition-colors self-center sm:self-start"
                                    >
                                        <Edit2 size={14} /> Edit Profile
                                    </button>
                                </div>

                                {saveSuccess && null}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3 text-slate-600 text-sm">
                                        <Mail size={15} className="text-slate-400 flex-shrink-0" />
                                        <span className="truncate">{user?.email || 'No email provided'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600 text-sm">
                                        <Phone size={15} className="text-slate-400 flex-shrink-0" />
                                        <span>{user?.phone || 'No phone provided'}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4 w-full">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="font-bold text-slate-800">Edit Profile</h2>
                                    <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                        <X size={18} />
                                    </button>
                                </div>

                                {formErrors.api && (
                                    <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{formErrors.api}</div>
                                )}

                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Full Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        maxLength={60}
                                        value={form.name}
                                        onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: '' })); }}
                                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${formErrors.name ? 'border-red-400' : 'border-slate-300'}`}
                                        placeholder="Your full name"
                                    />
                                    {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Email Address <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setFormErrors(p => ({ ...p, email: '' })); }}
                                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${formErrors.email ? 'border-red-400' : 'border-slate-300'}`}
                                        placeholder="you@example.com"
                                    />
                                    {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        maxLength={16}
                                        onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setFormErrors(p => ({ ...p, phone: '' })); }}
                                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${formErrors.phone ? 'border-red-400' : 'border-slate-300'}`}
                                        placeholder="+91 98765 43210"
                                    />
                                    {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                                </div>

                                {/* Card ID — read only */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Student Card ID <span className="text-slate-400 font-normal">(not editable)</span></label>
                                    <input
                                        type="text"
                                        value={user?.cardNumber || ''}
                                        readOnly
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
                                    />
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="flex-1 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Changes</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Two scores, one student.
                Credits come from course quizzes and are the LMS's own measure;
                XP and levels come from Career Path. Showing them side by side —
                and saying plainly what each is for — was the alternative to
                fusing them into one number, which would have let an unbounded
                source (a student can ask Career Path for more tasks whenever
                they like) inflate a figure the LMS treats as earned. */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Your progress</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><Award size={15} /></span>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credits</p>
                        </div>
                        <p className="text-3xl font-bold text-slate-800 tabular-nums">{user?.credits || 0}</p>
                        <p className="text-xs text-slate-500 mt-1">Earned from course quizzes, once per quiz.</p>
                    </div>

                    {/* Goes with the sidebar tab when an admin locks the
                        section — a card that links somewhere the student is
                        bounced straight back from is worse than no card. */}
                    {isCareerPathEnabled && (
                    <Link
                        to="/career"
                        className="group rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 transition-colors hover:border-indigo-300"
                    >
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Compass size={15} /></span>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Career Path</p>
                            <ArrowRight size={14} className="ml-auto text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                        </div>
                        <p className="text-3xl font-bold text-slate-800 tabular-nums">
                            Level {career?.level || 1}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Zap size={11} className="text-amber-500" />
                            {career?.xp || 0} XP from finishing your daily tasks.
                        </p>
                    </Link>
                    )}
                </div>
            </div>

            {/* Certificates */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg mr-3">
                        <Award size={20} />
                    </span>
                    My Certificates
                </h2>

                {loading ? (
                    <div className="flex justify-center p-8 text-slate-500">Loading records...</div>
                ) : certificates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {certError && (
                            <div className="col-span-full bg-red-50 text-red-600 border border-red-100 rounded-xl p-4 text-sm font-medium">
                                {certError}
                            </div>
                        )}
                        {certificates.map(cert => (
                            <div key={cert._id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all group">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 ring-8 ring-emerald-50 group-hover:scale-110 transition-transform">
                                    <Award size={32} />
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1">{cert.courseId?.title}</h3>
                                <p className="text-xs text-slate-500 mb-6">Issued on {new Date(cert.createdAt).toLocaleDateString()}</p>
                                <button
                                    onClick={() => handleDownloadCertificate(cert)}
                                    disabled={downloadingId === cert._id}
                                    className="w-full mt-auto flex items-center justify-center py-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 font-bold rounded-lg transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {downloadingId === cert._id ? (
                                        <><Loader2 size={16} className="mr-2 animate-spin" /> Downloading...</>
                                    ) : (
                                        <><Download size={16} className="mr-2" /> Download PDF</>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Award size={24} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">No certificates yet</h3>
                        <p className="text-slate-500 max-w-sm text-sm">
                            Complete your courses to earn certificates. They will appear here for you to download.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Photo Viewer Modal ── */}
            {viewingPhoto && user?.profilePicture && (
                <div
                    className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setViewingPhoto(false)}
                >
                    <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <img
                            src={user.profilePicture}
                            alt={user.name}
                            className="w-full rounded-2xl shadow-2xl object-cover"
                        />
                        <button
                            onClick={() => setViewingPhoto(false)}
                            className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <p className="text-center text-white/70 text-sm mt-3 font-medium">{user.name}</p>
                    </div>
                </div>
            )}

            {/* ── Crop Modal ── */}
            {cropSrc && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Crop Photo</h3>
                            <button onClick={() => setCropSrc(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>

                        {/* Crop area */}
                        <div className="relative w-full bg-slate-900" style={{ height: 300 }}>
                            <Cropper
                                image={cropSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>

                        {/* Zoom slider */}
                        <div className="px-5 py-3 flex items-center gap-3 border-t border-slate-100">
                            <ZoomOut size={16} className="text-slate-400 flex-shrink-0" />
                            <input
                                type="range" min={1} max={3} step={0.05}
                                value={zoom}
                                onChange={e => setZoom(Number(e.target.value))}
                                className="flex-1 accent-indigo-600"
                            />
                            <ZoomIn size={16} className="text-slate-400 flex-shrink-0" />
                        </div>

                        <div className="flex gap-3 px-5 pb-5">
                            <button
                                onClick={() => setCropSrc(null)}
                                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCropConfirm}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Check size={14} /> Apply & Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
