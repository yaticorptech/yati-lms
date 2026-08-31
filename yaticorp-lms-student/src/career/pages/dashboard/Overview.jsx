import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, BarElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  CheckCircle2, Target, Zap, Rocket, ArrowRight, BarChart3, Flame
} from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonPage } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import StreakTile from '../../components/dashboard/StreakTile';
import LevelTile from '../../components/dashboard/LevelTile';
import JobMatchesTile from '../../components/dashboard/JobMatchesTile';
import {
  levelProgress,
  currentStreak,
  recentActivity,
  todaysFocus,
  greeting
} from '../../utils/progress';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

// Shared chart styling so both charts read as one system.
const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  padding: 12,
  cornerRadius: 10,
  titleFont: { family: 'Inter', size: 13, weight: '600' },
  bodyFont: { family: 'Inter', size: 12 },
  displayColors: false
};

/**
 * One bento grid rather than a stack of independent rows.
 *
 * Everything is a cell in the same 12-column grid, so tile edges line up
 * vertically all the way down the page — the alignment is what makes a bento
 * read as designed rather than as four sections that happen to sit near each
 * other. Spans step 2 → 12 across breakpoints so the same tiles reflow to a
 * pair on tablet and a single column on phones.
 */
export default function Overview() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // `/tasks` is today's plan only; anything that spans days (streak, the
        // 7-day strip) has to come from `/tasks/history` or it can never look
        // back past midnight.
        const [taskRes, historyRes, skillRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/tasks/history'),
          api.get('/skills')
        ]);
        setTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data.tasks || []);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
        setSkills(skillRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const pendingTasks = tasks.length - completedTasks;
  const completionPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  if (loading) return <SkeletonPage cards={4} />;

  // Past work still counts as "not new", so a returning student who hasn't had
  // a plan generated yet keeps their momentum tiles instead of the onboarding banner.
  const isNewUser = tasks.length === 0 && history.length === 0 && skills.length === 0;

  // Momentum signals are multi-day by definition, so they read from history
  // (which already includes today's tasks) rather than today's plan.
  const streak = currentStreak(history);
  const activity = recentActivity(history);
  const focus = todaysFocus(tasks);
  const progress = levelProgress(user?.xp, user?.level);
  const avgSkill = skills.length
    ? Math.round(skills.reduce((sum, s) => sum + (Number(s.progress) || 0), 0) / skills.length)
    : 0;

  const skillData = {
    labels: skills.map((s) => s.skillName),
    datasets: [
      {
        label: 'Progress',
        data: skills.map((s) => s.progress),
        backgroundColor: '#3b66f6',
        hoverBackgroundColor: '#1d35d8',
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 18
      }
    ]
  };

  if (isNewUser) {
    return (
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-900 to-slate-900 p-6 text-white shadow-float sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-amber-200">
              <Rocket className="h-3.5 w-3.5" />
              Getting started
            </div>
            <h2 className="text-2xl font-black sm:text-3xl">
              Welcome to Career Path, {user?.name?.split(' ')[0]}
            </h2>
            <p className="mt-2 leading-relaxed text-brand-200">
              Tell us where you are and where you want to go. Your AI mentor will build a
              personalised roadmap, break it into daily tasks, and track your progress.
            </p>
          </div>
          <Link
            to="/career/onboarding"
            className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-surface px-6 py-3 font-bold text-ink-900 transition-colors hover:bg-surface-100"
          >
            Start Onboarding
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
      {/* ---- Row 1: the anchor pair. Streak carries the page; level carries the reward. ---- */}
      <div className="sm:col-span-2 lg:col-span-8">
        <StreakTile name={user?.name} greeting={greeting()} streak={streak} activity={activity} />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <LevelTile level={user?.level || 1} progress={progress} nextTask={focus[0]} />
      </div>

      {/* ---- Row 2: the numbers band, one quarter of the grid each. ---- */}
      <div className="lg:col-span-3">
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={streak}
          accent="amber"
          hint={streak > 0 ? 'Keep it alive today' : 'Complete a task to begin'}
        />
      </div>
      <div className="lg:col-span-3">
        <StatCard
          icon={CheckCircle2}
          label="Tasks Done"
          value={completedTasks}
          accent="emerald"
          hint={`${pendingTasks} still pending today`}
          fill={completionPercent}
        />
      </div>
      <div className="lg:col-span-3">
        <StatCard
          icon={Target}
          label="Skills"
          value={skills.length}
          accent="brand"
          hint={skills.length ? `${avgSkill}% average progress` : 'None tracked yet'}
          fill={avgSkill}
        />
      </div>
      <div className="lg:col-span-3">
        <StatCard
          icon={Zap}
          label="Total XP"
          value={user?.xp || 0}
          accent="violet"
          hint={`${progress.remaining} XP to Level ${progress.nextLevel}`}
          fill={progress.percent}
        />
      </div>

      {/* No "Today's focus" card and no completion doughnut.
          A day is one task now, so the doughnut only ever read 0% or 100% — a
          scoreboard for a game with a single move — and "Today's focus" was a
          shortlist of one, already named in the Level tile's "Up next" and
          again on the planner. Three places telling the student about the same
          single task. */}

      {/* ---- Row 3: where this roadmap leads. Carries its own grid cell and
              renders itself out of the bento entirely when Jobs is locked,
              there is no goal yet, or the index has nothing — absence, never
              an apology. ---- */}
      <JobMatchesTile />

      {/* ---- Row 4: the long view, full bleed across the grid. ---- */}
      <div className="sm:col-span-2 lg:col-span-12">
        <Card hover>
          <CardHeader
            icon={BarChart3}
            title="Skill Progress"
            subtitle="Where your skills stand"
            accent="brand"
            action={
              skills.length > 0 && (
                <span className="rounded-md bg-surface-100 px-2.5 py-1 text-xs font-bold text-ink-600 tabular-nums">
                  {avgSkill}% avg
                </span>
              )
            }
          />
          {skills.length > 0 ? (
            <div style={{ height: Math.max(180, skills.length * 44) }}>
              <Bar
                data={skillData}
                options={{
                  indexAxis: 'y',
                  maintainAspectRatio: false,
                  animation: { duration: 800, easing: 'easeOutQuart' },
                  plugins: {
                    legend: { display: false },
                    tooltip: { ...TOOLTIP_STYLE, callbacks: { label: (c) => `${c.parsed.x}% complete` } }
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      max: 100,
                      grid: { color: '#eef0f4' },
                      border: { display: false },
                      ticks: {
                        font: { family: 'Inter', size: 11 },
                        color: '#94a3b8',
                        callback: (v) => `${v}%`
                      }
                    },
                    y: {
                      grid: { display: false },
                      border: { display: false },
                      ticks: { font: { family: 'Inter', size: 12, weight: '600' }, color: '#475569' }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="No skills tracked yet"
              description="Skills appear here once your AI plan is generated."
              action={
                <Link to="/career/planner">
                  <Button size="sm" variant="secondary">Go to Planner</Button>
                </Link>
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}
