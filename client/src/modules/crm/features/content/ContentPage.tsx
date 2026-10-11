import * as React from 'react';
import { FileText, Car, Sparkles } from 'lucide-react';
import ContentEditor from './ContentEditor';
import FleetManager from './FleetManager';
import ServicesManager from './ServicesManager';
import { useQuery } from '@tanstack/react-query';
import api from '../../../../services/api.js';

// One place to run the business: the words on the site, the vehicles you sell
// and the services you offer. Each tab is independent, so an admin editing a
// fleet fare never risks publishing a half-written headline.
const TABS = [
  { id: 'content', label: 'Website content', icon: FileText, hint: 'Headlines, contact details, stats, testimonials', Component: ContentEditor },
  { id: 'fleet', label: 'Fleet', icon: Car, hint: 'Bookable vehicle classes, fares and imagery', Component: FleetManager },
  { id: 'services', label: 'Services', icon: Sparkles, hint: 'Service offerings, features and the booking picker', Component: ServicesManager },
];

const readTabFromHash = () => {
  const hash = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === hash) ? hash : 'content';
};

export default function ContentPage() {
  const [tab, setTab] = React.useState(readTabFromHash);

  // Reflect the active tab into the URL so links stay shareable. pushState
  // (not replaceState) so browser back/forward moves between tabs.
  React.useEffect(() => {
    if (readTabFromHash() === tab) return;
    window.history.pushState(null, '', `#${tab}`);
  }, [tab]);

  // Follow the URL. Without this, a hash deep-link opened on an already-mounted
  // page (or a back/forward step) left the previous tab on screen.
  React.useEffect(() => {
    const sync = () => setTab(readTabFromHash());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const { data } = useQuery({
    queryKey: ['admin', 'catalog-counts'],
    queryFn: async () => {
      const [f, s] = await Promise.all([api.get('/admin/fleet'), api.get('/admin/services')]);
      return {
        fleet: f.data?.vehicles?.length || 0,
        fleetHidden: (f.data?.vehicles || []).filter((v: any) => !v.active).length,
        services: s.data?.services?.length || 0,
        servicesHidden: (s.data?.services || []).filter((x: any) => !x.active).length,
      };
    },
  });

  const counts: Record<string, React.ReactNode> = {
    fleet: data ? `${data.fleet}${data.fleetHidden ? ` · ${data.fleetHidden} hidden` : ''}` : null,
    services: data ? `${data.services}${data.servicesHidden ? ` · ${data.servicesHidden} hidden` : ''}` : null,
  };

  const { Component } = TABS.find((t) => t.id === tab) || TABS[0];

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink dark:text-white">Content &amp; catalog</h1>
        <p className="mt-1 text-sm text-muted">
          Everything customers see, in one place. Changes publish as soon as you save.
        </p>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-accent-200 pb-px dark:border-accent-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === id
                ? 'border-brand-600 text-brand-700 dark:text-brand-300'
                : 'border-transparent text-muted hover:border-accent-300 hover:text-ink dark:hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {counts[id] && <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] tabular-nums text-muted dark:bg-accent-800">{counts[id]}</span>}
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-2xl bg-accent-50 px-4 py-2.5 text-xs text-muted dark:bg-accent-900/60">
        {TABS.find((t) => t.id === tab)?.hint}
      </div>

      <Component />
    </div>
  );
}
