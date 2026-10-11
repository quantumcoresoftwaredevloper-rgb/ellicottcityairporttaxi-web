import { Link } from 'react-router-dom';
import { Phone, Check, Car } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { useContent } from '../../context/ContentContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';

export default function Fleet() {
  const { user } = useAuth();
  const { content } = useContent();
  // Admin-managed from /admin/content → Fleet. Marketing copy, imagery and
  // capacity lines all come from the catalog, not this file.
  const { fleet } = useCatalog();
  const bookUrl = user ? '/reservations' : '/login';

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
            Our fleet
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            A vehicle for <span className="text-gold-300">every journey</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            From elegant executive sedans to spacious vans, mini-coaches and motorcoaches — every
            vehicle in our fleet is meticulously maintained to the highest standards of comfort
            and safety.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to={bookUrl}>
              <Button size="lg" className="shadow-xl">
                Book a vehicle now
              </Button>
            </Link>
            <a
              href={`tel:${content.contactPhoneHref}`}
              className="phone-number inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base text-white transition-colors hover:bg-white/10 "
            >
              <Phone className="h-4 w-4" />
              {content.contactPhone}
            </a>
          </div>
        </div>
      </section>

      {/* ============ FLEET GRID ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {fleet.map((v, i) => (
            <Reveal key={v.key} delay={(i % 3) * 90}>
              <div className="card-lift group flex h-full flex-col overflow-hidden panel">
                <div className="img-zoom relative bg-gradient-to-b from-brand-50 to-white">
                  {v.image ? (
                    <img
                      src={v.image}
                      alt={`${v.label} — ${content.brandName}`}
                      className="h-52 w-full object-contain p-4"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-52 w-full place-items-center text-brand-300">
                      <Car className="h-12 w-12" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xl font-bold text-ink">{v.label}</h3>
                    {v.capacity && (
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                        {v.capacity}
                      </span>
                    )}
                  </div>
                  {v.tagline && <p className="mt-1 text-sm font-medium text-brand-600">{v.tagline}</p>}
                  <ul className="mt-5 space-y-2">
                    {(v.features || []).map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex-1" />
                  <div className="flex gap-3">
                    <Link to={bookUrl} className="flex-1">
                      <Button className="w-full">Book now</Button>
                    </Link>
                    <a
                      href={`tel:${content.contactPhoneHref}`}
                      className="grid h-11 w-11 place-items-center rounded-full border border-accent-200 text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                      aria-label={`Call about ${v.label}`}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Group travel note */}
        <Reveal delay={120}>
          <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-3xl bg-brand-gradient px-8 py-10 text-white sm:flex-row">
            <div>
              <h3 className="text-xl font-bold">Not sure which vehicle fits your group?</h3>
              <p className="mt-1 text-sm text-white/80">
                Our coordinators will help you pick the right size — from sedans to 56-passenger
                motorcoaches.
              </p>
            </div>
            <a href={`tel:${content.contactPhoneHref}`}>
              <Button size="lg" className="phone-number shadow-lg">
                Call {content.contactPhone}
              </Button>
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  );
}