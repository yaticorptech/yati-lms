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
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import PhotoPicker from './PhotoPicker';
import { ADMIN_VIEW_KEY } from '../utils/sessionExpiry';

const adminIsViewing = () => {
    try { return !!localStorage.getItem(ADMIN_VIEW_KEY); } catch { return false; }
};

export default function ProfilePictureGate() {
    const { user, setUser } = useContext(AuthContext);
    const has = !!user?.profilePicture;
    const [needed, setNeeded] = useState(false);
    const [viewing] = useState(adminIsViewing);

    useEffect(() => {
        if (!user || has || viewing) return undefined;
        let alive = true;
        api.get('/user/profile')
            .then((r) => {
                if (!alive) return;
                const saved = r.data?.user?.profilePicture;
                if (!saved) { setNeeded(true); return; }
                const updated = { ...user, profilePicture: saved };
                setUser(updated);
                localStorage.setItem('studentData', JSON.stringify(updated));
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [user, has, setUser, viewing]);

    return needed && user && !has && !viewing ? <PhotoPicker required /> : null;
}
