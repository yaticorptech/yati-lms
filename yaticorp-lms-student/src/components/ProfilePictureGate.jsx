/**
 * A profile picture is compulsory. A signed-in student without one gets the
 * photo picker on whichever page they are on, and it cannot be closed until
 * they upload a photo or pick an avatar; then they carry on where they were.
 * It does offer a way out that is not a picture — signing out, or asking
 * support for help (PhotoPicker's footer) — so a student whose camera or
 * upload is broken is not trapped on the page.
 *
 * The saved login can be older than the profile (a picture set on another
 * device), so the server is asked before anyone is stopped; if it cannot be
 * reached, nobody is blocked.
 *
 * Not while a superadmin is viewing the dashboard as the student: the picture
 * is the student's to choose, and the gate stood between the administrator
 * and the page they came to look at.
 */
import { lazy, Suspense, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
// Fetched only for a student who still has to choose a photo — with its cropper, it is not small.
const PhotoPicker = lazy(() => import('./PhotoPicker'));
import { ADMIN_VIEW_KEY } from '../utils/sessionExpiry';
import { isAvatarPicture } from '../utils/avatarPicture';

const adminIsViewing = () => {
    try { return !!localStorage.getItem(ADMIN_VIEW_KEY); } catch { return false; }
};

export default function ProfilePictureGate() {
    const { user, setUser } = useContext(AuthContext);
    // In an institution (2026-11-16) the picture must be a real photo in uniform — it is printed on the
    // admit card and marks card — so an avatar counts as no picture for them.
    const inOrg = !!user?.organizationId;
    const has = !!user?.profilePicture && !(inOrg && isAvatarPicture(user.profilePicture));
    const [needed, setNeeded] = useState(false);
    const [viewing] = useState(adminIsViewing);
    const avatarNow = isAvatarPicture(user?.profilePicture);

    useEffect(() => {
        if (!user || viewing) return undefined;
        // A real photo, known from this device: nothing to ask. An avatar is checked, as they may be in an institution now.
        if (user.profilePicture && !avatarNow) return undefined;
        if (user.profilePicture && avatarNow && needed) return undefined;
        let alive = true;
        api.get('/user/profile')
            .then((r) => {
                if (!alive) return;
                const saved = r.data?.user?.profilePicture || '';
                const orgId = r.data?.user?.organizationId || null;
                if (saved !== user.profilePicture || String(orgId || '') !== String(user.organizationId || '')) {
                    const updated = { ...user, profilePicture: saved, organizationId: orgId };
                    setUser(updated);
                    localStorage.setItem('studentData', JSON.stringify(updated));
                }
                setNeeded(!saved || (!!orgId && isAvatarPicture(saved)));
            })
            .catch(() => {});
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id, user?.profilePicture, user?.organizationId, viewing]);

    return needed && user && !has && !viewing ? <Suspense fallback={null}><PhotoPicker required uniform={inOrg} /></Suspense> : null;
}
