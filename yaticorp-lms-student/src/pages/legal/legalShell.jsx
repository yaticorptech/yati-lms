/**
 * The frame both legal pages sit in.
 *
 * Public on purpose: Google's OAuth reviewer, and any student deciding whether
 * to connect an account, has to be able to read these without signing in. That
 * is also why they are plain routed pages rather than modals — a URL that can
 * be pasted into the Cloud Console and opened by a stranger.
 *
 * Everything a reader has to be able to find is in one file per document, in
 * the order a person actually asks the questions, rather than the order a
 * template would put them in.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

/**
 * The details that are not derivable from the code and must be filled in
 * before these pages go in front of Google or a student.
 *
 * They are gathered here, once, rather than scattered through the prose, so
 * that filling them in is a single edit and nothing can be left stale in a
 * paragraph someone forgot to read.
 */
export const COMPANY = {
  legalName: 'YATICORP',                          // TODO: registered legal name, e.g. "Yaticorp Technologies Pvt. Ltd."
  address: 'TODO: registered address',            // TODO: full postal address
  jurisdiction: 'TODO: city, India',              // TODO: courts of which city
  privacyEmail: 'yaticorp.tech@gmail.com',
  grievanceOfficer: 'TODO: name of grievance officer',
  effectiveDate: 'TODO: date these were published'
};

export const Section = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="mt-10 text-lg font-black text-slate-900 sm:text-xl">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
  </section>
);

export const Bullets = ({ items }) => (
  <ul className="ml-4 list-disc space-y-1.5 marker:text-indigo-400">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

export default function LegalShell({ title, intro, updated, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} />
            Back
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-black tracking-tight text-slate-900">
            <ShieldCheck size={16} className="text-indigo-600" />
            YATICORP
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Last updated {updated}
        </p>
        <p className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm leading-relaxed text-slate-700">
          {intro}
        </p>

        {children}

        <footer className="mt-14 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <p className="font-bold text-slate-900">Contact</p>
          <p className="mt-1">
            {COMPANY.legalName}, {COMPANY.address}
            <br />
            <a className="font-semibold text-indigo-600 hover:underline" href={`mailto:${COMPANY.privacyEmail}`}>
              {COMPANY.privacyEmail}
            </a>
          </p>
          <p className="mt-4 flex gap-4">
            <Link className="font-semibold text-indigo-600 hover:underline" to="/privacy">Privacy Policy</Link>
            <Link className="font-semibold text-indigo-600 hover:underline" to="/terms">Terms of Service</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
