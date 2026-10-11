import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import {
  adminAnalytics,
  adminRides,
  adminDrivers,
} from '../../services/rideService.js';
import {
  adminUsers,
  adminSuspendUser,
  adminUnsuspendUser,
  adminDeleteUser,
  adminPayments,
  adminSettings,
  adminUpdateSettings,
  adminAssignDriver,
  adminContent,
  adminUpdateContent,
} from '../../services/adminService.js';
import { onRideUpdate, offRideUpdate, onRideNew, offRideNew } from '../../services/socketService.js';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { rideTone, payTone, payAccent } from '../../lib/statusTone.js';
import { useContent } from '../../context/ContentContext.jsx';

export default function Dashboard() {
  const { vehicleLabel } = useCatalog();
  const { refresh: refreshContent } = useContent();
  const [analytics, setAnalytics] = useState(null);
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [payments, setPayments] = useState([]);
  const [paySummary, setPaySummary] = useState({});
  const [settings, setSettings] = useState(null);
  const [content, setContent] = useState(null);
  const [active, setActive] = useState('overview');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [assignSel, setAssignSel] = useState({});

  const load = async () => {
    try {
      const [a, r, d] = await Promise.all([adminAnalytics(), adminRides(), adminDrivers()]);
      setAnalytics(a.data);
      setRides(r.data.rides);
      setDrivers(d.data.drivers);
    } catch {
      setError('Could not load CRM data');
    }
  };

  const loadUsers = async (search = '') => {
    try {
      const { data } = await adminUsers({ search });
      setUsers(data.users);
    } catch {
      setError('Could not load users');
    }
  };

  const loadPayments = async () => {
    try {
      const { data } = await adminPayments({});
      setPayments(data.payments);
      setPaySummary(data.summary);
    } catch {
      setError('Could not load payments');
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await adminSettings();
      setSettings(data.settings);
    } catch {
      setError('Could not load settings');
    }
  };

  const loadContent = async () => {
    try {
      const { data } = await adminContent();
      setContent(data.content);
    } catch {
      setError('Could not load website content');
    }
  };

  const saveContent = async () => {
    setBusy('content');
    try {
      const { data } = await adminUpdateContent(content);
      setContent(data.content);
      await refreshContent();
      setError('');
    } catch {
      setError('Could not save website content');
    } finally {
      setBusy('');
    }
  };

  const setContentField = (key, value) => setContent((c) => ({ ...c, [key]: value }));
  const setListField = (key, index, field, value) =>
    setContent((c) => ({
      ...c,
      [key]: (c[key] || []).map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (active === 'users') loadUsers(userSearch);
    if (active === 'payments') loadPayments();
    if (active === 'settings') loadSettings();
    if (active === 'content') loadContent();
    if (active === 'rides') load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Live refresh of the rides table when dispatch assigns/removes or a new
  // reservation arrives (admin socket is joined to the `admins` room).
  useEffect(() => {
    if (active !== 'rides') return;
    const refresh = () => load();
    onRideUpdate(refresh);
    onRideNew(refresh);
    return () => {
      offRideUpdate();
      offRideNew();
    };
  }, [active]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'rides', label: 'Rides' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'users', label: 'Users' },
    { id: 'payments', label: 'Payments' },
    { id: 'settings', label: 'Settings' },
    { id: 'content', label: 'Website Content' },
  ];

  if (error) return <p className="px-4 py-16 text-center text-muted">{error}</p>;

  const toggleSuspend = async (u) => {
    setBusy(u._id);
    try {
      if (u.isSuspended) await adminUnsuspendUser(u._id);
      else await adminSuspendUser(u._id);
      await loadUsers(userSearch);
    } catch {
      setError('Could not update user');
    } finally {
      setBusy('');
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.name} permanently? Their rides and payments are removed too.`)) return;
    setBusy(u._id);
    try {
      await adminDeleteUser(u._id);
      await loadUsers(userSearch);
    } catch {
      setError('Could not delete user');
    } finally {
      setBusy('');
    }
  };

  const saveSettings = async () => {
    setBusy('settings');
    try {
      const { data } = await adminUpdateSettings(settings);
      setSettings(data.settings);
      setError('');
    } catch {
      setError('Could not save settings');
    } finally {
      setBusy('');
    }
  };

  const setSetting = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  const assignDriver = async (r) => {
    const driverId = assignSel[r._id];
    if (!driverId) return;
    setBusy(r._id);
    try {
      await adminAssignDriver(r._id, driverId);
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not assign driver');
    } finally {
      setBusy('');
    }
  };

  const removeDriver = async (r) => {
    if (!window.confirm(`Remove ${r.driver?.name} from this ride?`)) return;
    setBusy(r._id);
    try {
      await adminAssignDriver(r._id, null);
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove driver');
    } finally {
      setBusy('');
    }
  };

  const card = 'card';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">CRM dashboard</h1>
          <p className="mt-1 text-sm text-muted">Ops overview for {analytics?.totalRides ?? '…'} rides.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-xl bg-accent-100 p-1 sm:inline-flex">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              active === t.id ? 'bg-surface text-ink shadow-sm' : 'text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'overview' && !analytics && (
        <div className="mt-8 flex justify-center">
          <Spinner label="Loading analytics…" />
        </div>
      )}

      {active === 'overview' && analytics && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Total rides', value: analytics.totalRides },
              { label: 'Active now', value: analytics.activeRides },
              { label: 'Drivers', value: analytics.totalDrivers },
              { label: 'Passengers', value: analytics.totalPassengers },
              { label: 'Revenue', value: `$${analytics.revenue}` },
            ].map((s) => (
              <div key={s.label} className={card}>
                <p className="text-sm text-muted">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 card p-6">
            <h2 className="font-bold">Recent rides</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {analytics.recentRides.slice(0, 5).map((r) => (
                <li key={r._id} className="flex items-center justify-between border-b border-accent-50 pb-3 last:border-0">
                  <span>
                    {r.passenger?.name || 'Unknown'} → {r.pickup.address}
                  </span>
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {active === 'rides' && (
        <div className="mt-6 overflow-hidden panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Passenger</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3">Dropoff</th>
                  <th className="px-4 py-3">Fare</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent-100">
                {rides.map((r) => (
                  <tr key={r._id} className="hover:bg-accent-50">
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${rideTone(r.status)}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.passenger?.name || '—'}</td>
                    <td className="px-4 py-3">
                      {r.driver ? r.driver.name : <span className="text-muted">Unassigned</span>}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-muted">{r.pickup.address}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-muted">{r.dropoff.address}</td>
                    <td className="px-4 py-3 font-medium">
                      ${(r.status === 'completed' ? r.fare.final : r.fare.estimated).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {['pending', 'accepted', 'arriving', 'in_progress'].includes(r.status) &&
                        (r.driver ? (
                          <div className="flex justify-end">
                            <Button
                              variant="danger"
                              size="sm"
                              loading={busy === r._id}
                              onClick={() => removeDriver(r)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <select
                              value={assignSel[r._id] || ''}
                              onChange={(e) =>
                                setAssignSel((m) => ({ ...m, [r._id]: e.target.value }))
                              }
                              className="input-pill border border-accent-300 bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand-500"
                            >
                              <option value="">Select driver…</option>
                              {drivers.map((d) => (
                                <option key={d._id} value={d._id}>
                                  {d.name} · {vehicleLabel(d.driverDetails?.vehicleType)}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              loading={busy === r._id}
                              disabled={!assignSel[r._id]}
                              onClick={() => assignDriver(r)}
                            >
                              Assign
                            </Button>
                          </div>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active === 'drivers' && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => (
            <div key={d._id} className={card}>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {d.name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{d.name}</p>
                  <p className="truncate text-xs text-muted">{d.email}</p>
                </div>
                <span
                  className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${
                    d.driverDetails?.isAvailable
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-accent-100 text-muted'
                  }`}
                >
                  {d.driverDetails?.isAvailable ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted">
                {vehicleLabel(d.driverDetails?.vehicleType)} · {d.driverDetails?.plateNumber || 'No plate'}
              </p>
            </div>
          ))}
        </div>
      )}

      {active === 'users' && (
        <div className="mt-6">
          <div className="mb-4 flex max-w-sm items-center gap-2 rounded-full border border-accent-300 bg-surface px-4 py-2.5">
            <Search className="h-4 w-4 text-muted" aria-hidden="true" />
            <input
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                loadUsers(e.target.value);
              }}
              placeholder="Search name, email or phone…"
              className="w-full text-sm outline-none placeholder:text-accent-400"
            />
          </div>
          <div className="overflow-hidden panel">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-accent-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                            {u.name?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted">{u.role}</td>
                    <td className="px-4 py-3">
                      {u.isSuspended ? (
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">Suspended</span>
                      ) : (
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant={u.isSuspended ? 'secondary' : 'outline'}
                          size="sm"
                          loading={busy === u._id}
                          onClick={() => toggleSuspend(u)}
                        >
                          {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </Button>
                        {u.role !== 'admin' && (
                          <Button variant="danger" size="sm" loading={busy === u._id} onClick={() => deleteUser(u)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active === 'payments' && (
        <div className="mt-6">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {(['succeeded', 'cash', 'pending', 'failed', 'refunded']).map((s) => (
              <div key={s} className={`${card} border-t-4 ${payAccent(s).top}`}>
                <p className="flex items-center gap-2 text-sm capitalize text-muted">
                  <span className={`h-2 w-2 rounded-full ${payAccent(s).dot}`} />
                  {s}
                </p>
                <p className={`mt-1 text-xl font-bold ${payAccent(s).text}`}>
                  {paySummary[s] ? `$${paySummary[s].total.toFixed(2)}` : '$0.00'}
                </p>
                <p className="text-xs text-muted">{paySummary[s]?.count || 0} payments</p>
              </div>
            ))}
          </div>
          <div className="mt-6 overflow-hidden panel">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-accent-50">
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${payTone(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="capitalize">{p.method}</span>
                      {p.provider === 'stripe' && (
                        <span className="ml-1.5 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent-700">
                          Stripe
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{p.user?.name || '—'}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-muted">
                      {p.ride ? `${p.ride.pickup.address} → ${p.ride.dropoff.address}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">${p.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active === 'content' && content && (
        <div className="mt-6 max-w-3xl space-y-4">
          <div className={card}>
            <h2 className="font-bold">Home hero</h2>
            <p className="mt-1 text-sm text-muted">
              The first thing every visitor reads. The highlighted part renders in gold.
            </p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Eyebrow</span>
                <input
                  value={content.heroEyebrow || ''}
                  onChange={(e) => setContentField('heroEyebrow', e.target.value)}
                  className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Title</span>
                  <input
                    value={content.heroTitle || ''}
                    onChange={(e) => setContentField('heroTitle', e.target.value)}
                    className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Gold word</span>
                  <input
                    value={content.heroHighlight || ''}
                    onChange={(e) => setContentField('heroHighlight', e.target.value)}
                    className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Title tail</span>
                  <input
                    value={content.heroTitleTail || ''}
                    onChange={(e) => setContentField('heroTitleTail', e.target.value)}
                    className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Subtitle</span>
                <textarea
                  rows={3}
                  value={content.heroSubtitle || ''}
                  onChange={(e) => setContentField('heroSubtitle', e.target.value)}
                  className="w-full rounded-2xl border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Button label</span>
                <input
                  value={content.heroCtaLabel || ''}
                  onChange={(e) => setContentField('heroCtaLabel', e.target.value)}
                  className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
            </div>
          </div>

          <div className={card}>
            <h2 className="font-bold">Contact details</h2>
            <p className="mt-1 text-sm text-muted">
              Used site-wide: navbar, footer, contact page and the login/register panel.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Phone (display)</span>
                <input
                  value={content.contactPhone || ''}
                  onChange={(e) => setContentField('contactPhone', e.target.value)}
                  className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Phone (tel: link)</span>
                <input
                  value={content.contactPhoneHref || ''}
                  onChange={(e) =>
                    setContentField('contactPhoneHref', e.target.value.replace(/[^0-9+]/g, ''))
                  }
                  placeholder="4103655556"
                  className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
                <input
                  type="email"
                  value={content.contactEmail || ''}
                  onChange={(e) => setContentField('contactEmail', e.target.value)}
                  className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Address</span>
                <input
                  value={content.contactAddress || ''}
                  onChange={(e) => setContentField('contactAddress', e.target.value)}
                  className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-ink">Service area</span>
                <input
                  value={content.serviceArea || ''}
                  onChange={(e) => setContentField('serviceArea', e.target.value)}
                  className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-ink">Footer blurb</span>
                <textarea
                  rows={2}
                  value={content.tagline || ''}
                  onChange={(e) => setContentField('tagline', e.target.value)}
                  className="w-full rounded-2xl border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
            </div>
          </div>

          <div className={card}>
            <h2 className="font-bold">Home stat band</h2>
            <div className="mt-4 space-y-3">
              {(content.stats || []).map((row, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                  <input
                    value={row.value || ''}
                    onChange={(e) => setListField('stats', i, 'value', e.target.value)}
                    placeholder="24/7"
                    className="input-pill w-full border border-accent-300 bg-surface px-4 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <input
                    value={row.label || ''}
                    onChange={(e) => setListField('stats', i, 'label', e.target.value)}
                    placeholder="Service, every day"
                    className="input-pill w-full border border-accent-300 bg-surface px-4 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={card}>
            <h2 className="font-bold">Testimonials</h2>
            <p className="mt-1 text-sm text-muted">Shown in the Home testimonials band, in order.</p>
            <div className="mt-4 space-y-4">
              {(content.testimonials || []).map((row, i) => (
                <div key={i} className="space-y-2 rounded-2xl border border-accent-200 p-3">
                  <textarea
                    rows={2}
                    value={row.quote || ''}
                    onChange={(e) => setListField('testimonials', i, 'quote', e.target.value)}
                    className="w-full rounded-xl border border-accent-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={row.name || ''}
                      onChange={(e) => setListField('testimonials', i, 'name', e.target.value)}
                      placeholder="Name"
                      className="input-pill w-full border border-accent-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                    <input
                      value={row.detail || ''}
                      onChange={(e) => setListField('testimonials', i, 'detail', e.target.value)}
                      placeholder="City · Service"
                      className="input-pill w-full border border-accent-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={card}>
            <h2 className="font-bold">Service areas</h2>
            <p className="mt-1 text-sm text-muted">Comma-separated list shown on the Home page.</p>
            <textarea
              rows={3}
              value={(content.serviceAreas || []).join(', ')}
              onChange={(e) =>
                setContentField(
                  'serviceAreas',
                  e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                )
              }
              className="mt-4 w-full rounded-2xl border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className={card}>
            <h2 className="font-bold">Login / register panel</h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Headline</span>
                  <input
                    value={content.authHeadline?.title || ''}
                    onChange={(e) =>
                      setContent('authHeadline', { ...content.authHeadline, title: e.target.value })
                    }
                    className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Gold word</span>
                  <input
                    value={content.authHeadline?.highlight || ''}
                    onChange={(e) =>
                      setContent('authHeadline', {
                        ...content.authHeadline,
                        highlight: e.target.value,
                      })
                    }
                    className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Proof points (one per line)</span>
                <textarea
                  rows={3}
                  value={(content.authProof || []).join('\n')}
                  onChange={(e) =>
                    setContentField(
                      'authProof',
                      e.target.value.split('\n').map((v) => v.trim()).filter(Boolean),
                    )
                  }
                  className="w-full rounded-2xl border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
            </div>
          </div>

          <Button loading={busy === 'content'} onClick={saveContent}>
            Save website content
          </Button>
        </div>
      )}

      {active === 'settings' && settings && (
        <div className="mt-6 max-w-2xl space-y-4">
          <div className={card}>
            <h2 className="font-bold">Fare model overrides</h2>
            <p className="mt-1 text-sm text-muted">Leave empty to use the built-in per-vehicle rates.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                { key: 'baseFare', label: 'Base fare ($)' },
                { key: 'perKm', label: 'Per km ($)' },
                { key: 'perMin', label: 'Per min ($)' },
              ].map((f) => (
                <label key={f.key} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">{f.label}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={settings[f.key] ?? ''}
                    onChange={(e) =>
                      setSetting(f.key, e.target.value === '' ? null : Number(e.target.value))
                    }
                    className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className={card}>
            <h2 className="font-bold">Payments</h2>
            <label className="mt-4 flex items-center justify-between gap-4">
              <span className="text-sm text-ink">
                <span className="block font-medium">Enable online payments</span>
                <span className="text-xs text-muted">Hide the Pay button when off.</span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(settings.paymentsEnabled)}
                onChange={(e) => setSetting('paymentsEnabled', e.target.checked)}
                className="h-5 w-5 accent-brand-600"
              />
            </label>
          </div>

          <div className={card}>
            <h2 className="font-bold">Support info</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Phone</span>
                <input
                  value={settings.supportPhone || ''}
                  onChange={(e) => setSetting('supportPhone', e.target.value)}
                  className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
                <input
                  value={settings.supportEmail || ''}
                  onChange={(e) => setSetting('supportEmail', e.target.value)}
                  className="input-pill w-full border border-accent-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
            </div>
          </div>

          <Button loading={busy === 'settings'} onClick={saveSettings}>
            Save settings
          </Button>
        </div>
      )}
    </div>
  );
}
