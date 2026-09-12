import { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { ResourceRow } from '../../components/recommendations/ResourceAccordion';
import ResourceSidebar from '../../components/recommendations/ResourceSidebar';
import IdeasHeroArt from '../../components/recommendations/IdeasHeroArt';
import {
  Search, Sparkles, X, Lightbulb, Target, BookMarked,
  Hammer, GraduationCap, Briefcase, MonitorPlay, BadgeCheck, BookOpen, Coins,
  Code2, TvMinimalPlay, Compass, ChevronRight
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import YatiLoader from '../../../components/YatiLoader';
import useMinimumLoading from '../../../hooks/useMinimumLoading';

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

/** One category as a tile: what it is, how much of it there is, and a way in. */
function CategoryTile({ icon: Icon, title, description, count, tone, onOpen }) {
  const t = TONES[tone] || TONES.violet;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={`group relative flex min-h-[10.5rem] flex-col overflow-hidden rounded-2xl p-4 text-left shadow-card ring-1 transition-all duration-300 ring-inset hover:-translate-y-1 hover:shadow-card-hover ${t.card}`}
    >
      {/* A soft wash of the tile's colour in the corner, stronger on hover. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-60 ${t.wash}`}
      />
      <span className="relative flex items-start justify-between gap-2">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110 ${t.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-black text-white shadow-sm tabular-nums ${t.count}`}>
          {count}
        </span>
      </span>
      <span className="relative mt-3 block text-sm leading-tight font-black text-ink-900">{title}</span>
      {description && (
        <span className="relative mt-1 hidden text-xs leading-relaxed text-ink-500 min-[400px]:block">{description}</span>
      )}
      <span className={`relative mt-auto inline-flex items-center gap-1 pt-3 text-xs font-black ${t.text}`}>
        Explore
        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

/** A heading over a run of tiles, with a control that opens or closes them all. */
function GroupHeading({ title, subtitle }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="bg-gradient-to-r from-journey-700 to-brand-600 bg-clip-text text-lg font-black text-transparent">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>
      </div>
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
      className="futurepath-portal fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4"
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div className="animate-scale-in relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[0_30px_80px_-20px_rgba(15,23,42,0.55)] ring-1 ring-line-200 sm:max-h-[86vh] sm:rounded-3xl">
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
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
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
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  // The roadmap carries its own reference lists — skills, subjects, projects,
  // exams, advice. This is the page for looking things up, so they live here.
  const [roadmap, setRoadmap] = useState(null);
  const [badges, setBadges] = useState([]);
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

  useEffect(() => {
    // Settled, not all: a missing roadmap must not blank out the
    // recommendations and vice versa. Either one alone is still a usable page.
    Promise.allSettled([
      api.get('/recommendations').then((res) => setData(res.data)),
      api.get('/roadmap').then((res) => setRoadmap(res.data?.roadmapData || null)),
      api.get('/badges').then((res) => setBadges(res.data || []))
    ]).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/recommendations/generate');
      await fetchRecs();
      toast.success('Your resource list has been rebuilt.', 'Recommendations ready');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate recommendations.');
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
    { key: 'Advice worth keeping', icon: Lightbulb, tone: 'pink', description: 'Mentor tips & career advice.',
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
    { key: 'Internships & Programmes', icon: Briefcase, tone: 'violet', items: data.internships,
      render: (item) => ({ tag: item.stage, title: item.title, subtitle: item.organisation,
        badges: [item.mode, item.duration, item.stipend], description: item.eligibility, link: item.link,
        details: (<>{item.whenToApply && (<p><strong>When to apply:</strong> {item.whenToApply}</p>)}{item.stipend && (<p><strong>Stipend:</strong> {item.stipend}</p>)}</>) }) },
    { key: 'Recommended Courses', icon: MonitorPlay, tone: 'blue', items: data.courses,
      render: (item) => ({ title: item.title, subtitle: item.provider, badges: [item.difficulty, item.pricing],
        description: item.skills ? `Skills: ${item.skills}` : null, link: item.link,
        details: item.duration ? (<p><strong>Duration:</strong> {item.duration}</p>) : null }) },
    { key: 'Certifications', icon: BadgeCheck, tone: 'teal', items: data.certifications,
      render: (item) => ({ title: item.title, subtitle: item.provider, description: item.description, link: item.link }) },
    { key: 'Must-Read Books', icon: BookOpen, tone: 'amber', items: data.books,
      render: (item) => ({ title: item.title, subtitle: item.author ? `By ${item.author}` : null,
        description: item.description, link: item.link,
        details: item.why ? (<p><strong>Why read this:</strong> {item.why}</p>) : null }) },
    { key: 'Scholarships', icon: Coins, tone: 'pink', items: data.scholarships,
      render: (item) => ({ title: item.name, badges: [item.deadline ? `Deadline: ${item.deadline}` : null],
        description: item.eligibility, link: item.link }) },
    { key: 'Practice Platforms', icon: Code2, tone: 'emerald', items: data.practiceResources,
      render: (item) => ({ title: item.name, badges: [item.type], link: item.link }) },
    { key: 'Educational Channels', icon: TvMinimalPlay, tone: 'indigo', items: data.youtubeChannels,
      render: (item) => ({ title: item.name, description: item.description, link: item.link }) },
    { key: 'Career Advice', icon: Compass, tone: 'sky', items: data.careerTips,
      render: (item) => ({ title: item.title, description: item.description }) }
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
  const nothingAtAll = !data && !hasRoadmapMaterial;

  // Column count per group, so the five roadmap tiles sit on one row rather
  // than wrapping a lone fifth tile onto a line of its own.
  const renderGroup = (categories, title, subtitle, cols) => {
    if (categories.length === 0) return null;
    return (
      <section>
        <GroupHeading title={title} subtitle={subtitle} />
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${cols}`}>
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
      {/* ---- Hero ------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-100 via-indigo-50 to-amber-50 p-5 shadow-float ring-1 ring-violet-200/70 ring-inset sm:p-7">
        <span aria-hidden className="fp-float pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-journey-300/40 blur-3xl" />
        <span aria-hidden className="fp-float-slow pointer-events-none absolute -right-20 -bottom-28 h-72 w-72 rounded-full bg-amber-200/60 blur-3xl" />
        <span aria-hidden className="fp-float-settle pointer-events-none absolute top-1/2 left-1/2 h-48 w-48 rounded-full bg-pink-200/40 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        {/* The scene bleeds to the right edge rather than sitting in a
            column of its own: boxed, it read as a picture pasted onto the
            banner instead of as the banner itself. `data-mascot-clear` keeps
            the companion off it — it has the idea list below to point at, and
            a character standing on the bulb is the one place it must not
            stop. */}
        <div
          aria-hidden
          data-mascot-clear
          className="ih-frame pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] max-w-[520px] [mask-image:linear-gradient(to_right,transparent,black_12%)] lg:block"
        >
          <IdeasHeroArt />
        </div>

        <div className="relative lg:min-h-[212px] lg:max-w-[58%]">
          <div data-mascot-clear className="min-w-0">
            <p className="text-[0.7rem] font-black tracking-[0.11em] text-journey-700 uppercase">
              Ideas &amp; Resources
            </p>
            <h1 className="mt-2 text-3xl leading-tight font-black text-ink-900 sm:text-4xl">
              Fuel your{' '}
              <span className="fp-text-shimmer relative bg-gradient-to-r from-journey-600 via-fuchsia-600 to-orange-500 bg-clip-text whitespace-nowrap text-transparent">
                future
                <svg
                  aria-hidden
                  viewBox="0 0 120 10"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-2 w-full text-amber-400"
                >
                  <path d="M2 7 C30 2, 90 2, 118 6" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                </svg>
              </span>{' '}
              <Sparkles aria-hidden className="fp-bob-soft inline h-7 w-7 text-amber-400" />
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-600">
              Explore handpicked resources to level up your skills, knowledge &amp; career.
            </p>

            {!nothingAtAll && (
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-0 flex-1 basis-64">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search every resource…"
                    aria-label="Search resources"
                    className="min-h-11 w-full rounded-xl border border-line-200 bg-surface py-2.5 pr-10 pl-10 text-sm text-ink-900 shadow-card transition-colors placeholder:text-ink-400 focus:border-journey-400 focus:outline-none"
                  />
                  {searching && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ---- Body + sidebar --------------------------------------------- */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          {nothingAtAll && (
            <EmptyState
              icon={Lightbulb}
              title="Nothing to show yet"
              description="Build your roadmap first, then let your AI mentor put together internships, courses, books and scholarships that fit your goal."
              action={
                <Button icon={Sparkles} loading={generating} loadingText="Curating…" onClick={handleGenerate}>
                  Get recommendations
                </Button>
              }
            />
          )}

          {/* No list of the platform's own courses here: Enrolled Courses is
              the page for those. */}

          {renderGroup(
            visibleRoadmap,
            'From your roadmap',
            "The path you're on, and what it asks for.",
            'xl:grid-cols-5'
          )}
          {renderGroup(
            visibleCurated,
            'Curated for you',
            'Specific, named opportunities your mentor found — most link straight out.',
            'xl:grid-cols-4'
          )}

          {/* Roadmap material but nothing curated yet: offer the second half
              rather than leaving the page looking finished. */}
          {!data && hasRoadmapMaterial && (
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-ink-900">Want named opportunities too?</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  Your mentor can add real internships, courses, books and scholarships with links.
                </p>
              </div>
              <Button icon={Sparkles} loading={generating} loadingText="Curating…" onClick={handleGenerate}>
                Get recommendations
              </Button>
            </Card>
          )}

          {!nothingAtAll && matchCount === 0 && (
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

        <ResourceSidebar user={user} badges={badges} />
      </div>

      {dialog && (
        <CategoryDialog title={dialog.title} categories={dialog.categories} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
