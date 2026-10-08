import { RefreshCw, WifiOff } from 'lucide-react';
import Button from './Button';

/**
 * A page's data did not arrive.
 *
 * Kept apart from EmptyState on purpose. The pages used to treat a failed
 * request as an empty answer, so a dropped connection greeted a student with
 * months of history as a brand-new one — "Start onboarding", no skills, no
 * badges — with nothing to press but the way to start over. A failure says it
 * is one and offers the only useful thing: trying again.
 */
export default function LoadError({
  title = "We couldn't load this page",
  message = 'Check your connection and try again.',
  onRetry,
  retrying = false
}) {
  return (
    <div
      role="alert"
      className="animate-fade-in-up mx-auto flex max-w-md flex-col items-center rounded-2xl border border-line-200 bg-surface px-6 py-8 text-center"
    >
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <WifiOff className="h-5 w-5" />
      </span>
      <h2 className="text-base font-black text-ink-900">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          icon={RefreshCw}
          loading={retrying}
          loadingText="Trying again…"
          onClick={onRetry}
          className="mt-4"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
