import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';

/**
 * Ideas & Resources, collapsed.
 *
 * Nine sections of cards is a page nobody reaches the bottom of — the last
 * three categories may as well not exist. Everything folds shut so the whole
 * catalogue fits on one screen, and the student opens the two things they came
 * for.
 *
 * Two levels: the section (how many colleges are there?) and the item (what
 * are this one's fees?). Both keep their identifying line visible when closed,
 * because a collapsed row you cannot identify is just a hidden row.
 */

/** One resource, closed to a title and reopened for the detail. */
export function ResourceRow({ tag, title, subtitle, badges, description, link, details }) {
  const [open, setOpen] = useState(false);

  const hasBody = Boolean(description || details || badges?.some(Boolean));

  return (
    <li className="border-b border-line-100 last:border-b-0">
      <div className={`flex items-start gap-3 px-4 py-3 ${open ? 'bg-surface-50' : ''}`}>
        <button
          type="button"
          onClick={() => hasBody && setOpen(!open)}
          aria-expanded={hasBody ? open : undefined}
          disabled={!hasBody}
          className={`flex min-w-0 flex-1 items-start gap-3 text-left ${
            hasBody ? '' : 'cursor-default'
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              {tag && (
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[0.68rem] font-bold text-link-strong">
                  {tag}
                </span>
              )}
              <span className="text-sm font-bold break-words text-ink-900">{title}</span>
            </span>
            {subtitle && (
              <span className="mt-0.5 block text-xs break-words text-ink-500">{subtitle}</span>
            )}
          </span>

          {hasBody && (
            <ChevronDown
              className={`mt-0.5 h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>

        {/* Outside the toggle button: a link nested in a button is invalid, and
            opening a tab should never be a side effect of expanding a row. */}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${title} in a new tab`}
            className="shrink-0 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-link-strong"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {open && hasBody && (
        <div className="animate-fade-in border-t border-line-100 bg-surface-50/60 px-4 py-3.5">
          {badges?.some(Boolean) && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {badges.map(
                (badge, i) =>
                  badge && (
                    <span
                      key={i}
                      className="rounded-md bg-surface px-2 py-0.5 text-xs font-semibold break-words text-ink-600 ring-1 ring-line-200 ring-inset"
                    >
                      {badge}
                    </span>
                  )
              )}
            </div>
          )}

          {description && (
            <p className="text-sm leading-relaxed break-words text-ink-600">{description}</p>
          )}

          {details && (
            <div className="mt-2.5 space-y-1 text-sm break-words text-ink-700">{details}</div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * A whole category, closed to its title and a count.
 *
 * Carries no border of its own: sections are stacked inside one bordered group
 * and separated by hairlines. Fifteen individually-boxed bars floating in a
 * column read as fifteen unrelated things, where a divided list reads as a
 * contents page — which is what this is.
 *
 * The icon is the only thing that distinguishes one closed bar from the next.
 * Without it the page is a stack of identical white rectangles and the eye has
 * nothing to navigate by.
 */
export function ResourceSection({ icon: Icon, title, count, open, onToggle, children }) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
          open ? 'bg-surface-50' : 'hover:bg-surface-50/70'
        }`}
      >
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-link ring-1 ring-brand-100 ring-inset">
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </span>
        )}
        <span className="flex-1 text-sm font-bold text-ink-900">{title}</span>
        <span className="shrink-0 rounded-md bg-surface-100 px-2 py-0.5 text-xs font-bold text-ink-500 tabular-nums">
          {count}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && <ul className="animate-fade-in border-t border-line-100">{children}</ul>}
    </section>
  );
}
