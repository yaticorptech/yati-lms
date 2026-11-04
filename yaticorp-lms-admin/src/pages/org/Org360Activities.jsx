/**
 * 360 Activities (2026-10-31): its own item in the sidebar, after Courses
 * (it was a tab on the Teachers page). The organization's activities in
 * categories, the most each can give, and "Open 360 to students" — the
 * editor is ../../components/teachers/OrgActivities.jsx. Not for a teacher's
 * limited sign-in (the server refuses them; STAFF_HIDDEN in OrgAdminLayout).
 */
import React, { useState } from 'react';
import { Banner } from '../../components/orgUi';
import OrgActivities from '../../components/teachers/OrgActivities';

const Org360Activities = () => {
    const [notice, setNotice] = useState('');
    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            <OrgActivities onNotice={setNotice} />
        </div>
    );
};

export default Org360Activities;
