import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Phone } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useContent } from '../../context/ContentContext.jsx';

const inputCls =
  'w-full rounded-xl border border-accent-200 bg-surface px-4 py-3 text-sm text-ink placeholder:text-accent-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';

export default function Contact() {
  const { services } = useCatalog();
  const { content } = useContent();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    message: '',
  });
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Quote request — ${form.service || 'General'}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nService: ${form.service}\nPreferred date: ${form.date}\n\nMessage:\n${form.message}`
    );
    window.location.href = `mailto:${content.contactEmail}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="bg-brand-gradient relative overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-gold-500/15 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white/85 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-gold-400" />
            Contact us
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Have questions before a quote? <span className="text-gold-300">Let’s chat.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Sometimes a few questions come up before diving into a quote. No worries — we are here
            to help. Shoot us a message and we will gladly assist you.
          </p>
        </div>
      </section>

      {/* ============ FORM + INFO ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="card p-8 sm:p-10">
              <h2 className="text-2xl font-bold text-ink">Get a free quote</h2>
              <p className="mt-2 text-sm text-muted">
                Fill in a few details and our dispatch team will get right back to you.
              </p>

              {sent ? (
                <div className="mt-8 rounded-2xl bg-brand-gradient-soft p-6 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface">
                    <CheckCircle2 className="h-8 w-8 text-brand-600" />
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-brand-900">Almost there!</h3>
                  <p className="mt-2 text-sm text-brand-950/70">
                    Your email app should have opened with your request. Send it and we will be in
                    touch shortly. Prefer to talk now?
                  </p>
                  <a
                    href={`tel:${content.contactPhoneHref}`}
                    className="phone-number mt-4 inline-flex items-center gap-2 rounded-full bg-surface px-6 py-3 text-sm text-brand-800 shadow-sm hover:bg-brand-50 "
                  >
                    <Phone className="h-4 w-4" />
                    {content.contactPhone}
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="c-name">Full name</label>
                      <input id="c-name" required value={form.name} onChange={set('name')} className={inputCls} placeholder="Jane Smith" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="c-phone">Phone</label>
                      <input id="c-phone" required value={form.phone} onChange={set('phone')} className={inputCls} placeholder="(443) 555-0123" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="c-email">Email</label>
                    <input id="c-email" type="email" required value={form.email} onChange={set('email')} className={inputCls} placeholder="jane@example.com" />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="c-service">Service needed</label>
                      <select id="c-service" value={form.service} onChange={set('service')} className={inputCls}>
                        <option value="">Select a service…</option>
                        {services.map((s) => (
                          <option key={s.slug} value={s.name}>{s.name}</option>
                        ))}
                        <option value="Other">Other / not sure</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="c-date">Preferred date</label>
                      <input id="c-date" type="date" value={form.date} onChange={set('date')} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="c-message">Message</label>
                    <textarea id="c-message" rows={4} value={form.message} onChange={set('message')} className={inputCls} placeholder="Tell us about your trip…" />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-brand-gradient px-6 py-3.5 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-90"
                  >
                    Request my free quote
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-5 lg:col-span-2">
            <div className="card p-8">
              <h3 className="text-base font-bold text-ink">Call or email</h3>
              <a
                href={`tel:${content.contactPhoneHref}`}
                className="phone-number mt-4 block text-xl font-semibold text-brand-900 hover:underline"
              >
                {content.contactPhone}
              </a>
              <a href={`mailto:${content.contactEmail}`} className="mt-1 block text-sm text-brand-700 underline-offset-2 hover:underline">
                {content.contactEmail}
              </a>
              <p className="mt-4 text-sm text-muted">Available 24 hours a day, 7 days a week.</p>
            </div>

            <div className="card p-8">
              <h3 className="text-base font-bold text-ink">Find us</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Based in Ellicott City, Maryland — serving Maryland, DC, and Virginia. Door-to-door,
                local and long-distance.
              </p>
            </div>

            <div className="rounded-3xl bg-brand-gradient p-8 text-white">
              <h3 className="text-base font-bold">Prefer to book online?</h3>
              <p className="mt-2 text-sm text-white/80">
                Skip the form — book your ride instantly with live availability and an upfront
                fare.
              </p>
              <Link
                to="/reservations"
                className="mt-5 inline-block rounded-full bg-surface px-6 py-3 text-sm font-semibold text-brand-900 shadow-sm hover:bg-brand-50"
              >
                Open the booking portal
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}