export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  const variants = {
    primary: 'btn-brand-gradient text-white',
    secondary: 'bg-surface text-ink border border-accent-300 hover:bg-accent-50',
    danger: 'bg-brand-600 text-white hover:bg-brand-700',
    ghost: 'text-ink hover:bg-accent-100',
    outline: 'border border-brand-600 text-brand-700 hover:bg-brand-50',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    // Taller pill for full-width auth submit buttons
    xl: 'h-13 px-7 text-[15px]',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}