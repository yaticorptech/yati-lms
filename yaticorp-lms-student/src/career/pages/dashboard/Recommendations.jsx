import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import api from '../../services/api';
import { ResourceRow } from '../../components/recommendations/ResourceAccordion';
import ResourcesArt from '../../components/recommendations/ResourcesArt';
import ResourceSidebar from '../../components/recommendations/ResourceSidebar';
import {
  Search, Sparkles, RefreshCw, X, Lightbulb, Target, BookMarked,
  Hammer, GraduationCap, Briefcase, MonitorPlay, BadgeCheck, BookOpen, Coins,
  Code2, TvMinimalPlay, Compass, ArrowRight, PlayCircle, ChevronRight, Trophy,
  ChevronDown
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

/*
 * Tile palettes. Written out in full because Tailwind scans source for literal
 * class names — a template-built `bg-${tone}-50` produces no CSS at all.
 */
const TONES = {
  violet: { card: 'bg-violet-50/70 ring-violet-100 hover:ring-violet-300', icon: 'bg-violet-100 text-violet-700', count: 'bg-violet-100 text-violet-700' },
  blue: { card: 'bg-blue-50/70 ring-blue-100 hover:ring-blue-300', icon: 'bg-blue-100 text-blue-700', count: 'bg-blue-100 text-blue-700' },
  emerald: { card: 'bg-emerald-50/70 ring-emerald-100 hover:ring-emerald-300', icon: 'bg-emerald-100 text-emerald-700', count: 'bg-emerald-100 text-emerald-700' },
  amber: { card: 'bg-amber-50/70 ring-amber-100 hover:ring-amber-300', icon: 'bg-amber-100 text-amber-700', count: 'bg-amber-100 text-amber-700' },
  pink: { card: 'bg-pink-50/70 ring-pink-100 hover:ring-pink-300', icon: 'bg-pink-100 text-pink-700', count: 'bg-pink-100 text-pink-700' },
  sky: { card: 'bg-sky-50/70 ring-sky-100 hover:ring-sky-300', icon: 'bg-sky-100 text-sky-700', count: 'bg-sky-100 text-sky-700' },
  teal: { card: 'bg-teal-50/70 ring-teal-100 hover:ring-teal-300', icon: 'bg-teal-100 text-teal-700', count: 'bg-teal-100 text-teal-700' },
  indigo: { card: 'bg-indigo-50/70 ring-indigo-100 hover:ring-indigo-300', icon: 'bg-indigo-100 text-indigo-700', count: 'bg-indigo-100 text-indigo-700' }
};

/** One category as a tile: what it is, how much of it there is, and a way in. */
function CategoryTile({ icon: Icon, title, description, count, tone, open, onToggle }) {
  const t = TONES[tone] || TONES.violet;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`fp-press group relative flex flex-col rounded-2xl p-4 text-left ring-1 transition-all ring-inset ${t.card} ${
        open ? 'ring-2 ring-journey-400' : ''
      }`}
    >
      <span className={`absolute top-3 right-3 rounded-lg px-1.5 py-0.5 text-[0.68rem] font-black tabular-nums ${t.count}`}>
        {count}
      </span>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.icon}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 flex items-center gap-1 pr-6 text-sm leading-tight font-black text-ink-900">
        {title}
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : 'group-hover:translate-x-0.5'}`}
        />
      </span>
      {description && (
        <span className="mt-1 text-xs leading-relaxed text-ink-500">{description}</span>
      )}
    </button>
  );
}

/** A heading over a run of tiles, with a control that opens or closes them all. */
function GroupHeading({ title, subtitle, allOpen, onToggleAll }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[0.7rem] font-black tracking-[0.11em] text-journey-700 uppercase">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onToggleAll}
        className="group inline-flex shrink-0 items-center gap-1 text-xs font-black text-journey-700 hover:underline"
      >
        {allOpen ? 'Collapse all' : 'View all'}
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </button>
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

/** The opened category's contents, under the grid it was opened from. */
function CategoryPanel({ category, onClose }) {
  const Icon = category.icon;
  return (
    <div className="overflow-hidden rounded-2xl border border-line-200 bg-surface shadow-card">
      <div className="flex items-center gap-2.5 border-b border-line-200 bg-surface-50 px-4 py-3">
        <Icon className="h-4 w-4 shrink-0 text-journey-600" />
        <h3 className="min-w-0 flex-1 text-sm font-black text-ink-900">{category.title}</h3>
        <span className="text-xs font-black text-ink-400 tabular-nums">{category.count}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${category.title}`}
          className="rounded-md p-1 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
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
  const [scope, setScope] = useState('all');
  // Which categories are open. Empty to start: the point of the grid is that
  // the whole catalogue is visible at once before anything is expanded.
  const [openSections, setOpenSections] = useState(() => new Set());
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

  const toggleSection = (title) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  if (loading) {
    return (
      <div className="fp-enter space-y-6">
        <div className="h-56 animate-pulse rounded-3xl bg-surface-100" />
        <SkeletonList rows={6} />
      </div>
    );
  }

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

  const yaticorpCourses = (data?.yaticorpCourses || []).filter((course) =>
    JSON.stringify(course).toLowerCase().includes(query)
  );

  const showRoadmap = scope === 'all' || scope === 'roadmap';
  const showCurated = scope === 'all' || scope === 'curated';

  const visibleRoadmap = showRoadmap ? roadmapCategories : [];
  const visibleCurated = showCurated ? curatedCategories : [];

  const matchCount =
    visibleRoadmap.reduce((n, c) => n + c.count, 0) +
    visibleCurated.reduce((n, c) => n + c.count, 0) +
    (showCurated ? yaticorpCourses.length : 0);

  const hasRoadmapMaterial = roadmapDefs.some((d) => d.groups.some(([, items]) => items?.length > 0));
  const nothingAtAll = !data && !hasRoadmapMaterial;

  // While searching every surviving category is forced open — matches hidden
  // behind a closed tile would make the search look broken.
  const isOpen = (title) => searching || openSections.has(title);
  const toggleAll = (categories) => {
    const allOpen = categories.every((c) => openSections.has(c.title));
    setOpenSections((prev) => {
      const next = new Set(prev);
      categories.forEach((c) => (allOpen ? next.delete(c.title) : next.add(c.title)));
      return next;
    });
  };

  // Column count per group, so the five roadmap tiles sit on one row rather
  // than wrapping a lone fifth tile onto a line of its own.
  const renderGroup = (categories, title, subtitle, cols) => {
    if (categories.length === 0) return null;
    const open = categories.filter((c) => isOpen(c.title));
    return (
      <section>
        <GroupHeading
          title={title}
          subtitle={subtitle}
          allOpen={categories.every((c) => openSections.has(c.title))}
          onToggleAll={() => toggleAll(categories)}
        />
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${cols}`}>
          {categories.map((c) => (
            <CategoryTile
              key={c.title}
              icon={c.icon}
              title={c.title}
              description={c.description}
              count={c.count}
              tone={c.tone}
              open={isOpen(c.title)}
              onToggle={() => toggleSection(c.title)}
            />
          ))}
        </div>
        {open.length > 0 && (
          <div className="mt-3 space-y-3">
            {open.map((c) => (
              <CategoryPanel key={c.title} category={c} onClose={() => toggleSection(c.title)} />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="fp-enter space-y-6">
      {/* ---- Hero ------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-indigo-50 to-sky-50 p-5 ring-1 ring-violet-100 ring-inset sm:p-7">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-black tracking-[0.11em] text-journey-700 uppercase">
              Ideas &amp; Resources
            </p>
            <h1 className="mt-2 text-3xl leading-tight font-black text-ink-900 sm:text-4xl">
              Fuel your{' '}
              <span className="relative whitespace-nowrap text-journey-600">
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
              <span aria-hidden>✨</span>
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
                <div className="relative shrink-0">
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    aria-label="Filter by source"
                    className="min-h-11 appearance-none rounded-xl border border-line-200 bg-surface py-2.5 pr-9 pl-4 text-sm font-bold text-ink-700 shadow-card focus:border-journey-400 focus:outline-none"
                  >
                    <option value="all">All categories</option>
                    <option value="roadmap">From your roadmap</option>
                    <option value="curated">Curated for you</option>
                  </select>
                  <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-400" />
                </div>
              </div>
            )}
          </div>

          {/* Art, with the mascot at the eyepiece and the encouragement card
              over the corner — both placed by percentage inside a fixed
              aspect ratio so they hold together at every width. */}
          <div className="relative hidden aspect-[4/3] w-full lg:block">
            <ResourcesArt className="h-full w-full" />
            <div className="absolute right-0 bottom-[3%] w-[50%] rounded-2xl border border-violet-100 bg-surface/95 p-3 shadow-float backdrop-blur">
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-white">
                  <Trophy className="h-4 w-4" />
                </span>
                <p className="text-xs leading-snug font-black text-ink-900">
                  Small steps today, big wins tomorrow!
                </p>
              </div>
            </div>
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

          {/* YATICORP's own courses, above everything else.

              The section used to open with Coursera and Udemy links while the
              student sat on courses they had already been given — the platform
              advertising its competitors to its own students. These are picked
              from the real catalogue and validated against it server side. */}
          {showCurated && yaticorpCourses.length > 0 && (
            <section>
              <GroupHeading
                title="From your YATICORP courses"
                subtitle="What you already have access to, and where it fits your goal."
                allOpen
                onToggleAll={() => {}}
              />
              <div className="divide-y divide-line-200 overflow-hidden rounded-2xl border border-journey-200 bg-surface">
                {yaticorpCourses.map((course) => (
                  <Link
                    key={course.courseId}
                    to={`/learn/${course.courseId}`}
                    className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-journey-50"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-journey-50 text-journey-700">
                      <PlayCircle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold break-words text-ink-900">{course.title}</span>
                        {course.enrolled ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-700">
                            {course.progress > 0 ? `${course.progress}% done` : 'Enrolled'}
                          </span>
                        ) : (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[0.68rem] font-bold text-amber-700">
                            Ask the office for access
                          </span>
                        )}
                      </span>
                      {course.why && (
                        <span className="mt-1 block text-xs leading-relaxed break-words text-ink-500">
                          {course.why}
                        </span>
                      )}
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-journey-700" />
                  </Link>
                ))}
              </div>
            </section>
          )}

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
              title={searching ? 'Nothing matches that' : 'Nothing in this category'}
              description={
                searching
                  ? `No resource mentions “${searchQuery}”. Try a shorter or more general term.`
                  : 'Try a different filter, or regenerate your resources.'
              }
              action={
                searching ? (
                  <Button variant="secondary" onClick={() => setSearchQuery('')}>Clear search</Button>
                ) : (
                  <Button variant="secondary" onClick={() => setScope('all')}>Show all categories</Button>
                )
              }
            />
          )}

          {data && (
            <div className="flex justify-center pt-1">
              <Button
                variant="secondary"
                icon={RefreshCw}
                loading={generating}
                loadingText="Curating…"
                onClick={handleGenerate}
              >
                Regenerate resources
              </Button>
            </div>
          )}
        </div>

        <ResourceSidebar user={user} badges={badges} />
      </div>
    </div>
  );
}
