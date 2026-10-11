import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import { VEHICLES } from '../data/vehicles.js';
import { SERVICES } from '../data/services.js';

// The fleet classes and service offerings an admin manages in
// /admin/content. These lists are read on nearly every screen, so they are
// fetched once here and shared, with the previous hardcoded arrays as the
// offline fallback — a page must never render an empty dropdown because the
// API was slow.
const FALLBACK_FLEET = VEHICLES.map((v, i) => ({
  _id: `fallback-${v.id}`,
  key: v.id,
  label: v.label,
  desc: v.desc,
  capacity: v.capacity,
  seats: v.seats,
  bags: v.bags,
  // Carry the real copy, not empty strings/arrays. Dropping `tagline` and
  // `features` made every vehicle description vanish whenever the API was
  // unreachable — which is exactly what a deployed site hits when
  // VITE_API_URL is unset, since the client then calls /api on its own origin.
  image: v.image,
  tagline: v.tagline,
  features: v.features,
  icon: 'car',
  active: true,
  sortOrder: i,
}));

const FALLBACK_SERVICES = SERVICES.map((s, i) => ({
  _id: `fallback-${s.slug}`,
  slug: s.slug,
  name: s.name,
  short: s.short,
  tagline: s.tagline,
  summary: s.summary,
  features: s.features,
  // `icon` is a NAME string for ServiceIcon, and `featured` drives the Home
  // band. Both were hardcoded to '' / false here, which blanked every service
  // icon and emptied the featured band whenever the API was unreachable.
  icon: s.icon,
  featured: s.featured,
  active: true,
  sortOrder: i,
}));

const CatalogContext = createContext({
  fleet: FALLBACK_FLEET,
  services: FALLBACK_SERVICES,
  loading: true,
  refresh: async () => {},
  vehicleLabel: (key) => key || '',
  vehicleByKey: (key) => FALLBACK_FLEET.find((v) => v.key === key) || null,
  serviceBySlug: (slug) => FALLBACK_SERVICES.find((s) => s.slug === slug) || null,
});

export function CatalogProvider({ children }) {
  const [fleet, setFleet] = useState(FALLBACK_FLEET);
  const [services, setServices] = useState(FALLBACK_SERVICES);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [f, s] = await Promise.all([
        api.get('/fleet', { timeout: 8000 }),
        api.get('/services', { timeout: 8000 }),
      ]);
      // The bundled copy is a safety net for a failed request only. A successful
      // response always wins — including an empty array, which is an admin's
      // deliberate "nothing is active". Keeping the fallback there would publish
      // classes and services the owner deactivated or deleted.
      if (Array.isArray(f.data?.vehicles)) setFleet(f.data.vehicles);
      if (Array.isArray(s.data?.services)) setServices(s.data.services);
    } catch {
      // Keep the fallback copy.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => {
    const byKey = new Map(fleet.map((v) => [v.key, v]));
    const bySlug = new Map(services.map((s) => [s.slug, s]));
    return {
      fleet,
      services,
      loading,
      refresh: load,
      vehicleByKey: (key) => byKey.get(key) || null,
      // Unknown keys (a class an admin deleted after a ride was booked) must
      // still render something readable rather than a raw slug.
      vehicleLabel: (key) => byKey.get(key)?.label || (key ? String(key).replace(/-/g, ' ') : '—'),
      serviceBySlug: (slug) => bySlug.get(slug) || null,
      featuredServices: services.filter((s) => s.featured),
    };
  }, [fleet, services, loading, load]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
export const useFleet = () => useContext(CatalogContext).fleet;
export const useServices = () => useContext(CatalogContext).services;
