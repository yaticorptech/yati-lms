/**
 * Folder tabs along the top of a section, the way Career Path has them: each
 * tab an icon on its own colour tile above its name, and the open one white,
 * joined to the page below. Used by Job Preparation and Extra Curricular
 * (Career Path keeps its own, styled by career.css).
 *
 * tabs: [{ key, to, name, icon, tone, on }] — `tone` is the tile's gradient,
 * `on` whether it is the open one.
 */
import { Link } from 'react-router-dom';

export default function FolderTabs({ tabs, label }) {
    return (
        <div className="mb-6">
            <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-b from-indigo-200/70 via-indigo-100 to-indigo-100 px-2 pt-1 sm:px-3">
                <nav aria-label={label} className="overflow-x-auto pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:pt-6">
                    <div className="flex w-max min-w-full items-end gap-1 sm:gap-1.5">
                        {tabs.map((tab) => (
                            <Link key={tab.key || tab.to} to={tab.to} aria-current={tab.on ? 'page' : undefined}
                                className={`group relative flex min-w-[6.5rem] flex-1 flex-col items-center rounded-t-[1.1rem] px-1.5 pt-1 pb-2.5 text-center transition-all duration-300 ${
                                    tab.on ? '-mb-px bg-white text-slate-900 shadow-sm'
                                        : 'mb-1 bg-white/55 text-indigo-700 ring-1 ring-inset ring-indigo-200/70 hover:-translate-y-1 hover:bg-white/90'}`}>
                                <span aria-hidden className={`-mt-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ring-2 ring-white transition-transform duration-300 sm:-mt-5 sm:h-10 sm:w-10 ${tab.tone} ${tab.on ? 'scale-110' : 'scale-95 group-hover:scale-105'}`}>
                                    <tab.icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.4} />
                                </span>
                                <span className="mt-1.5 text-[0.7rem] font-black leading-tight sm:text-xs">{tab.name}</span>
                            </Link>
                        ))}
                    </div>
                </nav>
            </div>
            <div className="min-h-3.5 rounded-b-3xl border border-t-0 border-indigo-200/70 bg-white shadow-sm" />
        </div>
    );
}
