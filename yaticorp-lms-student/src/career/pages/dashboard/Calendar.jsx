import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, SkipForward, CalendarDays,
  Plus, Pencil, Trash2, Check
} from 'lucide-react';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { SkeletonPage } from '../../components/ui/Skeleton';
import { monthBounds, monthLabel, monthIndexOfDate } from '../../utils/calendar';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Mirrors the enum on the CalendarEvent model. A value the server rejects
// must never be offerable here.
const EVENT_TYPES = ['Exam', 'Assignment', 'Class', 'Holiday', 'Other'];

/** Local YYYY-MM-DD, the key tasks are bucketed under. */
const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUS_DOT = {
  Completed: 'bg-emerald-500',
  Skipped: 'bg-rose-400',
  Pending: 'bg-brand-400'
};

export default function CalendarView() {
  const [tasks, setTasks] = useState([]);
  // The student's own exams and events, kept apart from tasks: these are typed
  // in by hand and nothing but this page ever writes them.
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [selectedKey, setSelectedKey] = useState(dayKey(new Date()));

  // The editor. `editingId` null means the form would create; an id means it
  // would replace that event.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', type: 'Exam', notes: '' });
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    // History, not /tasks — the planner endpoint returns today only, which would
    // leave every other square on the calendar empty.
    Promise.allSettled([
      api
        .get('/tasks/history')
        .then(({ data }) => setTasks(Array.isArray(data) ? data : data.tasks || [])),
      api.get('/events').then(({ data }) => setEvents(Array.isArray(data) ? data : []))
    ]).finally(() => setLoading(false));
  }, []);

  // Tasks grouped by the day they belong to, so a square can render its real
  // workload instead of a decorative dot.
  //
  // Status is deliberately not consulted. A day the student was given work and
  // ignored is still a day on their calendar — showing only completed days
  // would quietly erase the weeks they struggled through, which is the part
  // worth being able to look back at.
  const byDay = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      // Tasks created before the daily planner existed carry no assignedDate.
      // Skipping them made those tasks invisible AND shrank the month range to
      // "this month only", so a student with real history saw an empty
      // calendar and no way to page back to it.
      const date = task.assignedDate || task.createdAt;
      if (!date) continue;

      const key = dayKey(date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    }
    return map;
  }, [tasks]);

  /** The student's events, bucketed by the same YYYY-MM-DD key as the tasks. */
  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const event of events) {
      if (!event.date) continue;
      if (!map.has(event.date)) map.set(event.date, []);
      map.get(event.date).push(event);
    }
    return map;
  }, [events]);

  // Only `min` is used for navigation — see canGoBack below. Events count
  // towards it as well as tasks, so an event saved in an earlier month keeps
  // that month reachable.
  const bounds = useMemo(
    () => monthBounds([...byDay.keys(), ...eventsByDay.keys()]),
    [byDay, eventsByDay]
  );

  const resetForm = () => {
    setForm({ title: '', type: 'Exam', notes: '' });
    setEditingId(null);
    setFormOpen(false);
  };

  const startAdding = () => {
    setForm({ title: '', type: 'Exam', notes: '' });
    setEditingId(null);
    setFormOpen(true);
  };

  const startEditing = (event) => {
    setForm({ title: event.title, type: event.type || 'Exam', notes: event.notes || '' });
    setEditingId(event._id);
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    setSaving(true);
    try {
      if (editingId) {
        const { data } = await api.put(`/events/${editingId}`, { ...form, title });
        setEvents((prev) => prev.map((event) => (event._id === editingId ? data : event)));
        toast.success('Your change has been saved.', 'Event updated');
      } else {
        const { data } = await api.post('/events', { ...form, title, date: selectedKey });
        setEvents((prev) => [...prev, data]);
        toast.success(`"${title}" is on your calendar.`, 'Event added');
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save this event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    const ok = await confirm({
      title: 'Delete this event?',
      message: `"${event.title}" will be removed from your calendar.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep it',
      destructive: true
    });
    if (!ok) return;

    try {
      await api.delete(`/events/${event._id}`);
      setEvents((prev) => prev.filter((item) => item._id !== event._id));
      if (editingId === event._id) resetForm();
      toast.success('Removed from your calendar.', 'Event deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete this event.');
    }
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cursorIndex = year * 12 + month;

  // Backwards is bounded at the first month with anything in it: months before
  // the student existed can never gain content, so paging into them is only
  // ever a dead end.
  //
  // Forwards is not bounded at all. It was, at the last month with content —
  // which made planning impossible: you could not reach December to write down
  // your finals, because reaching December required already having something
  // in December. A future month is empty until somebody fills it, and filling
  // it is the whole point.
  const canGoBack = cursorIndex > bounds.min;
  const isThisMonth = cursorIndex === monthIndexOfDate(new Date());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const todayKey = dayKey(new Date());

  const squares = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const selectedTasks = byDay.get(selectedKey) || [];
  const selectedEvents = eventsByDay.get(selectedKey) || [];

  // "since August 2026" — the month the first plan landed in.
  const startedLabel = monthLabel(bounds.firstKey);

  if (loading) return <SkeletonPage cards={2} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title="Learning Calendar"
        subtitle={
          bounds.firstKey
            ? `Your plans since ${startedLabel} — and any month ahead, to note down exams and events.`
            : 'Your plans day by day, and any month ahead to note down exams and events.'
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="animate-fade-in-up lg:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-lg font-bold text-ink-900 sm:text-xl">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              {/* Once you can page forward indefinitely you need a way back —
                  eleven clicks to return from next August is not a way back. */}
              {!isThisMonth && (
                <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
                  Today
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                aria-label="Previous month"
                disabled={!canGoBack}
                title={canGoBack ? undefined : 'Nothing on your calendar before this month'}
                onClick={() => setCursor(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Next month"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-ink-500 sm:text-sm">
                {/* One letter on phones, where 7 columns leave ~40px each. */}
                <span className="sm:hidden">{d.charAt(0)}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {squares.map((day, idx) => {
              if (!day) return <div key={idx} className="min-h-[52px] rounded-md sm:min-h-[80px]" />;

              const key = dayKey(new Date(year, month, day));
              const dayTasks = byDay.get(key) || [];
              const dayEvents = eventsByDay.get(key) || [];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedKey(key);
                    // A half-typed event belongs to the day it was started on.
                    resetForm();
                  }}
                  aria-label={`${day} ${MONTHS[month]}, ${dayTasks.length} ${
                    dayTasks.length === 1 ? 'task' : 'tasks'
                  }${dayEvents.length ? `, ${dayEvents.length} of your own events` : ''}`}
                  aria-pressed={isSelected}
                  className={`min-h-[52px] rounded-md border p-1 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:min-h-[80px] sm:rounded-lg sm:p-2 ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200'
                      : 'border-line-200/80 bg-surface hover:border-brand-300 hover:bg-brand-50/30'
                  }`}
                >
                  <span
                    className={`text-xs font-medium sm:text-sm ${
                      isToday
                        ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white sm:h-6 sm:w-6'
                        : 'text-ink-700'
                    }`}
                  >
                    {day}
                  </span>

                  {/* Real workload: one dot per task, capped so a heavy day does
                      not overflow its square. */}
                  {dayTasks.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {dayTasks.slice(0, 4).map((t) => (
                        <span
                          key={t._id}
                          className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[t.status] || STATUS_DOT.Pending}`}
                        />
                      ))}
                      {dayTasks.length > 4 && (
                        <span className="text-[10px] leading-none font-bold text-ink-400">
                          +{dayTasks.length - 4}
                        </span>
                      )}
                    </span>
                  )}

                  {/* The student's own entries. A named chip rather than a dot:
                      an exam is the thing they came to this page to check, and
                      a fifth colour of dot would not tell them which day. */}
                  {dayEvents.length > 0 && (
                    <span className="mt-1 flex flex-col gap-0.5">
                      <span className="truncate rounded bg-violet-100 px-1 py-px text-[10px] leading-tight font-bold text-violet-700">
                        {dayEvents[0].title}
                      </span>
                      {dayEvents.length > 1 && (
                        <span className="text-[10px] leading-none font-bold text-violet-500">
                          +{dayEvents.length - 1} more
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 border-t border-line-100 pt-4 text-xs text-ink-500">
            {[
              ['bg-emerald-500', 'Completed'],
              ['bg-brand-400', 'Pending'],
              ['bg-rose-400', 'Missed']
            ].map(([dot, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </Card>

        <Card className="animate-fade-in-up">
          <h3 className="mb-4 font-bold text-ink-900">
            {new Date(selectedKey + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </h3>

          {selectedTasks.length === 0 && selectedEvents.length === 0 && !formOpen ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing planned"
              description="No tasks were assigned for this day. Add an exam or an event of your own."
              action={
                <Button size="sm" icon={Plus} onClick={startAdding}>
                  Add exam or event
                </Button>
              }
            />
          ) : selectedTasks.length === 0 ? null : (
            <ul className="space-y-2.5">
              {selectedTasks.map((task) => {
                const done = task.status === 'Completed';
                const missed = task.status === 'Skipped';

                return (
                  <li
                    key={task._id}
                    className="flex items-start gap-3 rounded-lg border border-line-200/80 bg-surface-50/70 p-3"
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    ) : missed ? (
                      <SkipForward className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-300" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          done ? 'text-ink-400 line-through' : 'text-ink-700'
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ---- The student's own entries ---- */}
          {(selectedEvents.length > 0 || formOpen) && (
            <div className={selectedTasks.length > 0 ? 'mt-5 border-t border-line-100 pt-5' : ''}>
              <p className="mb-2.5 text-[0.7rem] font-bold tracking-[0.11em] text-ink-400 uppercase">
                Your events
              </p>

              <ul className="space-y-2">
                {selectedEvents.map((event) => (
                  <li
                    key={event._id}
                    className="rounded-lg border border-violet-100 bg-violet-50/50 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold break-words text-ink-900">{event.title}</p>
                        <span className="mt-1 inline-block rounded bg-surface px-1.5 py-0.5 text-[0.65rem] font-bold text-violet-700 ring-1 ring-violet-100 ring-inset">
                          {event.type}
                        </span>
                        {event.notes && (
                          <p className="mt-1.5 text-sm leading-relaxed break-words text-ink-600">
                            {event.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEditing(event)}
                          aria-label={`Edit ${event.title}`}
                          className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-surface hover:text-link"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(event)}
                          aria-label={`Delete ${event.title}`}
                          className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-surface hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {formOpen ? (
                <form
                  onSubmit={handleSave}
                  className="animate-fade-in mt-3 space-y-3 rounded-xl border border-line-200 bg-surface-50/70 p-3.5"
                >
                  <div>
                    <label
                      htmlFor="event-title"
                      className="mb-1 block text-xs font-bold text-ink-600"
                    >
                      What is it?
                    </label>
                    <input
                      id="event-title"
                      autoFocus
                      value={form.title}
                      maxLength={120}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Maths unit test"
                      className="w-full rounded-lg border border-line-300 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="event-type"
                      className="mb-1 block text-xs font-bold text-ink-600"
                    >
                      Type
                    </label>
                    <select
                      id="event-type"
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full rounded-lg border border-line-300 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="event-notes"
                      className="mb-1 block text-xs font-bold text-ink-600"
                    >
                      Notes <span className="font-medium text-ink-400">(optional)</span>
                    </label>
                    <textarea
                      id="event-notes"
                      rows={2}
                      maxLength={500}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Syllabus, room number, anything you'll want to remember"
                      className="w-full resize-y rounded-lg border border-line-300 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      icon={Check}
                      loading={saving}
                      loadingText="Saving…"
                      disabled={!form.title.trim()}
                    >
                      {editingId ? 'Save changes' : 'Save event'}
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={startAdding}
                >
                  Add another
                </Button>
              )}
            </div>
          )}

          {/* A day that already has tasks still needs a way in. */}
          {selectedTasks.length > 0 && selectedEvents.length === 0 && !formOpen && (
            <Button className="mt-4" size="sm" variant="secondary" icon={Plus} onClick={startAdding}>
              Add exam or event
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
