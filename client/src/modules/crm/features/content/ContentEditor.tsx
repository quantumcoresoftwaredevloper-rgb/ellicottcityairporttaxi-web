import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Monitor, Smartphone } from 'lucide-react';
import api from '../../../../services/api.js';
import { useContent } from '../../../../context/ContentContext.jsx';
import { Field, Area, Section, Repeater, SaveBar, inputCls } from './fields';

// A copy deck, not a form dump: every section says where its fields appear on
// the live site, and the whole deck publishes in one save so a half-edited
// page never goes out.
const SECTIONS = [
  { id: 'brand', label: 'Brand & contact' },
  { id: 'hero', label: 'Home hero' },
  { id: 'stats', label: 'Home stats' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'areas', label: 'Service areas' },
  { id: 'about', label: 'About' },
  { id: 'auth', label: 'Login panel' },
];

const changedKeys = (a: any, b: any) =>
  Object.keys(b || {}).filter((k) => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k]));

export default function ContentEditor() {
  const { refresh } = useContent();
  const qc = useQueryClient();
  const [draft, setDraft] = React.useState<any>(null);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState(false);
  const [active, setActive] = React.useState('brand');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'content'],
    queryFn: async () => (await api.get('/admin/content')).data,
  });
  const server: any = data?.content;

  React.useEffect(() => {
    if (server) setDraft(JSON.parse(JSON.stringify(server)));
  }, [server]);

  const dirty = server && draft ? changedKeys(draft, server) : [];
  const isDirty = dirty.length > 0;

  const save = useMutation({
    mutationFn: async () => (await api.patch('/admin/content', draft)).data,
    onSuccess: async (res) => {
      if (res?.content) setDraft(JSON.parse(JSON.stringify(res.content)));
      setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      await refresh();
      await qc.invalidateQueries({ queryKey: ['admin', 'content'] });
    },
  });

  // Cmd/Ctrl+S publishes, and a tab close with unsaved edits warns first.
  React.useEffect(() => {
    if (!isDirty) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!save.isPending) save.mutate();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    document.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDirty, save]);

  // Highlight the section the admin is looking at.
  React.useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: '-96px 0px -60% 0px' },
    );
    SECTIONS.forEach((s) => document.getElementById(s.id) && obs.observe(document.getElementById(s.id)!));
    return () => obs.disconnect();
  }, [draft]);

  if (isLoading || !draft) {
    return <div className="h-40 animate-pulse rounded-2xl bg-accent-200 dark:bg-accent-800" />;
  }

  const set = (k: string, v: any) => {
    setSavedAt(null);
    setDraft((p: any) => ({ ...p, [k]: v }));
  };
  const isSectionDirty = (id: string) => {
    const keys = SECTION_KEYS[id] || [];
    return keys.some((k) => JSON.stringify(draft?.[k]) !== JSON.stringify(server?.[k]));
  };
  const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink dark:text-white">Website content</h1>
          <p className="mt-1 text-sm text-muted">
            Live copy for the public site and the login panel. One save publishes every section — press{' '}
            <kbd className="rounded-md bg-accent-100 px-1.5 py-0.5 text-xs dark:bg-accent-800">⌘S</kbd> to save.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
            preview ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950' : 'border-accent-300 text-muted hover:bg-accent-100 dark:border-accent-700 dark:hover:bg-accent-800'
          }`}
        >
          <Eye className="h-4 w-4" /> {preview ? 'Hide' : 'Show'} hero preview
        </button>
      </div>

      {preview && <HeroPreview c={draft} />}

      <div className="flex gap-5">
        {/* Section rail — sticky on desktop, horizontal scroller on mobile. */}
        <nav className="sticky top-24 hidden h-fit shrink-0 lg:block">
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    active === s.id ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/40' : 'text-muted hover:bg-accent-100 dark:hover:bg-accent-800'
                  }`}
                >
                  {s.label}
                  {isSectionDirty(s.id) && <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active === s.id ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40' : 'border-accent-300 text-muted'
                }`}
              >
                {s.label}
              </a>
            ))}
          </div>

          <Section
            id="brand"
            title="Brand & contact"
            description="Shown in the navbar, footer, contact page, Careers and every dispatch call-to-action."
            dirty={isSectionDirty('brand')}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Brand name" value={draft.brandName || ''} onChange={(v) => set('brandName', v)} max={60} />
                <Field label="Logo line 1" value={draft.brandLineOne || ''} onChange={(v) => set('brandLineOne', v)} max={30} />
                <Field label="Logo line 2" value={draft.brandLineTwo || ''} onChange={(v) => set('brandLineTwo', v)} max={30} />
              </div>
              <Area label="Footer blurb" rows={2} value={draft.tagline || ''} onChange={(v) => set('tagline', v)} max={240} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Phone (display)"
                  value={draft.contactPhone || ''}
                  onChange={(v) => set('contactPhone', v)}
                  hint="Formatted for people to read"
                  max={30}
                />
                <Field
                  label="Phone (dial link)"
                  value={draft.contactPhoneHref || ''}
                  onChange={(v) => set('contactPhoneHref', v.replace(/[^0-9+]/g, ''))}
                  hint="Digits only — used for tel: links"
                />
                <Field label="Email" type="email" value={draft.contactEmail || ''} onChange={(v) => set('contactEmail', v)} />
                <Field label="Service area" value={draft.serviceArea || ''} onChange={(v) => set('serviceArea', v)} max={80} />
                <Field label="Street address" value={draft.contactAddress || ''} onChange={(v) => set('contactAddress', v)} max={120} />
                <Field label="Opening hours" value={draft.hours || ''} onChange={(v) => set('hours', v)} max={80} />
              </div>
            </div>
          </Section>

          <Section
            id="hero"
            title="Home hero"
            description="The first thing a visitor reads. The gold word is what makes the headline pop on the red band."
            dirty={isSectionDirty('hero')}
          >
            <div className="space-y-4">
              <Field label="Eyebrow" value={draft.heroEyebrow || ''} onChange={(v) => set('heroEyebrow', v)} max={80} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Title" value={draft.heroTitle || ''} onChange={(v) => set('heroTitle', v)} max={60} />
                <Field label="Gold word" value={draft.heroHighlight || ''} onChange={(v) => set('heroHighlight', v)} max={40} />
                <Field label="Title tail" value={draft.heroTitleTail || ''} onChange={(v) => set('heroTitleTail', v)} max={60} />
              </div>
              <Area label="Subtitle" value={draft.heroSubtitle || ''} onChange={(v) => set('heroSubtitle', v)} max={280} />
              <Field label="Button label" value={draft.heroCtaLabel || ''} onChange={(v) => set('heroCtaLabel', v)} max={40} />
            </div>
          </Section>

          <Section
            id="stats"
            title="Home stat band"
            description="Numbers rendered in gold on the red band."
            dirty={isSectionDirty('stats')}
          >
            <Repeater
              items={draft.stats || []}
              onChange={(v) => set('stats', v)}
              create={() => ({ value: '', label: '' })}
              addLabel="Add stat"
              emptyLabel="No stats yet — the band is hidden when empty."
              max={6}
              render={(row: any, update: any) => (
                <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                  <input value={row.value} onChange={(e) => update({ value: e.target.value })} placeholder="24/7" className={inputCls} />
                  <input value={row.label} onChange={(e) => update({ label: e.target.value })} placeholder="Service, every day" className={inputCls} />
                </div>
              )}
            />
          </Section>

          <Section
            id="testimonials"
            title="Testimonials"
            description="Shown in order in the Home testimonials band."
            dirty={isSectionDirty('testimonials')}
          >
            <Repeater
              items={draft.testimonials || []}
              onChange={(v) => set('testimonials', v)}
              create={() => ({ quote: '', name: '', detail: '' })}
              addLabel="Add testimonial"
              emptyLabel="No testimonials yet."
              max={12}
              render={(row: any, update: any) => (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={row.quote}
                    onChange={(e) => update({ quote: e.target.value })}
                    placeholder="Picked me up at BWI at 4:30am…"
                    className="w-full rounded-2xl border border-accent-300 bg-surface px-3 py-2 text-sm dark:border-accent-700 dark:bg-accent-900"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={row.name} onChange={(e) => update({ name: e.target.value })} placeholder="Name" className={inputCls} />
                    <input value={row.detail} onChange={(e) => update({ detail: e.target.value })} placeholder="City · Service" className={inputCls} />
                  </div>
                </div>
              )}
            />
          </Section>

          <Section
            id="areas"
            title="Service areas"
            description="Chips on the Home service-area band. Order is the display order."
            dirty={isSectionDirty('areas')}
          >
            <Repeater
              items={draft.serviceAreas || []}
              onChange={(v) => set('serviceAreas', v)}
              create={() => ''}
              addLabel="Add area"
              emptyLabel="No areas yet."
              max={30}
              addDisabled={(draft.serviceAreas || []).length >= 30}
              addDisabledReason="30 areas is plenty for one county and its neighbours"
              render={(item: string, update: (v: string) => void) => (
                <input value={item} onChange={(e) => update(e.target.value)} placeholder="Ellicott City" className={inputCls} />
              )}
            />
          </Section>

          <Section id="about" title="About section" description="Headline and body copy on the About page." dirty={isSectionDirty('about')}>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" value={draft.aboutTitle || ''} onChange={(v) => set('aboutTitle', v)} max={60} />
                <Field label="Gold phrase" value={draft.aboutHighlight || ''} onChange={(v) => set('aboutHighlight', v)} max={40} />
              </div>
              <Area label="Body" rows={5} value={draft.aboutBody || ''} onChange={(v) => set('aboutBody', v)} max={1200} />
            </div>
          </Section>

          <Section
            id="auth"
            title="Login / register panel"
            description="The brand panel beside the login and register forms."
            dirty={isSectionDirty('auth')}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Headline" value={draft.authHeadline?.title || ''} onChange={(v) => set('authHeadline', { ...draft.authHeadline, title: v })} max={40} />
                <Field
                  label="Gold word"
                  value={draft.authHeadline?.highlight || ''}
                  onChange={(v) => set('authHeadline', { ...draft.authHeadline, highlight: v })}
                  max={40}
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-ink dark:text-white">Proof points</span>
                <span className="mt-0.5 block text-xs text-muted">Listed under the headline with a tick.</span>
                <div className="mt-1">
                  <Repeater
                    items={draft.authProof || []}
                    onChange={(v) => set('authProof', v)}
                    create={() => ''}
                    addLabel="Add proof point"
                    emptyLabel="No proof points yet."
                    max={8}
                    render={(item: string, update: (v: string) => void) => (
                      <input value={item} onChange={(e) => update(e.target.value)} placeholder="Licensed & insured chauffeurs" className={inputCls} />
                    )}
                  />
                </div>
              </div>
            </div>
          </Section>

          <SaveBar
            dirtyCount={dirty.length}
            saving={save.isPending}
            savedAt={savedAt}
            error={save.isError ? save.error?.response?.data?.message || 'Could not save — check the fields and retry.' : ''}
            saveLabel="Publish content"
            onSave={() => save.mutate()}
            onDiscard={() => {
              setDraft(JSON.parse(JSON.stringify(server)));
              setSavedAt(null);
              save.reset();
            }}
          />
        </div>
      </div>
    </div>
  );
}

const SECTION_KEYS: Record<string, string[]> = {
  brand: ['brandName', 'brandLineOne', 'brandLineTwo', 'tagline', 'contactPhone', 'contactPhoneHref', 'contactEmail', 'contactAddress', 'serviceArea', 'hours'],
  hero: ['heroEyebrow', 'heroTitle', 'heroHighlight', 'heroTitleTail', 'heroSubtitle', 'heroCtaLabel'],
  stats: ['stats'],
  testimonials: ['testimonials'],
  areas: ['serviceAreas'],
  about: ['aboutTitle', 'aboutHighlight', 'aboutBody'],
  auth: ['authHeadline', 'authProof'],
};

/** Renders the hero exactly like the public band so copy decisions are visual. */
function HeroPreview({ c }: { c: any }) {
  const [mobile, setMobile] = React.useState(false);
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-accent-200 px-4 py-2 dark:border-accent-800">
        <span className="text-xs font-medium text-muted">Hero preview</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMobile(false)}
            aria-label="Desktop preview"
            className={`rounded-lg p-1.5 ${!mobile ? 'bg-accent-100 text-ink dark:bg-accent-800' : 'text-muted'}`}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobile(true)}
            aria-label="Mobile preview"
            className={`rounded-lg p-1.5 ${mobile ? 'bg-accent-100 text-ink dark:bg-accent-800' : 'text-muted'}`}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="bg-brand-gradient p-8 text-white">
        <div className={`mx-auto ${mobile ? 'max-w-[19rem]' : 'max-w-2xl'}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">{c.heroEyebrow}</p>
          <h3 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">
            {c.heroTitle} <span className="text-gold-300">{c.heroHighlight}</span> {c.heroTitleTail}
          </h3>
          <p className="mt-3 text-sm text-white/85">{c.heroSubtitle}</p>
          <span className="mt-5 inline-block rounded-full bg-gold-400 px-5 py-2 text-sm font-semibold text-accent-900">
            {c.heroCtaLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
