import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Clock3, Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '../../services/api';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { clockLabel } from '../../utils/calendar';

/**
 * 🏫 The student's weekly class timetable, filled in as a grid.
 *
 * Exactly the shape a timetable is printed in: one row per period with its
 * start and end time, one column per day, a subject in each cell. The student
 * fills the whole week and saves once. Rows can be added or removed, Sunday
 * can be switched on, and an empty cell simply means a free period.
 *
 * Every subject gets its own colour, dealt in name order so it is the same
 * colour in every cell and on every visit — the way a printed timetable is
 * highlighted. The class happening right now is ringed and labelled, and a
 * line above the grid says what is on now and what comes next.
 *
 * The server stores flat slots — one per filled cell — so the grid is rebuilt
 * from them on load: rows are the distinct (start, end) pairs, in time order.
 * `day` follows JavaScript's getDay(): 0 is Sunday.
 */
const DAYS = [
  { day: 1, label: 'Mon', long: 'Monday' },
  { day: 2, label: 'Tue', long: 'Tuesday' },
  { day: 3, label: 'Wed', long: 'Wednesday' },
  { day: 4, label: 'Thu', long: 'Thursday' },
  { day: 5, label: 'Fri', long: 'Friday' },
  { day: 6, label: 'Sat', long: 'Saturday' },
  { day: 0, label: 'Sun', long: 'Sunday' }
];

// Written out in full so Tailwind can see every class it must emit.
const SUBJECT_COLOURS = [
  'bg-violet-100 text-violet-800 ring-violet-200',
  'bg-sky-100 text-sky-800 ring-sky-200',
  'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'bg-amber-100 text-amber-800 ring-amber-200',
  'bg-rose-100 text-rose-800 ring-rose-200',
  'bg-indigo-100 text-indigo-800 ring-indigo-200',
  'bg-teal-100 text-teal-800 ring-teal-200',
  'bg-orange-100 text-orange-800 ring-orange-200',
  'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
  'bg-lime-100 text-lime-800 ring-lime-200',
  'bg-cyan-100 text-cyan-800 ring-cyan-200',
  'bg-pink-100 text-pink-800 ring-pink-200'
];

const norm = (s) => String(s || '').trim().toLowerCase();

/** A colour per distinct subject, stable across visits and cells. */
const coloursFor = (subjects) => {
  const names = [...new Set(subjects.map(norm).filter(Boolean))].sort();
  return new Map(names.map((n, i) => [n, SUBJECT_COLOURS[i % SUBJECT_COLOURS.length]]));
};

// A blank week to start from: six hourly periods from nine, Monday to
// Saturday. Every one of them can be changed.
const DEFAULT_ROWS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((start, i) => ({
  id: `r${i}`,
  start,
  end: `${String(Number(start.slice(0, 2)) + 1).padStart(2, '0')}:00`
}));

let rowSeq = 100;
const newRowId = () => `r${rowSeq++}`;

const cellKey = (rowId, day) => `${rowId}:${day}`;

/** Rows and cells from the server's flat slots. */
function gridFromSlots(slots) {
  const rowsByTime = new Map();
  const cells = {};
  for (const s of slots) {
    const time = `${s.start}-${s.end}`;
    if (!rowsByTime.has(time)) rowsByTime.set(time, { id: newRowId(), start: s.start, end: s.end });
    cells[cellKey(rowsByTime.get(time).id, s.day)] = s.subject;
  }
  const rows = [...rowsByTime.values()].sort((a, b) => a.start.localeCompare(b.start));
  const hasSunday = slots.some((s) => s.day === 0);
  return { rows, cells, hasSunday };
}

/** The server's flat slots from the grid. Empty cells are free periods. */
function slotsFromGrid(rows, cells, days) {
  const out = [];
  for (const row of rows) {
    for (const day of days) {
      const subject = (cells[cellKey(row.id, day)] || '').trim();
      if (subject) out.push({ day, start: row.start, end: row.end, subject });
    }
  }
  return out;
}

