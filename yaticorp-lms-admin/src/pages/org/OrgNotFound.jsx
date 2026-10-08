/**
 * An address under /organization that is not a page — a mistyped link, or one
 * to a page that has since moved.
 *
 * Said inside the organization's own shell, with its menu still there, rather
 * than on the platform's full-screen 404, which offers a way "home" to a
 * dashboard an organization administrator cannot open.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { CARD, BTN } from '../../components/orgUi';

const OrgNotFound = () => (
    <div className={`${CARD} mx-auto max-w-lg px-6 py-14 text-center animate-fade-in`}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
            <Compass size={24} className="text-indigo-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">This page does not exist</h1>
        <p className="mt-2 text-sm text-slate-500">The link may be mistyped, or the page may have moved. Everything in your organization is still where it was.</p>
        <Link to="/organization" className={`${BTN} mt-6`}><ArrowLeft size={16} />Back to your dashboard</Link>
    </div>
);

export default OrgNotFound;
