import { Loader2 } from 'lucide-react';

// Each variant carries its own focus ring colour so the indicator stays visible
// against that variant's own background — a single brand ring disappears on the
// brand-coloured primary button, which is exactly where it matters most.
const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md disabled:hover:bg-brand-600 focus-visible:ring-brand-600',
  secondary:
    'bg-surface text-ink-700 border border-line-300 hover:bg-surface-50 hover:border-slate-400 focus-visible:ring-slate-500',
  ghost:
    'bg-transparent text-ink-600 hover:bg-surface-100 hover:text-ink-900 focus-visible:ring-slate-500',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md disabled:hover:bg-red-600 focus-visible:ring-red-600',
  accent:
    'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm hover:from-brand-700 hover:to-indigo-700 hover:shadow-md focus-visible:ring-indigo-600'
};

// focus-visible rather than focus: the ring appears for keyboard navigation but
// not on mouse clicks, where it reads as a stuck selection.
const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  loadingText,
  disabled = false,
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${FOCUS} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}