/** "HH:MM" of the current moment, for comparing against slot times. */
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function TimetableCard({ slots = [], onChange, embedded = false }) {
  const toast = useToast();
  const todayDay = new Date().getDay();

  const [editing, setEditing] = useState(slots.length === 0);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cells, setCells] = useState({});
  const [showSunday, setShowSunday] = useState(false);
  const [saving, setSaving] = useState(false);
  // Re-read once a minute so "now" moves on without a reload.
  const [now, setNow] = useState(nowHHMM);
  useEffect(() => {
    const t = setInterval(() => setNow(nowHHMM()), 60000);
    return () => clearInterval(t);
  }, []);

  // Rebuild the grid whenever the saved week changes (first load, or a save
  // that came back normalised). While editing, the student's draft wins.
  useEffect(() => {
    if (editing) return;
    if (slots.length === 0) {
      setEditing(true);
      return;
    }
    const g = gridFromSlots(slots);
    setRows(g.rows);
    setCells(g.cells);
    setShowSunday(g.hasSunday);
  }, [slots, editing]);

  const days = useMemo(() => DAYS.filter((d) => showSunday || d.day !== 0), [showSunday]);

  const colours = useMemo(
    () => coloursFor(editing ? Object.values(cells) : slots.map((s) => s.subject)),
    [editing, cells, slots]
  );
  const colourOf = (subject) => colours.get(norm(subject)) || SUBJECT_COLOURS[0];

  // Today's classes in time order, and where "now" falls among them.
  const today = useMemo(
    () => slots.filter((s) => s.day === todayDay).sort((a, b) => a.start.localeCompare(b.start)),
    [slots, todayDay]
  );
  const current = today.find((s) => s.start <= now && now < s.end) || null;
  const next = today.find((s) => s.start > now) || null;
  const isNow = (row, day) => day === todayDay && row.start <= now && now < row.end;

  const startEditing = () => {
    if (slots.length > 0) {
      const g = gridFromSlots(slots);
      setRows(g.rows);
      setCells(g.cells);
      setShowSunday(g.hasSunday);
    }
    setEditing(true);
  };

  const cancel = () => {
    if (slots.length === 0) {
      setRows(DEFAULT_ROWS);
      setCells({});
      return;
    }
    setEditing(false);
  };

  const setRow = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => {
    const last = rows[rows.length - 1];
    const start = last ? last.end : '09:00';
    const h = Math.min(23, Number(start.slice(0, 2)) + 1);
    const end = `${String(h).padStart(2, '0')}:${start.slice(3)}`;
    setRows((rs) => [...rs, { id: newRowId(), start, end: end > start ? end : '23:59' }]);
  };

  const removeRow = (id) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    setCells((c) => {
      const rest = { ...c };
      for (const k of Object.keys(rest)) if (k.startsWith(`${id}:`)) delete rest[k];
      return rest;
    });
  };

  const setCell = (rowId, day, value) => setCells((c) => ({ ...c, [cellKey(rowId, day)]: value }));

  const save = async () => {
    for (const [i, r] of rows.entries()) {
      if (!r.start || !r.end || r.end <= r.start) {
        toast.error(`Period ${i + 1} has to end after it starts.`);
        return;
      }
    }
    const nextSlots = slotsFromGrid(rows, cells, days.map((d) => d.day));
    setSaving(true);
    try {
      const { data } = await api.put('/timetable', { slots: nextSlots });
      onChange?.(Array.isArray(data?.slots) ? data.slots : nextSlots);
      setEditing(false);
      toast.success(
        nextSlots.length
          ? `${nextSlots.length} ${nextSlots.length === 1 ? 'class' : 'classes'} a week saved.`
          : 'Timetable cleared.',
        'Timetable'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save your timetable.');
    } finally {
      setSaving(false);
    }
  };

  const filled = useMemo(
    () => slotsFromGrid(rows, cells, days.map((d) => d.day)).length,
    [rows, cells, days]
  );

  const inputCls =
    'w-full rounded-lg border border-line-300 bg-surface px-2 py-1.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:outline-none';

  // Inside the Learning calendar card the card already has a header and a
  // frame, so only the controls and the grid are drawn.
  const Shell = embedded ? 'div' : 'section';
  const shellCls = embedded
    ? 'animate-fade-in'
    : 'animate-fade-in-up rounded-2xl border border-line-200/80 bg-surface p-5 shadow-card sm:p-6';

  return (
    <Shell className={shellCls}>
      {/* ---- Controls ---- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {!embedded && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-link ring-1 ring-brand-100 ring-inset">
              <CalendarClock className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            {!embedded && <h3 className="text-lg font-bold text-ink-900">Class timetable</h3>}
            {editing ? (
              <p className="text-sm text-ink-500">
                One row per period, a subject in each box. Leave free periods empty.
              </p>
            ) : today.length > 0 ? (
              /* What is on now and what is next — the two things a student
                 actually opens a timetable to find out. */
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-journey-500" />
                  {current ? (
                    <>
                      <span className="font-black text-ink-900">Now:</span> {current.subject}{' '}
                      <span className="text-ink-400">until {clockLabel(current.end)}</span>
                    </>
                  ) : next ? (
                    <span className="font-black text-ink-900">Free now</span>
                  ) : (
                    <span className="font-black text-ink-900">Classes are done for today</span>
                  )}
                </span>
                {next && (
                  <span>
                    <span className="font-black text-ink-900">Next:</span> {next.subject}{' '}
                    <span className="text-ink-400">at {clockLabel(next.start)}</span>
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-ink-500">No classes today. Enjoy the free day.</p>
            )}
          </div>
        </div>

        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-ink-600">
              <input
                type="checkbox"
                checked={showSunday}
                onChange={(e) => setShowSunday(e.target.checked)}
                className="h-4 w-4 rounded border-line-300 accent-[#6c3bff]"
              />
              Include Sunday
            </label>
            <Button size="sm" variant="secondary" icon={X} onClick={cancel}>
              Cancel
            </Button>
            <Button size="sm" icon={Check} loading={saving} loadingText="Saving…" onClick={save}>
              Save timetable
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" icon={Pencil} onClick={startEditing}>
            Edit timetable
          </Button>
        )}
      </div>

      {/* ---- The week, all of it, no sideways scroll ---- */}
      <div className="w-full">
        <table className="w-full table-fixed border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th
                scope="col"
                className={`rounded-xl px-2 py-2.5 text-left text-[0.62rem] font-black tracking-[0.14em] text-ink-400 uppercase ${
                  editing ? 'w-[5.6rem]' : 'w-[5.4rem]'
                }`}
              >
                Period
              </th>
              {days.map((d, c) => {
                const isToday = d.day === todayDay;
                return (
                  <th
                    key={d.day}
                    scope="col"
                    title={d.long}
                    style={{ animationDelay: `${c * 40}ms` }}
                    className={`animate-fade-in-up rounded-xl px-1 py-2.5 text-center text-[0.68rem] font-black tracking-[0.14em] uppercase ${
                      isToday
                        ? 'bg-gradient-to-b from-journey-600 to-indigo-600 text-white shadow-md shadow-journey-500/25'
                        : 'bg-surface-50 text-ink-500'
                    }`}
                  >
                    {d.label}
                  </th>
                );
              })}
              {editing && <th scope="col" className="w-7" aria-label="Remove period" />}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <th
                  scope="row"
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-fade-in-up rounded-xl bg-surface-50 px-1.5 py-1.5 text-left align-middle"
                >
                  {editing ? (
                    <div className="flex flex-col gap-1">
                      <input
                        type="time"
                        value={row.start}
                        aria-label={`Period ${i + 1} start`}
                        onChange={(e) => setRow(row.id, { start: e.target.value })}
                        className={`${inputCls} px-1 py-1 text-[0.7rem] tabular-nums`}
                      />
                      <input
                        type="time"
                        value={row.end}
                        aria-label={`Period ${i + 1} end`}
                        onChange={(e) => setRow(row.id, { end: e.target.value })}
                        className={`${inputCls} px-1 py-1 text-[0.7rem] tabular-nums`}
                      />
                    </div>
                  ) : (
                    <span className="block">
                      <span className="text-[0.6rem] font-black tracking-[0.12em] text-journey-600 uppercase">
                        P{i + 1}
                      </span>
                      <span className="block text-[0.7rem] leading-snug font-black tabular-nums text-ink-800">
                        {clockLabel(row.start)}
                      </span>
                      <span className="block text-[0.66rem] leading-snug font-semibold tabular-nums text-ink-400">
                        {clockLabel(row.end)}
                      </span>
                    </span>
                  )}
                </th>

                {days.map((d, c) => {
                  const value = cells[cellKey(row.id, d.day)] || '';
                  const isToday = d.day === todayDay;
                  const live = !editing && value && isNow(row, d.day);
                  // Row by row, left to right, 30ms apart: the week draws
                  // itself in the order it is read.
                  const delay = `${i * days.length * 30 + c * 30 + 80}ms`;
                  return (
                    <td
                      key={d.day}
                      style={{ animationDelay: delay }}
                      className={`animate-fade-in-up rounded-xl align-middle ${isToday && !editing ? 'bg-journey-50/40' : ''}`}
                    >
                      {editing ? (
                        <input
                          value={value}
                          maxLength={80}
                          aria-label={`${d.long}, period ${i + 1}`}
                          placeholder="—"
                          onChange={(e) => setCell(row.id, d.day, e.target.value)}
                          className={`${inputCls} px-1.5 text-center text-xs font-semibold ${
                            value ? `${colourOf(value)} border-transparent ring-1 ring-inset` : ''
                          } ${isToday && !value ? 'bg-journey-50/40' : ''}`}
                        />
                      ) : value ? (
                        <span
                          title={live ? `${value} — happening now` : value}
                          className={`relative flex min-h-[3rem] items-center justify-center rounded-xl px-1.5 py-2 text-center text-xs leading-snug font-bold ring-1 ring-inset transition-transform ${colourOf(
                            value
                          )} ${live ? 'fp-breathe scale-[1.04] shadow-md ring-2 ring-journey-500' : 'hover:-translate-y-0.5 hover:shadow-sm'}`}
                        >
                          {/* Clipped to the box: a name with no spaces cannot
                              wrap on its own, so it is allowed to break
                              anywhere and capped at three lines. */}
                          <span className="line-clamp-3 min-w-0 max-w-full [overflow-wrap:anywhere]">
                            {value}
                          </span>
                          {live && (
                            <span className="animate-pop-in absolute -top-1.5 -right-1.5 rounded-full bg-journey-600 px-1.5 py-0.5 text-[0.55rem] font-black tracking-wide text-white uppercase shadow">
                              Now
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex min-h-[3rem] items-center justify-center rounded-xl border border-dashed border-line-200 px-1.5 py-2 text-center text-[0.66rem] font-semibold text-ink-300">
                          Free
                        </span>
                      )}
                    </td>
                  );
                })}

                {editing && (
                  <td className="align-middle">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      aria-label={`Remove period ${i + 1}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Button size="sm" variant="secondary" icon={Plus} onClick={addRow}>
            Add a period
          </Button>
          <p className="text-xs font-semibold text-ink-500 tabular-nums">
            {filled} {filled === 1 ? 'class' : 'classes'} filled in
          </p>
        </div>
      )}
    </Shell>
  );
}
