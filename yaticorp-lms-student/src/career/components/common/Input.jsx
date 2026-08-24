import { useId, useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

/**
 * Labelled text field.
 *
 * The label is tied to the input by id — without that pairing a screen reader
 * announces the field as unlabelled, and clicking the label does not focus it.
 * useId keeps that pairing unique when the same field appears twice on a page.
 */
export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  hint,
  icon: Icon,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const id = useId();
  const isPassword = type === 'password';
  const currentType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`mb-4 flex flex-col ${className}`}>
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
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
        )}

        <input
          id={id}
          type={currentType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-surface py-2.5 text-ink-900 transition-all placeholder:text-ink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
            Icon ? 'pl-11' : 'pl-4'
          } ${isPassword ? 'pr-11' : 'pr-4'} ${
            error
              ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-500/40'
              : 'border-line-300 hover:border-slate-400 focus-visible:border-brand-500 focus-visible:ring-brand-500/40'
          }`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            // Without this the control is announced only as "button".
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3.5 text-ink-400 transition-colors hover:text-ink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>

      {error ? (
        // role="alert" so the message is announced when validation fails rather
        // than being silently added below a field the user has already left.
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
