import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { ResourceRow } from '../../components/recommendations/ResourceAccordion';
import {
  Search, Sparkles, X, Lightbulb, Target, BookMarked,
  Hammer, GraduationCap, Briefcase, MonitorPlay, BadgeCheck, BookOpen,
  Code2, TvMinimalPlay, ChevronRight, RotateCw
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import YatiLoader from '../../../components/YatiLoader';
import useMinimumLoading from '../../../hooks/useMinimumLoading';
import useBackClose from '../../../native/useBackClose';
import { isWalletCancel } from '../../../utils/walletCharge';
import GeminiCreditTip from '../../../components/GeminiCreditTip';

/*
 * Tile palettes. Written out in full because Tailwind scans source for literal
 * class names — a template-built `bg-${tone}-50` produces no CSS at all.
 */
const TONES = {
  violet: { card: 'bg-gradient-to-br from-violet-50 to-surface ring-violet-100 hover:ring-violet-300', icon: 'from-violet-400 to-purple-600 shadow-violet-500/40', count: 'bg-violet-600', text: 'text-violet-700', wash: 'bg-violet-300' },
  blue: { card: 'bg-gradient-to-br from-blue-50 to-surface ring-blue-100 hover:ring-blue-300', icon: 'from-sky-400 to-blue-600 shadow-blue-500/40', count: 'bg-blue-600', text: 'text-blue-700', wash: 'bg-blue-300' },
  emerald: { card: 'bg-gradient-to-br from-emerald-50 to-surface ring-emerald-100 hover:ring-emerald-300', icon: 'from-emerald-400 to-teal-600 shadow-emerald-500/40', count: 'bg-emerald-600', text: 'text-emerald-700', wash: 'bg-emerald-300' },
  amber: { card: 'bg-gradient-to-br from-amber-50 to-surface ring-amber-100 hover:ring-amber-300', icon: 'from-amber-400 to-orange-500 shadow-orange-500/40', count: 'bg-orange-500', text: 'text-orange-700', wash: 'bg-amber-300' },
  pink: { card: 'bg-gradient-to-br from-pink-50 to-surface ring-pink-100 hover:ring-pink-300', icon: 'from-pink-400 to-rose-600 shadow-pink-500/40', count: 'bg-rose-600', text: 'text-rose-700', wash: 'bg-pink-300' },
  sky: { card: 'bg-gradient-to-br from-sky-50 to-surface ring-sky-100 hover:ring-sky-300', icon: 'from-cyan-400 to-sky-600 shadow-sky-500/40', count: 'bg-sky-600', text: 'text-sky-700', wash: 'bg-sky-300' },
  teal: { card: 'bg-gradient-to-br from-teal-50 to-surface ring-teal-100 hover:ring-teal-300', icon: 'from-teal-400 to-cyan-600 shadow-teal-500/40', count: 'bg-teal-600', text: 'text-teal-700', wash: 'bg-teal-300' },
  indigo: { card: 'bg-gradient-to-br from-indigo-50 to-surface ring-indigo-100 hover:ring-indigo-300', icon: 'from-indigo-400 to-violet-600 shadow-indigo-500/40', count: 'bg-indigo-600', text: 'text-indigo-700', wash: 'bg-indigo-300' }
};

/** One category as a compact card: icon, name, one line about it, how many, and an arrow. The whole card opens it. */
function CategoryTile({ icon: Icon, title, description, count, tone, onOpen }) {
  const t = TONES[tone] || TONES.violet;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-surface p-3 text-left shadow-card ring-1 ring-line-200/80 transition-all duration-300 ring-inset hover:-translate-y-0.5 hover:shadow-card-hover sm:gap-3.5 sm:p-4"
    >
      <span aria-hidden className={`pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-50 ${t.wash}`} />
      <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${t.icon}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-ink-900">{title}</span>
        {description && <span className="mt-0.5 block truncate text-xs text-ink-500">{description}</span>}
      </span>
      <span className={`relative shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-black text-white tabular-nums ${t.count}`}>{count}</span>
      <ChevronRight className={`relative h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${t.text}`} />
    </button>
  );
}

/** A heading over a run of tiles. Just the title: the line under each was removed (asked 2026-10-15). */
function GroupHeading({ title, hint }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-black text-ink-900 sm:text-lg">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-ink-500 sm:text-sm">{hint}</p>}
    </div>
  );
}

/**
 * The roadmap's plain lists — skills, subjects, projects, exams, advice.
 *
 * The category is stated once as a heading and the items sit in two columns,
 * rather than one full-width accordion row per item repeating its own kind
 * underneath it.
 */
