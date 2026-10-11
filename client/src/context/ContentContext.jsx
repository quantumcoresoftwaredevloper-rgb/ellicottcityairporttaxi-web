import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import { formatPhoneDisplay } from '../lib/phone.js';

// Admin-managed website content.
//
// The defaults below MUST stay in sync with CONTENT_DEFAULTS in
// server/src/services/contentService.js. They are what renders if the API is
// slow, blocked or down, so the marketing pages never flash empty text.
export const CONTENT_FALLBACK = {
  brandName: 'Ellicott City Airport Taxi',
  brandLineOne: 'Ellicott City',
  brandLineTwo: 'Airport Taxi',
  tagline: 'Airport transfers and black-car service across Maryland, DC and Virginia.',
  heroEyebrow: 'Ellicott City, MD · Available 24/7',
  heroTitle: 'Ellicott City’s premier',
  heroHighlight: 'full-service',
  heroTitleTail: 'transportation provider',
  heroSubtitle:
    'Professional taxi, sedan and SUV service across Maryland, DC, and Virginia — airport transfers, corporate travel, weddings, events and more. Book online, pay upfront, track your driver live.',
  heroCtaLabel: 'Book your ride online',
  contactPhone: '410-365-5556',
  contactPhoneHref: '4103655556',
  contactEmail: 'chriskbonsu@gmail.com',
  contactAddress: '9019 Early April Way, Ellicott City, MD',
  serviceArea: 'Maryland, DC, and Virginia',
  hours: 'Available 24/7 — book online or call dispatch.',
  aboutTitle: 'Built on punctuality',
  aboutHighlight: 'and trust',
  aboutBody:
    'Ellicott City Airport Taxi has spent years making Howard County feel smaller. From BWI runs at dawn to black-car service for corporate accounts, every trip is handled by a professional driver who knows the region — and prices quoted upfront, before you book.',
  stats: [
    { value: '24/7', label: 'Service, every day' },
    { value: '18+', label: 'Communities served' },
    { value: '10,000+', label: 'Rides completed' },
    { value: '5.0', label: 'Passenger rating' },
  ],
  testimonials: [
    {
      quote:
        'Picked me up at BWI at 4:30am, drove the whole way professionally, and the fare was exactly what I saw on the app. Flawless.',
      name: 'Danielle R.',
      detail: 'Ellicott City, MD · Airport transfer',
    },
    {
      quote:
        'We booked a sedan for our wedding party of six. The drivers were early, immaculate, and so kind. Could not have asked for a smoother day.',
      name: 'Marcus & Priya',
      detail: 'Ellicott City, MD · Wedding',
    },
    {
      quote:
        'I use Ellicott City Airport Taxi every week for the commute to the office. Reliable, clean cars and the same great driver most mornings.',
      name: 'Jennifer W.',
      detail: 'Ellicott City, MD · Corporate account',
    },
  ],
  serviceAreas: [
    'Columbia', 'Ellicott City', 'Elkridge', 'Fulton', 'Laurel', 'Savage',
    'Highland', 'Jessup', 'Clarksville', 'Dayton', 'West Friendship', 'Woodstock',
    'Glenelg', 'Glenwood', 'Mount Airy', 'Sykesville', 'Woodbine', 'Cooksville',
    'Marriottsville', 'Hanover', 'Simpsonville', 'Lisbon', 'Annapolis Junction',
  ],
  authProof: [
    'Licensed & insured chauffeurs',
    '24/7 dispatch, upfront flat fares',
    'Every airport · BWI, IAD, DCA',
  ],
  authHeadline: { title: 'Every ride,', highlight: 'handled.' },
};

const ContentContext = createContext({
  content: CONTENT_FALLBACK,
  loading: true,
  refresh: async () => {},
  telHref: CONTENT_FALLBACK.contactPhoneHref,
});

export function ContentProvider({ children }) {
  const [content, setContent] = useState(CONTENT_FALLBACK);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/content', { timeout: 8000 });
      if (data?.content) setContent({ ...CONTENT_FALLBACK, ...data.content });
    } catch {
      // Keep the fallback copy — a marketing page must never render blank.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Normalise the number here, once, so every component that renders
  // `content.contactPhone` shows it straight — without each call site having to
  // remember, and regardless of how the value is stored in the database.
  const displayContent = useMemo(
    () => ({ ...content, contactPhone: formatPhoneDisplay(content.contactPhone) }),
    [content],
  );

  const value = useMemo(
    () => ({
      content: displayContent,
      loading,
      refresh: load,
      telHref: content.contactPhoneHref,
    }),
    [displayContent, loading, load, content.contactPhoneHref],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
