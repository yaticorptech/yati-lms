import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ResourceSection, ResourceRow } from '../../components/recommendations/ResourceAccordion';
import {
  Search, Sparkles, RefreshCw, X, Lightbulb, Target, BookMarked,
  Hammer, GraduationCap, Briefcase, MonitorPlay, BadgeCheck, BookOpen, Coins,
  Code2, TvMinimalPlay, Compass, ArrowRight, PlayCircle
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

/** A heading over a run of sections, so two sources never read as one list. */
function GroupHeading({ title, subtitle }) {
  return (
    <div className="px-1 pt-2">
      <h2 className="text-[0.7rem] font-bold tracking-[0.11em] text-ink-400 uppercase">{title}</h2>
      <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>
    </div>
  );
}

/**
 * The roadmap's plain lists — skills, subjects, projects, exams, advice.
 *
 * These were one full-width accordion row per item, each repeating its own
 * category underneath it: nineteen skills became nineteen rows and the word
 * "Technical" printed eight times, a screen and a half of scrolling to read
 * nineteen short labels.
 *
 * Grouped instead. The category is stated once as a heading, and the items sit
 * in two columns — the same content in roughly a quarter of the height, and
 * sorted into kinds rather than run together.
 */
function LabelledGroups({ groups }) {
  return (
    <li>
      <div className="divide-y divide-line-100">
        {groups.map(([kind, items]) => (
          <div key={kind || 'all'} className="px-4 py-3.5">
            {kind && (
              <p className="mb-2 text-[0.65rem] font-bold tracking-[0.11em] text-ink-400 uppercase">
                {kind}
              </p>
            )}
            <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {items.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                  <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </li>
  );
}

export default function Recommendations() {
  const [data, setData] = useState(null);
  // The roadmap carries its own reference lists — skills, subjects,
  // projects, exams, advice. They used to stack up underneath the roadmap
  // itself, burying the path under six cards of things to look up. This is the
  // page for looking things up, so they live here now.
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Which categories are open. Empty to start: the point of collapsing is that
  // the whole catalogue is visible at once before anything is expanded.
  const [openSections, setOpenSections] = useState(() => new Set());
  const toast = useToast();

  const fetchRecs = async () => {
    const res = await api.get('/recommendations');
    setData(res.data);
  };

  useEffect(() => {
    // Settled, not all: a missing roadmap must not blank out the recommendations
    // and vice versa. Either one alone is still a usable page.
    Promise.allSettled([
      api.get('/recommendations').then((res) => setData(res.data)),
      api.get('/roadmap').then((res) => setRoadmap(res.data?.roadmapData || null))
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

  const toggleSection = (title) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  // Collected while rendering so the page can tell "no results" from "no data".
  let matchCount = 0;

  /**
   * A section of plain labelled lists rather than expandable rows.
   *
   * `groups` is [[kind, items], ...]; a kind with nothing in it, or nothing
   * matching the search, is dropped rather than left as an empty heading.
   */
  const renderLabelledSection = (title, icon, groups) => {
    const query = searchQuery.toLowerCase();
    const filtered = groups
      .map(([kind, items]) => [
        kind,
        (items || []).filter((item) => String(item).toLowerCase().includes(query))
      ])
      .filter(([, items]) => items.length > 0);

    const count = filtered.reduce((total, [, items]) => total + items.length, 0);
    if (count === 0) return null;

    matchCount += count;
    const open = searching || openSections.has(title);

    return (
      <ResourceSection
        key={title}
        icon={icon}
        title={title}
        count={count}
        open={open}
        onToggle={() => toggleSection(title)}
      >
        <LabelledGroups groups={filtered} />
      </ResourceSection>
    );
  };

  const renderSection = (title, icon, items, renderProps) => {
    if (!items || items.length === 0) return null;

    const filtered = items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length === 0) return null;

    matchCount += filtered.length;

    // While searching, every surviving section is forced open — matches hidden
    // behind a closed header would make the search look broken.
    const open = searching || openSections.has(title);

    return (
      <ResourceSection
        key={title}
        icon={icon}
        title={title}
        count={filtered.length}
        open={open}
        onToggle={() => toggleSection(title)}
      >
        {filtered.map((item, i) => (
          <ResourceRow key={i} {...renderProps(item)} />
        ))}
      </ResourceSection>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Ideas & Resources"
          title="Smart Recommendations"
          subtitle="Everything worth looking up, in one place."
        />
        <SkeletonList rows={6} />
      </div>
    );
  }

  const roadmapSkills = [
    ['Technical', roadmap?.skills?.technical],
    ['Soft skills', roadmap?.skills?.soft],
    ['Life skills', roadmap?.skills?.life]
  ];
  const roadmapStudy = [
    ['Subjects', roadmap?.subjects],
    ['Courses', roadmap?.courses]
  ];
  const roadmapBuild = [
    ['Projects', roadmap?.projects],
    ['Internships', roadmap?.internships]
  ];
  const roadmapExams = [
    ['Entrance exams', roadmap?.entranceExams],
    ['Certifications', roadmap?.certifications]
  ];
  // One unlabelled group: a heading over a single list only repeats its title.
  const roadmapTips = [[null, roadmap?.careerTips]];

  const hasRoadmapMaterial = [
    roadmapSkills,
    roadmapStudy,
    roadmapBuild,
    roadmapExams,
    roadmapTips
  ].some((groups) => groups.some(([, items]) => items?.length > 0));

  // Collected as an array rather than a fragment. Each group is wrapped in a
  // bordered container now, and a search that filters every section out of a
  // group would otherwise leave an empty box sitting under its heading.
  const roadmapSections = [
    renderLabelledSection('Skills to build', Target, roadmapSkills),
    renderLabelledSection('What to study', BookMarked, roadmapStudy),
    renderLabelledSection('What to build', Hammer, roadmapBuild),
    renderLabelledSection('Exams & certifications', GraduationCap, roadmapExams),
    renderLabelledSection('Advice worth keeping', Lightbulb, roadmapTips)
  ].filter(Boolean);

  // ---- Curated by the mentor ------------------------------------------
  // No colleges section: removed from this page entirely. The mentor may still
  // return a colleges array; it is simply not rendered here.
  // Same reasoning as roadmapSections above: an array so an emptied group
  // can be skipped rather than rendered as a bare bordered box.
  // Filtered by the same search box as every other section on the page, so a
  // search that finds nothing does not leave this block sitting there unfiltered.
  const yaticorpCourses = (data?.yaticorpCourses || []).filter((course) =>
    JSON.stringify(course).toLowerCase().includes(searchQuery.toLowerCase())
  );
  matchCount += yaticorpCourses.length;

  const recommendationSections = (data ? [
    renderSection('Internships & Programmes', Briefcase, data.internships, (item) => ({
        tag: item.stage,
        title: item.title,
        subtitle: item.organisation,
        badges: [item.mode, item.duration, item.stipend],
        description: item.eligibility,
        link: item.link,
        details: (
          <>
            {item.whenToApply && (
              <p>
                <strong>When to apply:</strong> {item.whenToApply}
              </p>
            )}
            {item.stipend && (
              <p>
                <strong>Stipend:</strong> {item.stipend}
              </p>
            )}
          </>
        )
      })),
    renderSection('Recommended Courses', MonitorPlay, data.courses, (item) => ({
        title: item.title,
        subtitle: item.provider,
        badges: [item.difficulty, item.pricing],
        description: item.skills ? `Skills: ${item.skills}` : null,
        link: item.link,
        details: item.duration ? (
          <p>
            <strong>Duration:</strong> {item.duration}
          </p>
        ) : null
      })),
    renderSection('Certifications', BadgeCheck, data.certifications, (item) => ({
        title: item.title,
        subtitle: item.provider,
        description: item.description,
        link: item.link
      })),
    renderSection('Must-Read Books', BookOpen, data.books, (item) => ({
        title: item.title,
        subtitle: item.author ? `By ${item.author}` : null,
        description: item.description,
        link: item.link,
        details: item.why ? (
          <p>
            <strong>Why read this:</strong> {item.why}
          </p>
        ) : null
      })),
    renderSection('Scholarships', Coins, data.scholarships, (item) => ({
        title: item.name,
        badges: [item.deadline ? `Deadline: ${item.deadline}` : null],
        description: item.eligibility,
        link: item.link
      })),
    renderSection('Practice Platforms', Code2, data.practiceResources, (item) => ({
        title: item.name,
        badges: [item.type],
        link: item.link
      })),
    renderSection('Educational Channels', TvMinimalPlay, data.youtubeChannels, (item) => ({
        title: item.name,
        description: item.description,
        link: item.link
      })),
    renderSection('Career Advice', Compass, data.careerTips, (item) => ({
        title: item.title,
        description: item.description
      }))
  ] : []).filter(Boolean);

  const nothingAtAll = !data && !hasRoadmapMaterial;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ideas & Resources"
        title="Smart Recommendations"
        subtitle="Everything worth looking up — drawn from your roadmap and curated by your mentor."
        action={
          data && (
            <Button
              variant="secondary"
              icon={RefreshCw}
              loading={generating}
              loadingText="Curating…"
              onClick={handleGenerate}
            >
              Regenerate
            </Button>
          )
        }
      />

      {!nothingAtAll && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search every resource…"
            aria-label="Search resources"
            className="w-full rounded-xl border border-line-200 bg-surface py-2.5 pr-10 pl-10 text-sm text-ink-900 shadow-card transition-colors placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
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
      )}

      {nothingAtAll && (
        <EmptyState
          icon={Lightbulb}
          title="Nothing to show yet"
          description="Build your roadmap first, then let your AI mentor put together internships, courses, books and scholarships that fit your goal."
          action={
            <Button
              icon={Sparkles}
              loading={generating}
              loadingText="Curating…"
              onClick={handleGenerate}
            >
              Get recommendations
            </Button>
          }
        />
      )}

      {/* No colleges group. Where to apply is a decision made once, not a
          resource looked up while studying — it does not belong on the page a
          student opens to find something to work on. */}

      {/* YATICORP's own courses, above everything else on the page.

          The section used to open with Coursera and Udemy links while the
          student sat on courses they had already been given — the platform was
          advertising its competitors to its own students. These are picked by
          the mentor from the real catalogue and validated against it server
          side, so every row here opens a course this account can actually use. */}
      {yaticorpCourses.length > 0 && (
        <div className="space-y-2.5">
          <GroupHeading
            title="From your YATICORP courses"
            subtitle="What you already have access to, and where it fits your goal."
          />
          <div className="divide-y divide-line-200 overflow-hidden rounded-xl border border-brand-200 bg-surface">
            {yaticorpCourses.map((course) => (
              <Link
                key={course.courseId}
                to={`/learn/${course.courseId}`}
                className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-brand-50"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-link">
                  <PlayCircle className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold break-words text-ink-900">{course.title}</span>
                    {course.enrolled ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700">
                        {course.progress > 0 ? `${course.progress}% done` : 'Enrolled'}
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
                        Ask the office for access
                      </span>
                    )}
                  </span>
                  {course.why && (
                    <span className="mt-1 block text-xs leading-relaxed break-words text-ink-500">
                      {course.why}
                    </span>
                  )}
                  {course.when && (
                    <span className="mt-1 block text-[0.68rem] font-semibold text-ink-400">
                      When: {course.when}
                    </span>
                  )}
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-link" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {roadmapSections.length > 0 && (
        <div className="space-y-2.5">
          <GroupHeading title="From your roadmap" subtitle="The path you're on, and what it asks for." />
          <div className="divide-y divide-line-200 overflow-hidden rounded-xl border border-line-200 bg-surface">{roadmapSections}</div>
        </div>
      )}

      {recommendationSections.length > 0 && (
        <div className="space-y-2.5">
          <GroupHeading
            title="Curated for you"
            subtitle="Specific, named opportunities your mentor found — most link straight out."
          />
          <div className="divide-y divide-line-200 overflow-hidden rounded-xl border border-line-200 bg-surface">{recommendationSections}</div>
        </div>
      )}

      {/* Roadmap material but nothing curated yet: offer the second half rather
          than leaving the page looking finished. */}
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

      {/* Rendering the sections is what counts the matches, so this check has to
          come after them — hence reading matchCount below the markup above. */}
      {!nothingAtAll && searching && matchCount === 0 && (
        <EmptyState
          icon={Search}
          title="Nothing matches that"
          description={`No resource mentions “${searchQuery}”. Try a shorter or more general term.`}
          action={
            <Button variant="secondary" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          }
        />
      )}
    </div>
  );
}