function LabelledGroups({ groups }) {
  return (
    <div className="divide-y divide-line-100">
      {groups.map(([kind, items]) => (
        <div key={kind || 'all'} className="px-4 py-3.5">
          {kind && (
            <p className="mb-2 text-[0.68rem] font-bold tracking-[0.11em] text-ink-400 uppercase">
              {kind}
            </p>
          )}
          <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {items.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-journey-400" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * One or more categories, opened in front of the page.
 *
 * The contents are the same CategoryPanel that used to unfold under the grid.
 * In a dialog the grid stays where it is, the panel gets the full height of
 * the screen to scroll in, and closing it lands the student back exactly where
 * they were.
 */
function CategoryDialog({ title, categories, onClose }) {
  const Icon = categories.length === 1 ? categories[0].icon : null;
  const count = categories.reduce((n, c) => n + c.count, 0);
  const closeRef = useRef(null);
  // Android's back button closes the list rather than leaving the page.
  useBackClose(onClose);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  // On document.body, outside the page: the page slides in with a transform
  // and a transformed ancestor would pin this to the page's bottom edge.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // Centred at every width — on a phone too, where a sheet pinned to the
      // bottom edge sat behind the thumb bar and read as part of the page.
      className="futurepath-portal fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      {/* The page behind is dimmed, so the dialog clearly sits on top of it. */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="animate-scale-in relative flex max-h-[min(78dvh,40rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-surface shadow-[0_30px_80px_-20px_rgba(15,23,42,0.55)] ring-1 ring-line-200 sm:max-h-[86vh]">
        <div className="flex shrink-0 items-center gap-3 border-b border-line-100 px-5 py-4 sm:px-6">
          {Icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-journey-50 text-journey-600 ring-1 ring-journey-100 ring-inset">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h2 className="min-w-0 flex-1 truncate text-base font-black text-ink-900">{title}</h2>
          <span className="shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-xs font-black text-ink-500 tabular-nums">
            {count}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {categories.map((c) => (
            <CategoryPanel key={c.title} category={c} labelled={categories.length > 1} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * The opened category's contents, shown inside the dialog. `labelled` adds
 * the category's own bar on top — wanted when several sit in one dialog,
 * redundant when the dialog's title already names the one category shown.
 */
function CategoryPanel({ category, labelled = false }) {
  const Icon = category.icon;
  return (
    <div className="overflow-hidden rounded-2xl border border-line-200 bg-surface shadow-card">
      {labelled && (
        <div className="flex items-center gap-2.5 border-b border-line-200 bg-surface-50 px-4 py-3">
          <Icon className="h-4 w-4 shrink-0 text-journey-600" />
          <h3 className="min-w-0 flex-1 text-sm font-black text-ink-900">{category.title}</h3>
          <span className="text-xs font-black text-ink-400 tabular-nums">{category.count}</span>
        </div>
      )}
      {category.kind === 'groups' ? (
        <LabelledGroups groups={category.groups} />
      ) : (
        <ul>
          {category.items.map((item, i) => (
            <ResourceRow key={i} {...category.render(item)} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Recommendations() {
  const [data, setData] = useState(null);
  // The roadmap carries its own reference lists — skills, subjects, projects,
  // exams, advice. This is the page for looking things up, so they live here.
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // The category open in front of the page, from a tile. Nothing to start —
  // the grid is the catalogue.
  const [dialog, setDialog] = useState(null);
  // Changing pose every few seconds beside the search box.

  const toast = useToast();

  const fetchRecs = async () => {
    const res = await api.get('/recommendations');
    setData(res.data);
  };

  // True when a read failed for a reason other than "there is none yet". The
  // empty states below offer a PAID "Get recommendations", and a student whose
  // existing list merely failed to load (offline, a 500) was being invited to
  // pay to rebuild it. Only a 404 means there is nothing to show.
  const [loadFailed, setLoadFailed] = useState(false);

  const loadAll = () => {
    setLoading(true);
    setLoadFailed(false);
    const noneOn404 = (err) => {
      if (err.response?.status !== 404) setLoadFailed(true);
    };
    // Settled, not all: a missing roadmap must not blank out the
    // recommendations and vice versa. Either one alone is still a usable page.
    Promise.allSettled([
      api.get('/recommendations').then((res) => setData(res.data), noneOn404),
      api.get('/roadmap').then((res) => setRoadmap(res.data?.roadmapData || null), noneOn404)
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/recommendations/generate');
      await fetchRecs();
      toast.success('Your resource list has been rebuilt.', 'Recommendations ready');
    } catch (err) {
      if (!isWalletCancel(err)) toast.error(err.response?.data?.message || 'Could not generate recommendations.');
    } finally {
      setGenerating(false);
    }
  };

  const searching = searchQuery.trim().length > 0;
  const query = searchQuery.toLowerCase();

  const showLoader = useMinimumLoading(loading);
  if (showLoader) return <YatiLoader label="Gathering ideas for you" />;

  // ---- From the roadmap ------------------------------------------------
  const roadmapDefs = [
    { key: 'Skills to build', icon: Target, tone: 'violet', description: 'Core skills you need to master.',
      groups: [['Technical', roadmap?.skills?.technical], ['Soft skills', roadmap?.skills?.soft], ['Life skills', roadmap?.skills?.life]] },
    { key: 'What to study', icon: BookMarked, tone: 'blue', description: 'Subjects & topics to focus on.',
      groups: [['Subjects', roadmap?.subjects], ['Courses', roadmap?.courses]] },
    { key: 'What to build', icon: Hammer, tone: 'emerald', description: 'Projects to apply your learning.',
      groups: [['Projects', roadmap?.projects], ['Internships', roadmap?.internships]] },
    { key: 'Exams & certifications', icon: GraduationCap, tone: 'amber', description: 'Top exams & certs to boost your profile.',
      // One unlabelled group: a heading over a single list only repeats itself.
      groups: [['Entrance exams', roadmap?.entranceExams], ['Certifications', roadmap?.certifications]] },
    { key: 'Mentor tips', icon: Lightbulb, tone: 'pink', description: 'Career advice from your mentor.',
      groups: [[null, roadmap?.careerTips]] }
  ];

  const roadmapCategories = roadmapDefs
    .map((def) => {
      const groups = def.groups
        .map(([kind, items]) => [kind, (items || []).filter((i) => String(i).toLowerCase().includes(query))])
        .filter(([, items]) => items.length > 0);
      const count = groups.reduce((total, [, items]) => total + items.length, 0);
      return { ...def, title: def.key, kind: 'groups', groups, count };
    })
    .filter((c) => c.count > 0);

  // ---- Curated by the mentor -------------------------------------------
  // No colleges section: where to apply is a decision made once, not a
  // resource looked up while studying.
  const curatedDefs = data ? [
    { key: 'Internships & Programmes', icon: Briefcase, tone: 'violet', description: 'Real openings to apply to.', items: data.internships,
      render: (item) => ({ tag: item.stage, title: item.title, subtitle: item.organisation,
        badges: [item.mode, item.duration, item.stipend], description: item.eligibility, link: item.link,
        details: (<>{item.whenToApply && (<p><strong>When to apply:</strong> {item.whenToApply}</p>)}{item.stipend && (<p><strong>Stipend:</strong> {item.stipend}</p>)}</>) }) },
    { key: 'Courses', icon: MonitorPlay, tone: 'blue', description: 'Online courses with links.', items: data.courses,
      render: (item) => ({ title: item.title, subtitle: item.provider, badges: [item.difficulty, item.pricing],
        description: item.skills ? `Skills: ${item.skills}` : null, link: item.link,
        details: item.duration ? (<p><strong>Duration:</strong> {item.duration}</p>) : null }) },
    { key: 'Certifications', icon: BadgeCheck, tone: 'teal', description: 'Certificates worth earning.', items: data.certifications,
      render: (item) => ({ title: item.title, subtitle: item.provider, description: item.description, link: item.link }) },
    { key: 'Books', icon: BookOpen, tone: 'amber', description: 'Must-reads for your goal.', items: data.books,
      render: (item) => ({ title: item.title, subtitle: item.author ? `By ${item.author}` : null,
        description: item.description, link: item.link,
        details: item.why ? (<p><strong>Why read this:</strong> {item.why}</p>) : null }) },
    { key: 'Practice Platforms', icon: Code2, tone: 'emerald', description: 'Sites to code and practise on.', items: data.practiceResources,
      render: (item) => ({ title: item.name, badges: [item.type], link: item.link }) },
    { key: 'YouTube Channels', icon: TvMinimalPlay, tone: 'indigo', description: 'Channels to learn from.', items: data.youtubeChannels,
      render: (item) => ({ title: item.name, description: item.description, link: item.link }) },
  ] : [];

  const curatedCategories = curatedDefs
    .map((def) => {
      const items = (def.items || []).filter((item) =>
        JSON.stringify(item).toLowerCase().includes(query)
      );
      return { ...def, title: def.key, kind: 'rows', items, count: items.length };
    })
    .filter((c) => c.count > 0);

  // Everything shows; the search box is the only filter.
  const showRoadmap = true;
  const showCurated = true;

  const visibleRoadmap = showRoadmap ? roadmapCategories : [];
  const visibleCurated = showCurated ? curatedCategories : [];

  const matchCount =
    visibleRoadmap.reduce((n, c) => n + c.count, 0) +
    visibleCurated.reduce((n, c) => n + c.count, 0);

  const hasRoadmapMaterial = roadmapDefs.some((d) => d.groups.some(([, items]) => items?.length > 0));
  // A failed read is not "nothing": it gets a retry, never a generate button.
  const nothingAtAll = !loadFailed && !data && !hasRoadmapMaterial;

  // Column count per group, so the five roadmap tiles sit on one row rather
  // than wrapping a lone fifth tile onto a line of its own.
  const renderGroup = (categories, title, hint, cols) => {
    if (categories.length === 0) return null;
    return (
      <section>
        <GroupHeading title={title} hint={hint} />
        <div className={`grid gap-2.5 sm:grid-cols-2 sm:gap-3 ${cols}`}>
          {categories.map((c) => (
            <CategoryTile
              key={c.title}
              icon={c.icon}
              title={c.title}
              description={c.description}
              count={c.count}
              tone={c.tone}
              onOpen={() => setDialog({ title: c.title, categories: [c] })}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="fp-enter space-y-6">
      {/* The banner that stood here went on 2026-10-27 (this is the Skills tab's
          "What to learn" view now, under its switch); its search stays. */}
      {!nothingAtAll && (
        <div className="flex items-center gap-3 rounded-2xl bg-white py-2 pr-2 pl-4 shadow-sm ring-1 ring-slate-200 transition-shadow focus-within:ring-4 focus-within:ring-amber-200">
          <Search className="pointer-events-none h-5 w-5 shrink-0 text-amber-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search every resource…"
            aria-label="Search resources"
            className="fp-search-field min-h-7 min-w-0 flex-1 border-0 bg-transparent py-0.5 text-sm text-ink-900 text-ellipsis placeholder:text-ink-400 focus:ring-0 focus:outline-none"
          />
          {searching ? (
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 tabular-nums">
                {matchCount} {matchCount === 1 ? 'match' : 'matches'}
              </span>
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"
                className="rounded-md p-1 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700">
                <X className="h-4 w-4" />
              </button>
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 tabular-nums">{matchCount} ideas</span>
          )}
        </div>
      )}

      {/* ---- Body + sidebar --------------------------------------------- */}
      <div>
        <div className="min-w-0 space-y-6">
          {loadFailed && (
            <Card className="flex flex-wrap items-center justify-between gap-4 border-rose-200 bg-rose-50" role="alert">
              <div>
                <p className="font-semibold text-rose-800">Some of your resources did not load</p>
                <p className="mt-0.5 text-sm text-rose-700">
                  Check your connection and try again. Nothing has been lost.
                </p>
              </div>
              <Button variant="secondary" icon={RotateCw} onClick={loadAll}>
                Try again
              </Button>
            </Card>
          )}

          {nothingAtAll && (
            <EmptyState
              icon={Lightbulb}
              title="Nothing to show yet"
              description={roadmap
                // A roadmap with no resource lists of its own still has a goal to
                // curate for: it is not asked to build one it has (QA, 2026-10-16).
                ? 'Let your AI mentor put together internships, courses, books and scholarships that fit your goal.'
                : 'Build your roadmap first, then let your AI mentor put together internships, courses, books and scholarships that fit your goal.'}
              action={
                <span className="inline-flex items-center gap-2"><Button icon={Sparkles} loading={generating} loadingText="Curating…" onClick={handleGenerate}>
                  Get recommendations
                </Button><GeminiCreditTip /></span>
              }
            />
          )}

          {/* No list of the platform's own courses here: Enrolled Courses is
              the page for those. */}

          {renderGroup(visibleRoadmap, 'Your learning plan', 'What your roadmap says to learn, build and prepare for.', 'lg:grid-cols-3')}
          {renderGroup(visibleCurated, 'Resources with links', 'Courses, books and sites your mentor picked. Tap one to open the list.', 'lg:grid-cols-3')}

          {/* Roadmap material but nothing curated yet: offer the second half
              rather than leaving the page looking finished. */}
          {!loadFailed && !data && hasRoadmapMaterial && (
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-ink-900">Want named opportunities too?</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  Your mentor can add real internships, courses, books and scholarships with links.
                </p>
              </div>
              <span className="inline-flex items-center gap-2"><Button icon={Sparkles} loading={generating} loadingText="Curating…" onClick={handleGenerate}>
                Get recommendations
              </Button><GeminiCreditTip /></span>
            </Card>
          )}

          {!loadFailed && !nothingAtAll && matchCount === 0 && (
            <EmptyState
              icon={Search}
              title={searching ? 'Nothing matches that' : 'Nothing to show'}
              description={
                searching
                  ? `No resource mentions “${searchQuery}”. Try a shorter or more general term.`
                  : 'Regenerate your resources to fill this page.'
              }
              action={
                searching ? (
                  <Button variant="secondary" onClick={() => setSearchQuery('')}>Clear search</Button>
                ) : null
              }
            />
          )}

        </div>

      </div>

      {dialog && (
        <CategoryDialog title={dialog.title} categories={dialog.categories} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
