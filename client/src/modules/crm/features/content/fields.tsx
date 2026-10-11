import * as React from 'react';
import { Plus, Trash2, X, AlertTriangle, Check, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { ICONS, ICON_NAMES } from '../../../../lib/iconMap.js';

// Shared primitives for the Website Content / Fleet / Services managers.
// Everything here is deliberately presentation-only: each manager owns its
// state and calls the API, these components just make the editing experience
// consistent.

export const inputCls =
  'mt-1 w-full input-pill border border-accent-300 bg-surface px-3 py-2 text-sm ' +
  'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none ' +
  'dark:border-accent-700 dark:bg-accent-900';
export const areaCls =
  'mt-1 w-full rounded-2xl border border-accent-300 bg-surface px-3 py-2 text-sm ' +
  'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none ' +
  'dark:border-accent-700 dark:bg-accent-900';

const labelCls = 'block text-sm font-medium text-ink dark:text-white';

export function Field({
  label,
  value,
  onChange,
  hint,
  max,
  error,
  className = '',
  ...rest
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  hint?: string;
  max?: number;
  error?: string;
  className?: string;
  [key: string]: any;
}) {
  const len = typeof value === 'string' ? value.length : 0;
  const over = max ? len > max : false;
  return (
    <label className={`block ${className}`}>
      <span className={labelCls}>{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <input
        value={value ?? ''}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} ${over || error ? 'border-brand-500' : ''}`}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-brand-700">{error}</span>}
      {max && (
        <span className={`mt-1 block text-right text-[11px] tabular-nums ${over ? 'text-brand-700' : 'text-muted'}`}>
          {len}/{max}
        </span>
      )}
    </label>
  );
}

export function Area({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  max,
  className = '',
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  hint?: string;
  rows?: number;
  max?: number;
  className?: string;
}) {
  const len = typeof value === 'string' ? value.length : 0;
  return (
    <label className={`block ${className}`}>
      <span className={labelCls}>{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <textarea
        rows={rows}
        value={value ?? ''}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        className={areaCls}
      />
      {max && (
        <span className="mt-1 block text-right text-[11px] tabular-nums text-muted">
          {len}/{max}
        </span>
      )}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  min,
  step,
  prefix,
  className = '',
}: {
  label: string;
  value: any;
  onChange: (v: number) => void;
  hint?: string;
  min?: number;
  step?: number;
  prefix?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelCls}>{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{prefix}</span>}
        <input
          type="number"
          min={min}
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className={`${inputCls} ${prefix ? 'pl-7' : ''}`}
        />
      </div>
    </label>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-2xl border border-accent-200 p-3 text-left transition hover:border-brand-300 dark:border-accent-800 dark:hover:border-accent-600"
    >
      <span
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${checked ? 'bg-success-600' : 'bg-accent-300 dark:bg-accent-700'}`}
      >
        <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink dark:text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
    </button>
  );
}

