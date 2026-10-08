/**
 * A profile picture is compulsory. A signed-in student without one gets the
 * photo picker on whichever page they are on, and it cannot be closed until
 * they upload a photo or pick an avatar; then they carry on where they were.
 *
 * The saved login can be older than the profile (a picture set on another
 * device), so the server is asked before anyone is stopped; if it cannot be
 * reached, nobody is blocked.
 */
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import PhotoPicker from './PhotoPicker';

export default function ProfilePictureGate() {
    const { user, setUser } = useContext(AuthContext);
    const has = !!user?.profilePicture;
    const [needed, setNeeded] = useState(false);

    useEffect(() => {
        if (!user || has) return undefined;
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
    }, [user, has, setUser]);

    return needed && user && !has ? <PhotoPicker required /> : null;
}
