import { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Receipt, Search, Star, Phone, MapPin, Flag, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useContent } from '../../context/ContentContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useWebGLSupport } from '../../components/three/useWebGLSupport.js';
import { useCatalog } from '../../context/CatalogContext.jsx';
import ServiceIcon from '../../components/ui/ServiceIcon.jsx';
import { estimateQuote, formatMoney } from '../../lib/quote.js';

// Lazy-loaded so the WebGL/three bundle only downloads when the taxi actually renders.
const HeroTaxiScene = lazy(() => import('../../components/three/HeroTaxiScene.jsx'));

const TRUST = [
  { icon: ShieldCheck, label: 'Licensed & insured' },
  { icon: Receipt, label: 'Upfront, transparent pricing' },
  { icon: Search, label: 'Background-checked drivers' },
  { icon: Star, label: 'Rated after every ride' },
];

/** Label on the left, control on the right — the quick-quote row layout. */
function QuoteRow({ label, htmlFor, children }) {
  return (
    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[7.5rem_1fr] sm:gap-4">
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-wider text-white/70"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const STEPS = [
  { n: '01', t: 'Book your ride', d: 'Set your pickup and dropoff on the web or app. See the price upfront before you confirm — no meter surprises.' },
  { n: '02', t: 'We match your driver', d: 'The nearest available professional is matched to you and notified instantly. You know exactly who is coming.' },
  { n: '03', t: 'Track & ride', d: 'Follow your driver live on the map, share the trip with loved ones, and rate your ride when it ends.' },
];

export default function Home() {
  const { user } = useAuth();
  const { content } = useContent();
  const bookUrl = user ? '/reservations' : '/login';

  // 3D taxi: hidden on mobile and when WebGL is unavailable; tablets get a compact variant.
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const webgl = useWebGLSupport();
  const showTaxi = !isMobile && webgl;

  const { featuredServices: featured, fleet } = useCatalog();

  // Quick-quote widget state. Every control here maps to a real field on the
  // Ride model (pickup, dropoff, vehicleType, passengerCount) and a real input
  // on the booking form — nothing is invented for the card.
  const [vehicleKey, setVehicleKey] = useState('executive-sedan');
  const [passengers, setPassengers] = useState(1);
  const [miles, setMiles] = useState(0);
  const seatCap = fleet.find((v) => v.key === vehicleKey)?.seats || 4;
  const quote = estimateQuote(miles);

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="bg-dots-brand relative overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl" />
        </div>

        <div className="relative">
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white/85 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold-400" />
                {content.heroEyebrow}
              </span>

              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {content.heroTitle}{' '}
                <span className="text-gold-300">{content.heroHighlight}</span>{' '}
                {content.heroTitleTail}
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
                {content.heroSubtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to={bookUrl}>
                  <Button size="lg" className="shadow-xl">
                    {content.heroCtaLabel}
                  </Button>
                </Link>
                <a
                  href={`tel:${content.contactPhoneHref}`}
                  className="phone-number inline-flex items-center gap-2 px-1 py-1 text-base text-white/90 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4" />
                  {content.contactPhone}
                </a>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {TRUST.map((t) => (
                  <div key={t.label} className="flex items-center gap-2 text-sm text-white/75">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
                      <t.icon className="h-4 w-4" />
                    </span>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick quote card — a real, working estimate widget.
                Opaque navy: a translucent panel would let the dotted world map
                read through it and look like it was floating in front. */}
            <div className="relative z-10">
              <div className="rounded-3xl border border-brand-700 bg-brand-950 p-6 text-white shadow-2xl sm:p-8">
                <h3 className="text-2xl font-extrabold tracking-tight uppercase">
                  Get a quick quote
                </h3>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/70">
                  <span>Real-time availability</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-800 px-2.5 py-0.5 text-xs font-semibold text-gold-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-300" />
                    Drivers online
                  </span>
                </p>

                <div className="mt-6 space-y-3">
                  {/* Label left, control right — the reference layout. */}
                  <QuoteRow label="Pickup" htmlFor="qq-pickup">
                    <Link
                      to={bookUrl}
                      id="qq-pickup"
                      className="flex w-full items-center gap-2.5 rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-accent-100"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
                      Where are you?
                    </Link>
                  </QuoteRow>

                  <QuoteRow label="Dropoff" htmlFor="qq-dropoff">
                    <Link
                      to={bookUrl}
                      id="qq-dropoff"
                      className="flex w-full items-center gap-2.5 rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-accent-100"
                    >
                      <Flag className="h-4 w-4 shrink-0 text-brand-600" />
                      Where to?
                    </Link>
                  </QuoteRow>

                  <QuoteRow label="Vehicle" htmlFor="qq-vehicle">
                    <select
                      id="qq-vehicle"
                      value={vehicleKey}
                      onChange={(e) => {
                        const next = e.target.value;
                        setVehicleKey(next);
                        // Real product rule: you cannot book more riders than
                        // the chosen class seats.
                        const cls = fleet.find((v) => v.key === next);
                        const cap = cls?.seats || 4;
                        setPassengers((p) => Math.min(p, cap));
                      }}
                      className="w-full cursor-pointer rounded-xl border-0 bg-white px-4 py-3 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-500"
                    >
                      {fleet.map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.label} — up to {v.seats ?? 4}
                        </option>
                      ))}
                    </select>
                  </QuoteRow>

                  <QuoteRow label="Riders">
                    <div className="flex w-full items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                        disabled={passengers <= 1}
                        aria-label="One fewer rider"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg font-bold leading-none text-brand-700 transition-colors hover:bg-accent-100 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-[3.5rem] text-center text-base font-bold text-white tabular-nums">
                        {passengers}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPassengers((p) => Math.min(seatCap, p + 1))}
                        disabled={passengers >= seatCap}
                        aria-label="One more rider"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg font-bold leading-none text-brand-700 transition-colors hover:bg-accent-100 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </QuoteRow>

                  <QuoteRow label="Dist (miles)">
                    <div className="flex w-full items-center gap-3">
                      {/* The value rides the thumb, like the reference. */}
                      <span
                        aria-hidden="true"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white tabular-nums"
                      >
                        {miles}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="120"
                        step="1"
                        value={miles}
                        aria-label="Trip distance in miles"
                        onChange={(e) => setMiles(Number(e.target.value))}
                        className="quote-range h-2 w-full cursor-pointer appearance-none rounded-full bg-white/40 accent-brand-500"
                      />
                    </div>
                  </QuoteRow>
                </div>

                {/* The total bar is the CTA — it goes to the real booking flow. */}
                <Link
                  to={bookUrl}
                  className="mt-6 flex items-stretch overflow-hidden rounded-xl bg-brand-600 transition-colors hover:bg-brand-700"
                >
                  <span className="flex-1 px-5 py-3.5 text-right text-sm font-bold uppercase tracking-wider text-white">
                    Estimated total
                  </span>
                  <span className="min-w-[7.5rem] bg-brand-800 px-5 py-3.5 text-center text-lg font-extrabold text-white tabular-nums">
                    {formatMoney(quote.total)}
                  </span>
                </Link>
                <p className="mt-2.5 text-center text-xs text-white/60">
                  {miles === 0
                    ? 'Drag the distance slider for an instant estimate.'
                    : 'Standard rate estimate. Your fare is confirmed from the exact route and vehicle at booking.'}
                </p>
              </div>
            </div>
          </div>

          {/* 3D taxi — behind the booking card for depth, never blocking interaction */}
          {showTaxi && (
            <div
              className="taxi-fade-in pointer-events-none absolute inset-0 z-[6]"
              aria-hidden="true"
            >
              <Suspense fallback={null}>
                <HeroTaxiScene variant={isDesktop ? 'desktop' : 'tablet'} />
              </Suspense>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-black/10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {content.stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-gold-300 sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-sm text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WELCOME / ABOUT BLURB ============ */}
      <section className="bg-dots mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Welcome to Ellicott City Airport Taxi
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Peace of mind, <span className="text-brand-gradient">every mile</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              Ellicott City Airport Taxi delivers professional, reliable and comfortable
              transportation across
              Maryland, DC, and Virginia for private schools, corporate clients, events, airport
              transfers and
              group travel. Our experienced drivers provide safe, seamless journeys — every time.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Every driver is professionally trained, licensed and background-checked. Our service
              manager monitors quality continuously and passengers rate every trip, so we can hold
              the Ellicott City Airport Taxi standard of excellence.
            </p>
            <ul className="mt-6 space-y-3">
              {['Prompt, efficient, comfortable and safe', 'Clean, modern, well-maintained vehicles', 'Transparent upfront pricing', 'Professional, courteous drivers'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium text-ink">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Get a quote card */}
          <div className="overflow-hidden rounded-3xl border border-brand-600 bg-brand-900 p-8 text-white shadow-xl sm:p-10">
            <div>
              <h3 className="text-2xl font-bold">Book online or call</h3>
              <a
                href={`tel:${content.contactPhoneHref}`}
                className="phone-number mt-2 block text-lg text-gold-300 hover:underline"
              >
                {content.contactPhone}
              </a>
              <p className="mt-4 text-[15px] leading-relaxed text-white/80">
                Get a free, no-obligation quote for airport transfers, events, corporate accounts
                and group travel. Our dispatch team is here 24/7.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={bookUrl}>
                  <Button size="lg" className="shadow-lg">
                    Get a free quote
                  </Button>
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  About us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURED SERVICES ============ */}
      {/* Dots composited with the soft wash — see bg-dots-soft in index.css */}
      <section className="bg-dots-soft py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                What we offer
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Reliable transportation for every occasion
              </h2>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 rounded-full border border-brand-600 px-5 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              View all services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 100} className="h-full">
                <Link
                  to={`/services/${s.slug}`}
                  className="card-lift group relative flex h-full flex-col card p-7"
                >
                  <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl bg-brand-gradient opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient-soft">
<ServiceIcon name={s.icon} className="h-7 w-7 text-brand-700" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{s.name}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {s.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{s.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Learn more
                    <span className="transition-transform group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ IMAGE BAND ============ */}
      {/* The band lets the image set its own height (`w-full`, no fixed h-*, no
          object-cover). A fixed short band plus object-cover cropped the roof
          and the wheels off the car. The scrim is desktop-only and sits on top
          of the image; on small screens the copy moves below it so it is never
          squeezed over the photo. */}
      <section className="relative overflow-hidden bg-brand-950">
        <img
          src="/images/ececutive-sedan.png"
          alt="Ellicott City Airport Taxi executive sedan"
          className="block w-full"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-brand-950 from-5% via-brand-950/80 to-transparent md:block" />
        {/* The source photo has a white studio background, so its bottom margin
            would otherwise read as a bright strip under the car. Fade it into
            the band. */}
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-brand-950 via-brand-950/45 to-transparent md:block" />
        <div className="relative bg-brand-950 px-4 py-10 sm:px-6 md:absolute md:inset-0 md:flex md:items-center md:bg-transparent md:py-0">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Professional chauffeurs. Immaculate vehicles. Every single time.
              </h2>
              <p className="mt-3 text-sm text-white/80 sm:text-base">
                Every vehicle is cleaned, inspected and ready for you — and every driver is
                licensed, insured and background-checked.
              </p>
              <Link
                to="/fleet"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface px-6 py-3 text-sm font-semibold text-brand-900 shadow-lg transition-colors hover:bg-brand-50"
              >
                Explore the fleet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      {/* Dotted texture on the how-it-works band */}
      <section className="bg-dots mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Simple &amp; swift booking
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Booking is effortless
          </h2>
          <p className="mt-4 text-muted">
            From request to drop-off in three simple steps — on the web or on our mobile app.
          </p>
        </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 120} className="h-full">
                <div className="card-lift h-full card p-8">
                  <div className="text-brand-gradient text-4xl font-extrabold">{s.n}</div>
                  <h3 className="mt-4 text-lg font-bold text-ink">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="bg-dots-brand py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold-300">
              Testimonials
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Our clients share the love
            </h2>
                        <div className="mt-4 flex justify-center gap-0.5 text-gold-400" aria-label="Five star reviews">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {content.testimonials.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 110} className="h-full">
                <figure className="card-lift h-full rounded-3xl border border-accent-200 bg-surface p-7">
                  <div className="flex gap-0.5 text-gold-600" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                  <blockquote className="mt-4 text-[15px] leading-relaxed text-ink">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 border-t border-accent-200 pt-4">
                    <div className="font-semibold text-ink">{t.name}</div>
                    <div className="mt-0.5 text-sm text-muted">{t.detail}</div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SERVICE AREAS ============ */}
      <section className="bg-dots mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Locally based
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            We are available across Maryland, DC, and Virginia
          </h2>
          <p className="mt-4 text-muted">
            Based in Ellicott City, Ellicott City Airport Taxi operates actively in every
            community across the region — plus BWI, Dulles, Reagan National, Amtrak and MARC
            terminals.
          </p>
        </div>

        <Reveal delay={80}>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {content.serviceAreas.map((a) => (
              <span
                key={a}
                className="rounded-full border border-accent-200 bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:border-brand-300"
              >
                {a}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-brand-gradient-soft px-6 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
            Ready for a ride?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-brand-950/70">
            Book online in seconds, or call our 24/7 dispatch team and we will take care of the
            rest.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to={bookUrl}>
              <Button size="lg" className="py-3.5">
                Book a ride now
              </Button>
            </Link>
            <a
              href={`tel:${content.contactPhoneHref}`}
              className="phone-number inline-flex items-center gap-2 rounded-full bg-surface px-6 py-3 text-base text-brand-800 shadow-sm transition-colors hover:bg-brand-50 "
            >
              <Phone className="h-4 w-4" />
              {content.contactPhone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