/** A titled card; `dirty` shows an unsaved-changes dot in the header. */
export function Section({
  title,
  description,
  dirty,
  actions,
  children,
  id,
}: {
  title: string;
  description?: string;
  dirty?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="card p-6 scroll-mt-24">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink dark:text-white">
            {title}
            {dirty && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-600">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" /> unsaved
              </span>
            )}
          </h3>
          {description && <p className="mt-1 text-xs text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/**
 * Generic add/remove/reorder list editor. `render` gets (item, update, index)
 * so each manager decides its own row layout; the add/remove/order chrome and
 * the empty state live here so every list behaves identically.
 */
export function Repeater<T>({
  items,
  onChange,
  create,
  render,
  addLabel = 'Add',
  emptyLabel = 'Nothing here yet.',
  max = 40,
  addDisabled,
  addDisabledReason,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  create: () => T;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  addLabel?: string;
  emptyLabel?: string;
  max?: number;
  addDisabled?: boolean;
  addDisabledReason?: string;
}) {
  const list = items || [];
  const atMax = list.length >= max;
  const update = (i: number, patch: Partial<T>) =>
    onChange(
      list.map((it, n) => {
        if (n !== i) return it;
        // A row is either an object (stats, testimonials — patch merges) or a
        // plain string (feature bullets, service areas — the value replaces).
        // Spreading a string would turn it into a char-indexed object.
        return it !== null && typeof it === 'object' ? { ...it, ...patch } : patch;
      })
    );
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {list.length === 0 && (
        <p className="rounded-2xl border border-dashed border-accent-300 px-4 py-6 text-center text-sm text-muted dark:border-accent-700">
          {emptyLabel}
        </p>
      )}
      {list.map((item, i) => (
        <div
          key={i}
          className="group relative rounded-2xl border border-accent-200 p-3 transition hover:border-accent-300 dark:border-accent-800 dark:hover:border-accent-600"
        >
          <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              title="Move up"
              aria-label={`Move item ${i + 1} up`}
              onClick={() => move(i, -1)}
              className="rounded-lg p-1 text-muted transition hover:bg-accent-100 hover:text-ink dark:hover:bg-accent-800"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Move down"
              onClick={() => move(i, 1)}
              className="rounded-lg p-1 text-muted transition hover:bg-accent-100 hover:text-ink dark:hover:bg-accent-800"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Remove"
              onClick={() => onChange(list.filter((_, n) => n !== i))}
              className="rounded-lg p-1 text-muted transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="pr-24">{render(item, (patch) => update(i, patch), i)}</div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...list, create()])}
        disabled={atMax || addDisabled}
        title={addDisabled ? addDisabledReason : undefined}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-300 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-accent-300 disabled:text-muted disabled:hover:bg-transparent dark:text-brand-300 dark:disabled:text-muted dark:hover:bg-brand-950"
      >
        <Plus className="h-4 w-4" />
        {atMax ? `Maximum ${max} reached` : addLabel}
      </button>
    </div>
  );
}

export function IconPicker({ value, onChange, label = 'Icon' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div role="group" aria-label={label}>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 grid max-h-40 grid-cols-8 gap-1 overflow-y-auto rounded-2xl border border-accent-300 p-2 dark:border-accent-700">
        {ICON_NAMES.map((name) => {
          const Icon = ICONS[name];
          const on = value === name;
          return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onChange(name)}
              className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                on ? 'bg-brand-gradient text-white' : 'text-muted hover:bg-accent-100 dark:hover:bg-accent-800'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Right slide-over. Closes on Escape and backdrop click; used for add/edit forms. */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-accent-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-paper shadow-2xl dark:bg-accent-950">
        <div className="flex items-start justify-between gap-4 border-b border-accent-200 px-6 py-4 dark:border-accent-800">
          <div>
            <h2 className="font-display text-lg font-bold text-ink dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-muted transition hover:bg-accent-100 dark:hover:bg-accent-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-accent-200 px-6 py-4 dark:border-accent-800">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'brand',
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: 'brand' | 'danger';
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-accent-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-ink dark:text-white">{title}</h3>
            <div className="mt-1 text-sm text-muted">{message}</div>
            {error && <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-950">{error}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:bg-accent-100 dark:hover:bg-accent-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              tone === 'danger' ? 'bg-brand-700 hover:bg-brand-800' : 'btn-brand-gradient'
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sticky save bar: dirty count, discard, save, and a published/error state. */
export function SaveBar({
  dirtyCount,
  saving,
  savedAt,
  error,
  onSave,
  onDiscard,
  saveLabel = 'Save changes',
}: {
  dirtyCount: number;
  saving: boolean;
  savedAt: string | null;
  error?: string;
  onSave: () => void;
  onDiscard: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="sticky bottom-4 z-30 mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-accent-200 bg-surface/95 px-4 py-3 shadow-lg backdrop-blur dark:border-accent-800 dark:bg-accent-900/95">
      <div className="min-w-0 flex-1">
        {saving ? (
          <span className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </span>
        ) : error ? (
          <span className="flex items-center gap-2 text-sm text-brand-700">
            <AlertTriangle className="h-4 w-4" /> {error}
          </span>
        ) : savedAt ? (
          <span className="flex items-center gap-2 text-sm text-success-700">
            <Check className="h-4 w-4" /> Published {savedAt}
          </span>
        ) : (
          <span className="text-sm text-muted">
            {dirtyCount > 0
              ? `${dirtyCount} unsaved ${dirtyCount === 1 ? 'change' : 'changes'}`
              : 'Everything is up to date'}
          </span>
        )}
      </div>
      {dirtyCount > 0 && (
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:bg-accent-100 dark:hover:bg-accent-800"
        >
          Discard
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={saving || dirtyCount === 0}
        className="rounded-full btn-brand-gradient px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saveLabel}
      </button>
    </div>
  );
}
