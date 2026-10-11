import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Car, Users, Luggage, Pencil, Trash2, RefreshCw } from 'lucide-react';
import api from '../../../../services/api.js';
import { useCatalog } from '../../../../context/CatalogContext.jsx';
import { vehicleIconByKey } from '../../../../lib/iconMap.js';
import { Field, Area, NumberField, Toggle, Section, Repeater, IconPicker, Drawer, Confirm, areaCls, inputCls } from './fields';

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const EMPTY = {
  key: '',
  label: '',
  desc: '',
  capacity: '',
  seats: 4,
  bags: 2,
  image: '',
  tagline: '',
  features: [] as string[],
  icon: 'car',
  fare: { base: 3, perKm: 1.4, perMin: 0.3 },
  active: true,
};

const FARE_HINT: Record<string, string> = {
  'executive-sedan': 'Top of the standard range — the airport and corporate default.',
  'economy-sedan': 'Cheapest published rate, used by the original hardcoded fares.',
  'mini-coach': 'High base fare is intentional — the base covers the whole vehicle.',
};

export default function FleetManager() {
  const qc = useQueryClient();
  const { refresh } = useCatalog();
  const [editing, setEditing] = React.useState<any>(null);
  const [confirm, setConfirm] = React.useState<any>(null);
  const [toast, setToast] = React.useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'fleet'],
    queryFn: async () => (await api.get('/admin/fleet')).data,
  });
  const vehicles: any[] = data?.vehicles || [];

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['admin', 'fleet'] });
    await refresh();
  };

  const save = useMutation({
    mutationFn: async (v: any) =>
      v._id && v._isNew !== true
        ? (await api.patch(`/admin/fleet/${v._id}`, clean(v))).data
        : (await api.post('/admin/fleet', clean(v))).data,
    onSuccess: async (res) => {
      setEditing(null);
      setToast({ tone: 'ok', text: res.vehicle ? `${res.vehicle.label} saved.` : 'Saved.' });
      await invalidate();
    },
    onError: (e) => setToast({ tone: 'bad', text: e?.response?.data?.message || 'Could not save the vehicle class.' }),
  });

  const remove = useMutation({
    mutationFn: async (v: any) => (await api.delete(`/admin/fleet/${v._id}`)).data,
    onSuccess: async (_, v) => {
      setConfirm(null);
      setToast({ tone: 'ok', text: `${v.label} removed from the catalog.` });
      await invalidate();
    },
    // A 409 means rides or drivers still reference the class — keep the dialog
    // open and show the server's reason instead of a generic failure.
    onError: (e, v) => setConfirm({ ...v, error: e?.response?.data?.message || 'Could not delete this class.' }),
  });

  const reorder = useMutation({
    mutationFn: async (ids: string[]) => (await api.patch('/admin/fleet/reorder', { ids })).data,
    onSuccess: () => invalidate(),
    onError: () => setToast({ tone: 'bad', text: 'Could not save the new order.' }),
  });

  const restore = useMutation({
    mutationFn: async () => (await api.post('/admin/fleet/restore-defaults')).data,
    onSuccess: async (res) => {
      setToast({ tone: 'ok', text: `Restored ${res.restored} missing default ${res.restored === 1 ? 'class' : 'classes'}.` });
      await invalidate();
    },
  });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= vehicles.length) return;
    const ids = vehicles.map((v) => v._id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate(ids);
  };

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-accent-200 dark:bg-accent-800" />;
  }

  const startNew = () => setEditing({ ...EMPTY, _isNew: true });
  const startEdit = (v: any) => setEditing({ ...v, features: v.features || [] });

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
        title="Fleet classes"
        description="Bookable vehicle classes. These replace the hardcoded list in the booking form, driver registration and the public Fleet page. A class that is referenced by rides or drivers cannot be deleted or renamed — set it inactive instead."
        actions={
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => restore.mutate()}
              disabled={restore.isPending}
              title="Re-add any default class that was deleted"
              className="rounded-full border border-accent-300 px-3 py-2 text-sm font-medium text-muted transition hover:bg-accent-100 disabled:opacity-50 dark:border-accent-700 dark:hover:bg-accent-800"
            >
              <RefreshCw className={`h-4 w-4 ${restore.isPending ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={startNew} className="flex items-center gap-2 rounded-full btn-brand-gradient px-4 py-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Add class
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          {vehicles.map((v, i) => {
            const Icon = vehicleIconByKey(v.key);
            const used = (v.usage?.rides || 0) + (v.usage?.drivers || 0);
            return (
              <div
                key={v._id}
                className={`flex flex-wrap items-center gap-4 rounded-2xl border p-3 transition ${
                  v.active ? 'border-accent-200 dark:border-accent-800' : 'border-dashed border-accent-300 bg-accent-50/60 dark:bg-accent-900/60'
                }`}
              >
                <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-gradient-soft text-brand-700">
                  {v.image ? <img src={v.image} alt="" className="h-full w-full object-cover" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="min-w-[12rem] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink dark:text-white">{v.label}</span>
                    <code className="rounded-md bg-accent-100 px-1.5 py-0.5 text-[11px] text-muted dark:bg-accent-800">{v.key}</code>
                    {!v.active && (
                      <span className="rounded-full bg-accent-200 px-2 py-0.5 text-[11px] font-medium text-muted dark:bg-accent-800">
                        hidden
                      </span>
                    )}
                    {used > 0 && (
                      <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-medium text-gold-600 dark:bg-gold-950/40">
                        in use · {v.usage.rides} rides · {v.usage.drivers} drivers
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                    {v.capacity && <span>{v.capacity}</span>}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {v.seats} seats
                    </span>
                    <span className="flex items-center gap-1">
                      <Luggage className="h-3 w-3" /> {v.bags} bags
                    </span>
                    <span>
                      ${v.fare?.base} base + ${v.fare?.perKm}/km + ${v.fare?.perMin}/min
                    </span>
                  </div>
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
                    disabled={i === vehicles.length - 1 || reorder.isPending}
                    aria-label="Move down"
                    className="rounded-full border border-accent-300 px-2 py-1.5 text-xs text-muted transition hover:bg-accent-100 disabled:opacity-30 dark:border-accent-700 dark:hover:bg-accent-800"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(v)}
                    aria-label={`Edit ${v.label}`}
                    className="rounded-full p-2 text-muted transition hover:bg-accent-100 hover:text-ink dark:hover:bg-accent-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ ...v, error: '' })}
                    aria-label={`Delete ${v.label}`}
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
        title={editing?._isNew ? 'Add fleet class' : `Edit ${editing?.label || ''}`}
        subtitle="Published everywhere a vehicle is picked, and used to price new rides."
        onClose={() => setEditing(null)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {editing?._isNew ? 'A new class appears in the booking form immediately.' : 'Existing rides keep the fare they were quoted.'}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:bg-accent-100 dark:hover:bg-accent-800">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => save.mutate(editing)}
                disabled={save.isPending || !editing?.key || !editing?.label}
                className="rounded-full btn-brand-gradient px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {save.isPending ? 'Saving…' : 'Save class'}
              </button>
            </div>
          </div>
        }
      >
        {editing && (
          <VehicleForm
            value={editing}
            onChange={setEditing}
            keyLocked={(editing.usage?.rides || 0) + (editing.usage?.drivers || 0) > 0}
          />
        )}
      </Drawer>

      <Confirm
        open={!!confirm}
        title={`Delete ${confirm?.label || ''}?`}
        confirmLabel="Delete class"
        tone="danger"
        busy={remove.isPending}
        error={confirm?.error || ''}
        message={
          (confirm?.usage?.rides || 0) + (confirm?.usage?.drivers || 0) > 0 ? (
            <>
              This class is used by {confirm.usage.rides} {confirm.usage.rides === 1 ? 'ride' : 'rides'} and{' '}
              {confirm.usage.drivers} {confirm.usage.drivers === 1 ? 'driver' : 'drivers'}, so it cannot be removed. Set it to
              inactive instead to hide it from new bookings while keeping history intact.
            </>
          ) : (
            'Nobody has booked or drives this class, so it will be removed from the booking form, driver registration and the public Fleet page.'
          )
        }
        onConfirm={() => remove.mutate(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function clean(v: any) {
  const fare = {
    base: Number(v.fare?.base) || 0,
    perKm: Number(v.fare?.perKm) || 0,
    perMin: Number(v.fare?.perMin) || 0,
  };
  return {
    key: String(v.key || '').trim(),
    label: v.label,
    desc: v.desc,
    capacity: v.capacity,
    seats: Number(v.seats) || 1,
    bags: Number(v.bags) || 0,
    image: v.image,
    tagline: v.tagline,
    features: (v.features || []).map((f: string) => f.trim()).filter(Boolean),
    icon: v.icon,
    active: !!v.active,
    fare,
  };
}

function VehicleForm({ value, onChange, keyLocked }: { value: any; onChange: (v: any) => void; keyLocked: boolean }) {
  const set = (patch: any) => onChange({ ...value, ...patch });
  const setFare = (patch: any) => set({ fare: { ...value.fare, ...patch } });
  const keyError = value.key && value.key !== slugify(value.key) ? 'Use lowercase letters, numbers and dashes only.' : '';

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Display name"
          value={value.label}
          onChange={(v) =>
            // Auto-derive the key while typing until it is locked by usage.
            set({ label: v, key: keyLocked || value._keyTouched ? value.key : slugify(v) })
          }
          placeholder="Executive Sedan"
          max={60}
        />
        <Field
          label="Class key"
          hint={keyLocked ? 'Locked — rides and drivers already use this key.' : 'Used in URLs, the API and existing rides. Cannot be changed later.'}
          value={value.key}
          onChange={(v) => set({ key: v.toLowerCase().replace(/[^a-z0-9-]/g, ''), _keyTouched: true })}
          disabled={keyLocked}
          error={keyError}
        />
      </div>
      <Field label="Short description" value={value.desc || ''} onChange={(v) => set({ desc: v })} placeholder="Business-class comfort, 3 passengers" max={120} />
      <Field label="Capacity line" value={value.capacity || ''} onChange={(v) => set({ capacity: v })} placeholder="Up to 3 passengers · 2 bags" max={80} />
      <Area label="Tagline" rows={2} value={value.tagline || ''} onChange={(v) => set({ tagline: v })} placeholder="Airport transfers, corporate accounts and long-distance runs." max={200} />

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Seats" min={1} value={value.seats} onChange={(v) => set({ seats: v })} />
        <NumberField label="Bags" min={0} value={value.bags} onChange={(v) => set({ bags: v })} />
      </div>

      <div>
        <span className="block text-sm font-medium text-ink dark:text-white">Image</span>
        <span className="mt-0.5 block text-xs text-muted">Path or URL to an image in /public. Leave empty to show the icon.</span>
        <div className="mt-1 flex items-center gap-3">
          <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent-100 text-muted dark:bg-accent-800">
            {value.image ? <img src={value.image} alt="" className="h-full w-full object-cover" /> : <Car className="h-5 w-5" />}
          </div>
          <input
            aria-label="Image"
            value={value.image || ''}
            onChange={(e) => set({ image: e.target.value })}
            placeholder="/images/fleet/executive.jpg"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-ink dark:text-white">Features</span>
        <span className="mt-0.5 block text-xs text-muted">Shown as tick points on the booking card and Fleet page.</span>
        <div className="mt-1">
          <Repeater
            items={value.features}
            onChange={(features) => set({ features })}
            create={() => ''}
            addLabel="Add feature"
            emptyLabel="No features yet."
            max={12}
            render={(item: string, update: (v: string) => void) => (
              <input value={item} onChange={(e) => update(e.target.value)} placeholder="Free Wi-Fi" className={inputCls} />
            )}
          />
        </div>
      </div>

      <IconPicker value={value.icon} onChange={(v) => set({ icon: v })} label="List icon" />

      <div>
        <span className="block text-sm font-medium text-ink dark:text-white">Fare rates</span>
        <span className="mt-0.5 block text-xs text-muted">
          Fare = base + (distance km × per km) + (duration min × per min), rounded to cents. Global Settings overrides still
          apply on top.
        </span>
        {FARE_HINT[value.key] && <span className="mt-1 block text-xs text-gold-600">{FARE_HINT[value.key]}</span>}
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <NumberField label="Base" prefix="$" min={0} step={0.5} value={value.fare.base} onChange={(v) => setFare({ base: v })} />
          <NumberField label="Per km" prefix="$" min={0} step={0.1} value={value.fare.perKm} onChange={(v) => setFare({ perKm: v })} />
          <NumberField label="Per min" prefix="$" min={0} step={0.05} value={value.fare.perMin} onChange={(v) => setFare({ perMin: v })} />
        </div>
      </div>

      <Toggle
        label="Active"
        hint="Inactive classes stay attached to existing rides and driver records but disappear from every booking option."
        checked={!!value.active}
        onChange={(v) => set({ active: v })}
      />
    </>
  );
}
