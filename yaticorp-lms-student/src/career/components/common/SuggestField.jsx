import { useId, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, AlertCircle } from 'lucide-react';

// Measurement constants for placing the list. ROW_HEIGHT matches the `px-4 py-2
// text-sm` rows below; if that padding changes, this changes with it.
const ROW_HEIGHT = 36;
// The ul's own py-1, plus its 1px top and bottom border. max-height is a
// border-box measurement here, so leaving the borders out made a list that
// exactly fits its rows scroll by two pixels.
const LIST_PADDING = 8 + 2;
const GAP = 4; // between the field and the list
const MIN_HEIGHT = 96; // ~2 rows, for a very short window

/**
 * A text field that suggests as you type.
 *
 * One control, always typeable. The previous version was a dropdown with an
 * "Other" option that swapped the whole field for a text box, which meant a
 * student had to decide *how* they were going to answer before they could
 * answer — and anyone whose course was missing had to find "Other" first.
 *
 * Now: start typing and matching entries appear underneath. Take one, or ignore
 * them and finish typing your own. Nothing is ever rejected, so no list needs to
 * be complete; the suggestions exist to make the common answers consistent,
 * because these values feed the roadmap prompt and "Bca" / "bca" / "B.C.A" read
 * as three different courses.
 *
 * The chevron opens the full list without typing, so the suggestions are
 * discoverable for anyone who does not know what to put.
 */
export default function SuggestField({
  label,
  value = '',
  onChange,
  options = [],
  placeholder,
  hint,
  error,
  required = false,
  type = 'text',
  maxVisible = 8,
  className = ''
}) {
  const id = useId();
  const listId = `${id}-list`;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Typing filters; opening with the chevron shows everything. Without this the
  // chevron would show only what matches an already-filled field — usually one
  // entry, which is not a list.
  const [showAll, setShowAll] = useState(false);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const matches = useMemo(() => {
    const query = String(value).trim().toLowerCase();
    if (showAll || !query) return options;
    // Entries that START with what was typed come first — typing "com" should
    // offer "Commerce" before "Information & Communication".
    const starts = [];
    const contains = [];
    for (const option of options) {
      const lower = option.toLowerCase();
      if (lower.startsWith(query)) starts.push(option);
      else if (lower.includes(query)) contains.push(option);
    }
    return [...starts, ...contains];
  }, [options, value, showAll]);

  // Nothing left to suggest only when the text is EXACTLY an option, case and
  // all. A case-insensitive test looked equivalent and was not: typing "isro"
  // matched "ISRO", hid the list, and saved the lowercase spelling — which is
  // precisely the inconsistency these lists exist to prevent. Differing only in
  // case now still offers the canonical form to snap to.
  const settled = options.some((o) => o === String(value).trim());
  const visible = open && matches.length > 0 && !(settled && matches.length === 1);

  /**
   * Where to draw the list, in viewport coordinates.
   *
   * The list is portalled to <body> rather than positioned inside this field,
   * because Card's entrance animation leaves an identity transform behind and
   * that makes every card its own stacking context. A dropdown on the last
   * field of a card was therefore trapped inside it and painted UNDER the next
   * card, no matter how high its z-index went.
   */
  const [box, setBox] = useState(null);

  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    // How tall the list WANTS to be, capped at maxVisible rows so a long list
    // scrolls instead of running most of the way down the window. This cap
    // existed as a prop but was never applied to the measurement, so all 27
    // companies rendered as one enormous column.
    const wanted = Math.min(matches.length, maxVisible) * ROW_HEIGHT + LIST_PADDING;

    const below = window.innerHeight - r.bottom - GAP;
    const above = r.top - GAP;
    // Flip up only when there is genuinely more room there — a field near the
    // bottom of the window would otherwise open off-screen.
    const up = below < wanted && above > below;
    const room = up ? above : below;

    setBox({
      left: r.left,
      width: r.width,
      top: up ? undefined : r.bottom + GAP,
      bottom: up ? window.innerHeight - r.top + GAP : undefined,
      // Never taller than it needs to be, and never taller than the space it
      // has. MIN_HEIGHT keeps a couple of rows visible in a very short window.
      maxHeight: Math.max(MIN_HEIGHT, Math.min(wanted, room - 8))
    });
  }, [matches.length, maxVisible]);

  useEffect(() => {
    if (!visible) return;
    place();
    // Capture phase so it also follows an inner scroller, not just the window.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [visible, place]);

  // Close on an outside click. Not on blur: blur fires before the click that
  // chose a suggestion, so the list would vanish out from under the pointer.
  // The list itself is checked separately now that it lives outside this field.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    if (active < 0 || !listRef.current) return;
    listRef.current.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (option) => {
    onChange(option);
    setOpen(false);
    setShowAll(false);
    setActive(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!visible) {
        setShowAll(true);
        setOpen(true);
        setActive(0);
        return;
      }
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!visible) return;
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      // Only intercepted while a suggestion is highlighted, so Enter still
      // submits the form when the student is just typing.
      if (visible && active >= 0) {
        e.preventDefault();
        choose(matches[active]);
      }
    } else if (e.key === 'Escape') {
      if (visible) {
        e.preventDefault();
        setOpen(false);
        setShowAll(false);
      }
    }
  };

  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`mb-4 flex flex-col ${className}`} ref={wrapRef}>
      {label && (
        <label htmlFor={id} className="mb-1.5 text-sm font-semibold text-ink-700">
          {label}
          {required && (
            <span className="ml-0.5 text-rose-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowAll(false);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={visible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-surface py-2.5 pr-10 pl-4 text-ink-900 transition-all placeholder:text-ink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
            error
              ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-500/40'
              : 'border-line-300 hover:border-ink-400 focus-visible:border-brand-500 focus-visible:ring-brand-500/40'
          }`}
        />

        {options.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={visible ? 'Hide suggestions' : 'Show suggestions'}
            // onMouseDown, not onClick: the outside-click listener and the input's
            // focus both settle on mousedown, so a click handler here would toggle
            // against a list that had already closed.
            onMouseDown={(e) => {
              e.preventDefault();
              if (visible) {
                setOpen(false);
                setShowAll(false);
              } else {
                setShowAll(true);
                setOpen(true);
                setActive(-1);
                inputRef.current?.focus();
              }
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${visible ? 'rotate-180' : ''}`}
            />
          </button>
        )}

        {visible &&
          box &&
          createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              // z-[90]: above the cards and the sticky save bar (z-40), below
              // the confirm dialog (z-[60] is its backdrop, its panel is higher)
              // and the celebration overlay, which must never be covered.
              // futurepath-portal: this list is portalled to document.body, outside
              // the section wrapper, so it has to opt back in to the section's
              // typography explicitly.
              className="futurepath-portal fixed z-[90] overflow-y-auto rounded-lg border border-line-200 bg-surface py-1 shadow-float"
              style={{
                left: box.left,
                width: box.width,
                top: box.top,
                bottom: box.bottom,
                maxHeight: box.maxHeight
              }}
            >
              {matches.map((option, i) => (
                <li
                  key={option}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown fires before the input loses focus, so the choice
                  // lands instead of the list closing first.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(option);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer px-4 py-2 text-sm ${
                    i === active ? 'bg-brand-50 text-link' : 'text-ink-700'
                  }`}
                >
                  {option}
                </li>
              ))}
            </ul>,
            document.body
          )}
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
