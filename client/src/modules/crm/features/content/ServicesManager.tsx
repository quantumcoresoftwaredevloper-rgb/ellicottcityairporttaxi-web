import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, RefreshCw, Star, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../../services/api.js';
import { useCatalog } from '../../../../context/CatalogContext.jsx';
import { serviceIcon } from '../../../../lib/iconMap.js';
import { Field, Area, Toggle, Section, Repeater, IconPicker, Drawer, Confirm, inputCls } from './fields';

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const EMPTY = {
  slug: '',
  name: '',
  short: '',
  tagline: '',
  summary: '',
  features: [] as string[],
  icon: '',
  featured: false,
  active: true,
};

export default function ServicesManager() {
  const qc = useQueryClient();
  const { refresh } = useCatalog();
  const [editing, setEditing] = React.useState<any>(null);
  const [confirm, setConfirm] = React.useState<any>(null);
  const [toast, setToast] = React.useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: async () => (await api.get('/admin/services')).data,
  });
  const services: any[] = data?.services || [];

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['admin', 'services'] });
    await refresh();
  };

  const save = useMutation({
    mutationFn: async (s: any) => {
      const body = clean(s);
      return s._isNew ? (await api.post('/admin/services', body)).data : (await api.patch(`/admin/services/${s._id}`, body)).data;
    },
    onSuccess: async (res) => {
      setEditing(null);
      setToast({ tone: 'ok', text: res.service ? `${res.service.name} saved.` : 'Saved.' });
      await invalidate();
    },
    onError: (e) => setToast({ tone: 'bad', text: e?.response?.data?.message || 'Could not save the service.' }),
  });

  const remove = useMutation({
    mutationFn: async (s: any) => (await api.delete(`/admin/services/${s._id}`)).data,
    onSuccess: async (_, s) => {
      setConfirm(null);
      setToast({ tone: 'ok', text: `${s.name} removed from the catalog.` });
      await invalidate();
    },
    onError: (e, s) => setConfirm({ ...s, error: e?.response?.data?.message || 'Could not delete this service.' }),
  });

  const reorder = useMutation({
    mutationFn: async (ids: string[]) => (await api.patch('/admin/services/reorder', { ids })).data,
    onSuccess: () => invalidate(),
    onError: () => setToast({ tone: 'bad', text: 'Could not save the new order.' }),
  });

  const restore = useMutation({
    mutationFn: async () => (await api.post('/admin/services/restore-defaults')).data,
    onSuccess: async (res) => {
      setToast({ tone: 'ok', text: `Restored ${res.restored} missing default ${res.restored === 1 ? 'service' : 'services'}.` });
      await invalidate();
    },
  });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= services.length) return;
    const ids = services.map((s) => s._id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate(ids);
  };

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-accent-200 dark:bg-accent-800" />;

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-sm ${
            toast.tone === 'ok' ? 'bg-success-50 text-success-700 dark:bg-success-950/40' : 'bg-brand-50 text-brand-700 dark:bg-brand-950/40'
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-medium underline">
            dismiss
          </button>
        </div>
      )}

      <Section
        title="Service offerings"
        description="The services offered to passengers. Drives the Services grid, every Service detail page, the booking form's service picker, the Home featured band and the driver dashboard. A service referenced by rides cannot be deleted — set it inactive instead."
        actions={
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => restore.mutate()}
              disabled={restore.isPending}
              title="Re-add any default service that was deleted"
              className="rounded-full border border-accent-300 px-3 py-2 text-sm font-medium text-muted transition hover:bg-accent-100 disabled:opacity-50 dark:border-accent-700 dark:hover:bg-accent-800"
            >
              <RefreshCw className={`h-4 w-4 ${restore.isPending ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setEditing({ ...EMPTY, _isNew: true })}
              className="flex items-center gap-2 rounded-full btn-brand-gradient px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" /> Add service
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          {services.map((s, i) => {
            const Icon = serviceIcon(s.icon);
            const rides = s.usage?.rides || 0;
            return (
              <div
                key={s._id}
                className={`flex flex-wrap items-center gap-4 rounded-2xl border p-3 transition ${
                  s.active ? 'border-accent-200 dark:border-accent-800' : 'border-dashed border-accent-300 bg-accent-50/60 dark:bg-accent-900/60'
                }`}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-gradient-soft text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-[12rem] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink dark:text-white">{s.name}</span>
                    {s.short && <span className="text-xs text-muted">“{s.short}”</span>}
                    <code className="rounded-md bg-accent-100 px-1.5 py-0.5 text-[11px] text-muted dark:bg-accent-800">/{s.slug}</code>
                    {s.featured && (
                      <span className="flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-medium text-gold-600 dark:bg-gold-950/40">
                        <Star className="h-3 w-3" /> featured
                      </span>
                    )}
                    {!s.active && (
                      <span className="rounded-full bg-accent-200 px-2 py-0.5 text-[11px] font-medium text-muted dark:bg-accent-800">
                        hidden
                      </span>
                    )}
                    {rides > 0 && (
                      <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] text-muted dark:bg-accent-800">
                        {rides} {rides === 1 ? 'ride' : 'rides'}
                      </span>
                    )}
                  </div>
                  {s.tagline && <p className="mt-1 line-clamp-1 text-xs text-muted">{s.tagline}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || reorder.isPending}
                    aria-label="Move up"
                    className="rounded-full border border-accent-300 px-2 py-1.5 text-xs text-muted transition hover:bg-accent-100 disabled:opacity-30 dark:border-accent-700 dark:hover:bg-accent-800"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === services.length - 1 || reorder.isPending}
                    aria-label="Move down"
                    className="rounded-full border border-accent-300 px-2 py-1.5 text-xs text-muted transition hover:bg-accent-100 disabled:opacity-30 dark:border-accent-700 dark:hover:bg-accent-800"
                  >
                    ↓
                  </button>
                  {s.active && (
                    <Link
                      to={`/services/${s.slug}`}
                      target="_blank"
                      title="View the public page"
                      className="rounded-full p-2 text-muted transition hover:bg-accent-100 hover:text-ink dark:hover:bg-accent-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing({ ...s, features: s.features || [] })}
                    aria-label={`Edit ${s.name}`}
                    className="rounded-full p-2 text-muted transition hover:bg-accent-100 hover:text-ink dark:hover:bg-accent-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ ...s, error: '' })}
                    aria-label={`Delete ${s.name}`}
                    className="rounded-full p-2 text-muted transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Drawer
        open={!!editing}
        title={editing?._isNew ? 'Add service' : `Edit ${editing?.name || ''}`}
        subtitle="Published to the Services grid, its own detail page and the booking form."
        onClose={() => setEditing(null)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">Featured services appear in the Home band.</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:bg-accent-100 dark:hover:bg-accent-800">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => save.mutate(editing)}
                disabled={save.isPending || !editing?.name || !editing?.slug}
                className="rounded-full btn-brand-gradient px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {save.isPending ? 'Saving…' : 'Save service'}
              </button>
            </div>
          </div>
        }
      >
        {editing && <ServiceForm value={editing} onChange={setEditing} slugLocked={(editing.usage?.rides || 0) > 0} />}
      </Drawer>

      <Confirm
        open={!!confirm}
        title={`Delete ${confirm?.name || ''}?`}
        confirmLabel="Delete service"
        tone="danger"
        busy={remove.isPending}
        error={confirm?.error || ''}
        message={
          (confirm?.usage?.rides || 0) > 0 ? (
            <>
              {confirm.usage.rides} {confirm.usage.rides === 1 ? 'ride uses' : 'rides use'} this service, so it cannot be removed.
              Set it to inactive instead to hide it from new bookings while keeping ride history intact.
            </>
          ) : (
            <>The detail page, the Services grid and the booking picker option will all disappear.</>
          )
        }
        onConfirm={() => remove.mutate(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function clean(s: any) {
  return {
    slug: String(s.slug || '').trim(),
    name: s.name,
    short: s.short,
    tagline: s.tagline,
    summary: s.summary,
    features: (s.features || []).map((f: string) => f.trim()).filter(Boolean),
    icon: s.icon || '',
    featured: !!s.featured,
    active: !!s.active,
  };
}

function ServiceForm({ value, onChange, slugLocked }: { value: any; onChange: (v: any) => void; slugLocked: boolean }) {
  const set = (patch: any) => onChange({ ...value, ...patch });
  const slugError = value.slug && value.slug !== slugify(value.slug) ? 'Use lowercase letters, numbers and dashes only.' : '';

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Service name"
          value={value.name}
          onChange={(v) => set({ name: v, slug: slugLocked || value._slugTouched ? value.slug : slugify(v) })}
          placeholder="Airport Transfer"
          max={60}
        />
        <Field
          label="URL slug"
          hint={slugLocked ? 'Locked — existing rides use this slug.' : `Public page: /services/${value.slug || 'your-service'}`}
          value={value.slug}
          onChange={(v) => set({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, ''), _slugTouched: true })}
          disabled={slugLocked}
          error={slugError}
        />
      </div>

      <Field label="Short label" value={value.short || ''} onChange={(v) => set({ short: v })} placeholder="Airport" max={40} />
      <Field label="Tagline" value={value.tagline || ''} onChange={(v) => set({ tagline: v })} placeholder="Punctual pickups, flight-aware waiting and a meet-and-greet." max={200} />
      <Area label="Summary" rows={4} value={value.summary || ''} onChange={(v) => set({ summary: v })} hint="Shown on the Services grid card." max={600} />

      <div>
        <span className="block text-sm font-medium text-ink dark:text-white">What's included</span>
        <span className="mt-0.5 block text-xs text-muted">Tick points on the service card and detail page.</span>
        <div className="mt-1">
          <Repeater
            items={value.features}
            onChange={(features) => set({ features })}
            create={() => ''}
            addLabel="Add bullet"
            emptyLabel="No bullets yet."
            max={12}
            render={(item: string, update: (v: string) => void) => (
              <input value={item} onChange={(e) => update(e.target.value)} placeholder="Flight tracking included" className={inputCls} />
            )}
          />
        </div>
      </div>

      <IconPicker value={value.icon} onChange={(v) => set({ icon: v })} label="Service icon" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="Featured" hint="Shows in the Home featured-services band." checked={!!value.featured} onChange={(v) => set({ featured: v })} />
        <Toggle label="Active" hint="Inactive services disappear from the site and the booking picker." checked={!!value.active} onChange={(v) => set({ active: v })} />
      </div>
    </>
  );
}
