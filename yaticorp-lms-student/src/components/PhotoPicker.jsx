/**
 * Choose a profile picture: upload a photo (cropped round), or pick one of
 * the ready-made avatars. A profile picture is compulsory, so there is no
 * way back to a blank circle here — only to another picture.
 *
 * `required`: the student has no picture yet (see ProfilePictureGate). The
 * popup then cannot be closed — no ×, no Cancel, no click outside — until
 * a picture is saved. Otherwise it is My Profile's "Change photo".
 */
import { useCallback, useContext, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Check, Loader2, Sparkles, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import Portal from './Portal';
import { getCroppedBlob, UNREADABLE } from '../utils/cropImage';

// Ready-made avatars for students who would rather not upload a photo,
// grouped the way people look for them: boys, girls, kids, and elders.
// The tiles are flat vector illustrations in pastel circles, shipped with
// the app under public/avatars/<group>/<n>.jpg. Elders are middle-aged
// uncles and aunties rather than grandparents. The server turns the
// relative path into an absolute URL on save so the same picture also
// shows in the admin panel.
const AVATAR_GROUPS = [
    { id: 'boys', label: 'Boys', count: 6 },
    { id: 'girls', label: 'Girls', count: 6 },
    { id: 'kids', label: 'Kids', count: 6 },
    { id: 'elders', label: 'Elders', count: 9 },
].map(g => ({ ...g, tiles: Array.from({ length: g.count }, (_, i) => `/avatars/${g.id}/${i + 1}.jpg`) }));

export default function PhotoPicker({ required = false, onClose }) {
    const { user, setUser } = useContext(AuthContext);
    const photoInputRef = useRef(null);
    const [avatarGroup, setAvatarGroup] = useState(AVATAR_GROUPS[0].id);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    // Avatar pictures that failed to load, so their tiles drop out instead of
    // showing a broken image.
    const [brokenAvatars, setBrokenAvatars] = useState([]);
    const [savingAvatar, setSavingAvatar] = useState(false);

    // Crop step, after a photo is chosen
    const [cropSrc, setCropSrc] = useState(null);       // raw data URL of selected image
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [uploading, setUploading] = useState(false);
    const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

    const close = () => { if (!required && !savingAvatar && !uploading) onClose?.(); };

    const keep = (changes) => {
        const updated = { ...user, ...changes };
        setUser(updated);
        localStorage.setItem('studentData', JSON.stringify(updated));
    };

    // A chosen avatar goes straight to the profile: no upload involved.
    const savePictureUrl = async (profilePicture) => {
        setSavingAvatar(true);
        try {
            const res = await api.put('/user/profile', { profilePicture });
            keep(res.data);
            onClose?.();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update photo. Please try again.');
        } finally {
            setSavingAvatar(false);
        }
    };

    // Step 1: a photo is chosen → the crop step
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

    // Step 2: the crop is confirmed → the cropped photo goes to the server
    // (Cloudinary), which saves it on the profile.
    const handleCropConfirm = async () => {
        if (!croppedAreaPixels || !cropSrc) return;
        setUploading(true);
        try {
            const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
            const fd = new FormData();
            fd.append('profilePicture', blob, 'profile.jpg');
            const res = await api.post('/user/profile/picture', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            keep({ profilePicture: res.data.profilePicture });
            setCropSrc(null);
            onClose?.();
        } catch (err) {
            // The server says why; with no answer at all, the connection is the problem.
            alert(err.response?.data?.message
                || (err.message === UNREADABLE ? UNREADABLE
                    : err.response ? 'Failed to upload photo. Please try again.' : 'You appear to be offline. Please try again.'));
        } finally {
            setUploading(false);
        }
    };

    const group = AVATAR_GROUPS.find(g => g.id === avatarGroup) || AVATAR_GROUPS[0];

    return (
        <Portal>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

            {/* ── Photo / Avatar Picker ── */}
            {!cropSrc && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={close}>
                    <div
                        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={e => e.stopPropagation()}
                        role="dialog" aria-modal="true" aria-labelledby="picker-title" data-required={required ? 'true' : undefined}
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                            <div className="min-w-0">
                                <h3 id="picker-title" className="font-bold text-slate-800">{required ? 'Add your profile picture' : 'Change photo'}</h3>
                                {required && <p className="mt-0.5 text-sm text-slate-500">Every student needs a profile picture. Upload your photo or pick an avatar to continue.</p>}
                            </div>
                            {!required && (
                                <button onClick={close} disabled={savingAvatar} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
                            )}
                        </div>

                        <div className="overflow-y-auto px-5 py-4">
                            <button
                                onClick={() => photoInputRef.current?.click()}
                                disabled={savingAvatar}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                            >
                                <Upload size={15} /> Upload a photo
                            </button>

                            <div className="my-4 flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
                                <span className="h-px flex-1 bg-slate-200" />
                                <span className="flex items-center gap-1"><Sparkles size={12} /> or pick an avatar</span>
                                <span className="h-px flex-1 bg-slate-200" />
                            </div>

                            {/* Group chips: boys, girls, kids, elders */}
                            <div className="flex flex-wrap gap-1.5">
                                {AVATAR_GROUPS.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => { setAvatarGroup(g.id); setSelectedAvatar(null); }}
                                        className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${avatarGroup === g.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>

                            {/* Avatar grid */}
                            {group.tiles.every((u) => brokenAvatars.includes(u)) && (
                                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    The ready-made avatars are not available on this server. Upload a photo instead.
                                </p>
                            )}
                            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                                {group.tiles.filter((u) => !brokenAvatars.includes(u)).map((url, i) => {
                                    // The saved picture may be the absolute form of this path.
                                    const active = selectedAvatar === url || (!selectedAvatar && !!user?.profilePicture && user.profilePicture.endsWith(url));
                                    return (
                                        <button
                                            key={url}
                                            onClick={() => setSelectedAvatar(url)}
                                            disabled={savingAvatar}
                                            className={`relative aspect-square overflow-hidden rounded-full border-4 bg-white transition-transform hover:scale-105 ${active ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-transparent'}`}
                                            aria-label={`Avatar ${i + 1}`}
                                            aria-pressed={active}
                                        >
                                            <img src={url} alt="" loading="lazy" className="h-full w-full object-cover"
                                                onError={() => setBrokenAvatars((b) => (b.includes(url) ? b : [...b, url]))} />
                                            {active && (
                                                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white"><Check size={12} /></span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
                            {!required && (
                                <button
                                    onClick={close}
                                    disabled={savingAvatar}
                                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={() => selectedAvatar && savePictureUrl(selectedAvatar)}
                                disabled={!selectedAvatar || savingAvatar}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {savingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Use this avatar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Crop step: Cancel goes back to the choices ── */}
            {cropSrc && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" role="dialog" aria-modal="true" aria-label="Crop Photo">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Crop Photo</h3>
                            <button onClick={() => setCropSrc(null)} disabled={uploading} className="text-slate-400 hover:text-slate-600" aria-label="Back"><X size={18} /></button>
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
                                disabled={uploading}
                                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCropConfirm}
                                disabled={uploading}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Apply & Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Portal>
    );
}
