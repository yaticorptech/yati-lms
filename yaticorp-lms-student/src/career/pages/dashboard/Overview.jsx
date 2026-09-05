import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { ArrowRight, Rocket } from 'lucide-react';
import MomentumCard from '../../components/dashboard/MomentumCard';
import SkillSnapshot from '../../components/dashboard/SkillSnapshot';
import JobMatchesTile from '../../components/dashboard/JobMatchesTile';
import JourneyHero from '../../components/journey/JourneyHero';
import NextUp from '../../components/journey/NextUp';
import CareerJourneyStrip from '../../components/game/CareerJourneyStrip';
import { phaseStates } from '../../utils/roadmap';
import {
  levelProgress,
  currentStreak,
  recentActivity,
  todaysFocus,
  greeting,
  weeklyMomentum,
  activeDays,
  dayKey
} from '../../utils/progress';
import YatiLoader from '../../../components/YatiLoader';
import useMinimumLoading from '../../../hooks/useMinimumLoading';


/**
 * The Career Path home screen.
 *
 * Grouped by purpose, top to bottom, so each band answers one question and no
 * two bands answer the same one:
 *
 *   JOURNEY   where am I going, and how far along am I  (the hero)
 *   TODAY     what do I do now, and what does it unlock (mission + next up)
 *   MOMENTUM  what have I built up                      (streak + level)
 *   AHEAD     where this leads                          (job matches)
 *   SKILLS    a three-skill snapshot; the Skills tab has the rest
 *
 * It used to open on a streak and then repeat itself: the streak appeared as a
 * dark hero AND a stat tile, the XP as a ring AND a stat tile, the completion
 * count in two places, and the career goal nowhere at all. Four stat tiles went
 * with the consolidation — every number they carried is still on the page,
 * stated once, in the band that owns it.
 */
export default function Overview() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [skills, setSkills] = useState([]);
  const [goal, setGoal] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // `/tasks` is today's plan only; anything that spans days (streak, the
        // 7-day strip) has to come from `/tasks/history` or it can never look
        // back past midnight.
        //
        // Goal and roadmap are caught individually rather than allowed to
        // reject the batch: both 404 legitimately for a student who has not
        // finished onboarding, and one 404 must not take the streak, the tasks
        // and the skills down with it.
        const [taskRes, historyRes, skillRes, goalRes, roadmapRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/tasks/history'),
          api.get('/skills'),
          api.get('/goals').catch(() => null),
          api.get('/roadmap').catch(() => null)
        ]);
        setTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data.tasks || []);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
        setSkills(skillRes.data);
        setGoal(goalRes?.data || null);
        setRoadmap(roadmapRes?.data || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;

  const showLoader = useMinimumLoading(loading);
  if (showLoader) return <YatiLoader label="Loading your career path" />;

  // Past work still counts as "not new", so a returning student who hasn't had
  // a plan generated yet keeps their momentum tiles instead of the onboarding
  // banner.
  const isNewUser = tasks.length === 0 && history.length === 0 && skills.length === 0 && !goal;

  // Momentum signals are multi-day by definition, so they read from history
  // (which already includes today's tasks) rather than today's plan.
  const streak = currentStreak(history);
  const countedToday = activeDays(history).has(dayKey(new Date()));
  const activity = recentActivity(history);
  const weekly = weeklyMomentum(history);
  const focus = todaysFocus(tasks);
  const progress = levelProgress(user?.xp, user?.level);

  // The phase after the one being worked on — what finishing this one opens.
  const phases = roadmap?.roadmapData?.educationRoadmap || [];
  const currentIndex = phaseStates(phases.length, roadmap?.completedPhases).indexOf('current');
  const nextPhase = currentIndex >= 0 ? phases[currentIndex + 1] : null;

  if (isNewUser) {
    return (
      <section className="fp-journey-gradient animate-fade-in-up relative overflow-hidden rounded-3xl p-6 text-white shadow-float sm:p-12">
        <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="fp-float pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl"
        />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black text-amber-200 ring-1 ring-white/15 ring-inset">
              <Rocket className="h-3.5 w-3.5" />
              Getting started
            </div>
            <h2 className="text-3xl leading-tight font-black sm:text-4xl">
              Welcome to Career Path, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p className="mt-3 leading-relaxed text-journey-100">
              Tell us where you are and where you want to go. Your AI mentor will build a
              personalised roadmap, break it into daily tasks, and track your progress.
            </p>
          </div>
          <Link
            to="/career/onboarding"
            className="fp-press group inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-black text-journey-800 shadow-lg shadow-journey-900/30 transition-transform hover:scale-[1.03]"
          >
            🚀 Start onboarding
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="fp-enter space-y-5">
      {/* ---- JOURNEY: where this is all going. The one loud panel. ---- */}
      {goal && (
        <JourneyHero
          goal={goal}
          roadmapData={roadmap?.roadmapData}
          completedPhases={roadmap?.completedPhases || []}
          name={user?.name}
          greeting={greeting()}
          task={focus[0]}
          completedToday={completedTasks}
          totalToday={tasks.length}
          streak={streak}
          countedToday={countedToday}
        />
      )}

      {/* ---- THE JOURNEY, named ---- */}
      {phases.length > 0 && (
        <CareerJourneyStrip
          phases={phases}
          completedPhases={roadmap?.completedPhases || []}
          goal={goal}
        />
      )}

      {/* ---- TODAY + MOMENTUM ----
              The quest button moved into the hero above, so this row is what
              the student has built up beside what it unlocks — rather than a
              large mission card competing with the panel directly over it. ---- */}
      <div className="grid items-stretch gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MomentumCard
            streak={streak}
            activity={activity}
            level={user?.level || 1}
            progress={progress}
            weekly={weekly}
          />
        </div>
        <NextUp nextPhase={nextPhase} levelProgress={progress} />
      </div>

      {/* ---- SKILLS: a snapshot, not the list. Three bars say work is
              turning into skill; the Skills tab shows the rest. ---- */}
      {skills.length > 0 && <SkillSnapshot skills={skills} />}

      {/* ---- AHEAD: where this roadmap leads. Renders itself out entirely
              when Jobs is locked, there is no goal, or the index has nothing —
              absence, never an apology. ---- */}
      <JobMatchesTile />
    </div>
  );
}
