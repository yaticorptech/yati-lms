import { useId } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Trophy } from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';

/**
 * A month's shape, as a filled curve.
 *
 * Real series: each point is a week of the month on screen and its height is
 * what actually happened. The fill is what makes it readable — a real month is
 * mostly quiet with a few busy days in it, and a bare line through that is a
 * flat trace with one spike, which looks like a fault in the chart rather than
 * like the week the work happened. Given body by an area beneath it, the same
 * data reads as a hill.
 *
 * Weekly buckets, because thirty-one points inside eighty pixels is a texture,
 * not a trend.
 */
function Sparkline({ values, stroke, fillFrom }) {
  const uid = useId().replace(/:/g, '');
  if (!values.length) return null;

  const BUCKETS = 7;
  const size = Math.ceil(values.length / BUCKETS);
  const points = [];
  for (let i = 0; i < values.length; i += size) {
    points.push(values.slice(i, i + size).reduce((sum, v) => sum + v, 0));
  }
  if (points.length === 1) points.push(points[0]);

  const width = 88;
  const height = 28;
  const max = Math.max(1, ...points);
  const stepX = width / (points.length - 1);
  const coords = points.map((v, i) => [i * stepX, height - 3 - (v / max) * (height - 7)]);

  // Smooth rather than a polyline: with seven points the corners of a polyline
  // are the loudest thing in the card, which draws the eye to the bucket
  // boundaries instead of to the shape.
  let line = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const [px, py] = coords[i - 1];
    const [x, y] = coords[i];
    const cx = (px + x) / 2;
    line += ` C ${cx.toFixed(1)} ${py.toFixed(1)}, ${cx.toFixed(1)} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      className="h-7 w-[88px] shrink-0"
    >
      <defs>
        <linearGradient id={`sk-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillFrom} stopOpacity="0.45" />
          <stop offset="100%" stopColor={fillFrom} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sk-${uid})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Solid discs with a white glyph, one per meaning: green for finished, blue for
// still open, pink for the student's own events, amber for what they earned.
const CARDS = [
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    disc: 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-500/30',
    stroke: '#10b981'
  },
  {
    key: 'pending',
    label: 'Pending',
    icon: Clock3,
    disc: 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-blue-500/30',
    stroke: '#3b82f6'
  },
  {
    key: 'events',
    label: 'Events',
    icon: CalendarDays,
    disc: 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-pink-500/30',
    stroke: '#f43f5e'
  },
  {
    key: 'xp',
    label: 'XP earned',
    icon: Trophy,
    disc: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30',
    stroke: '#f59e0b'
  }
];

function StatTile({ card, value, series, hint }) {
  const shown = useCountUp(value);

  return (
    <div className="fp-lift rounded-2xl border border-line-200 bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md ${card.disc}`}
        >
          <card.icon className="h-5 w-5" strokeWidth={2.6} />
        </span>
        <div className="min-w-0">
          {/* Wraps rather than truncates. Two tiles share a 360px row, which
              leaves about 72px beside the disc — enough to clip "Completed" to
              "Comple…", a label that has lost the only word that mattered. */}
          <p className="text-xs leading-tight font-semibold text-ink-500 sm:text-sm">
            {card.label}
          </p>
          <p className="text-2xl leading-tight font-black tabular-nums text-ink-900">
            {card.key === 'xp' && value > 0 ? '+' : ''}
            {shown}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-xs font-medium text-ink-400">{hint}</p>
        <Sparkline values={series} stroke={card.stroke} fillFrom={card.stroke} />
      </div>
    </div>
  );
}

/**
 * The four numbers above the calendar.
 *
 * XP is the one derived value: the server awards 10 XP for a completed task, so
 * a month's completions are worth ten times as much. It is labelled "from
 * tasks" rather than "earned" because the daily activity pays 5 XP too and this
 * page cannot see those — claiming a total it has not counted would be worse
 * than naming what it has.
 */
const XP_PER_TASK = 10;

export default function MonthStats({ summary, series, monthName }) {
  const values = {
    completed: summary.completed,
    pending: summary.pending,
    events: summary.events,
    xp: summary.completed * XP_PER_TASK
  };

  // Short enough to sit on one line beside the chart. The month is named
  // directly above this row, so repeating it in all four cards spent the space
  // the sparkline needed on a word the student had just read.
  const hints = {
    completed: monthName,
    pending: summary.missed > 0 ? `${summary.missed} missed` : 'Still open',
    events: 'You added',
    xp: 'From tasks'
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {CARDS.map((card) => (
        <StatTile
          key={card.key}
          card={card}
          value={values[card.key]}
          series={series[card.key === 'xp' ? 'completed' : card.key] || []}
          hint={hints[card.key]}
        />
      ))}
    </div>
  );
}
