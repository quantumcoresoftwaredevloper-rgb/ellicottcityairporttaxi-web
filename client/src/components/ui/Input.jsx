// Modern form field: soft filled pill, generous height, brand-red focus ring.
// The autofill overrides stop Chrome/Safari from painting their yellow box over
// the brand styling (the inset shadow uses the theme var so dark mode still works).
const fieldBase =
  'input-pill peer h-13 w-full border bg-paper px-4 text-[15px] text-ink outline-none transition-all duration-200 placeholder:text-accent-400 focus:bg-surface focus:ring-4 disabled:opacity-60 [&:-webkit-autofill]:[-webkit-text-fill-color:currentColor] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_var(--color-paper),var(--tw-ring-offset-shadow),var(--tw-ring-shadow)]';

export function Input({ label, icon, trailing, error, hint, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-2 block text-sm font-medium text-ink">{label}</span>}
      <div className="relative">
        {icon && (
          <span
            className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors peer-focus:text-brand-600 ${
              error ? 'text-brand-500' : 'text-accent-400'
            }`}
          >
            {icon}
          </span>
        )}
        <input
          className={`${fieldBase} ${icon ? 'pl-11' : ''} ${trailing ? 'pr-12' : ''} ${
            error
              ? 'border-brand-500 focus:border-brand-600 focus:ring-brand-200'
              : 'border-transparent focus:border-brand-500 focus:ring-brand-100'
          }`}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {trailing && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </div>
      {error && <span className="mt-1.5 block text-xs font-medium text-brand-600">{error}</span>}
      {!error && hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
