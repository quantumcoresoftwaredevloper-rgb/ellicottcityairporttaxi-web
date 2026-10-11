import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { Timer, Handshake, Sparkles, ShieldCheck, Phone, ArrowRight } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useContent } from '../../context/ContentContext.jsx';
import ServiceIcon from '../../components/ui/ServiceIcon.jsx';

const PROMISES = [
  { icon: Timer, title: 'Prompt', desc: 'We value your time. On-time pickup, efficient routing.' },
  { icon: Handshake, title: 'Courteous', desc: 'Professional drivers who treat you with respect.' },
  { icon: Sparkles, title: 'Clean & comfortable', desc: 'Modern, well-maintained vehicles you enjoy riding in.' },
  { icon: ShieldCheck, title: 'Safe', desc: 'Licensed, insured and continuously quality-monitored.' },
];

export default function Services() {
  const { services } = useCatalog();
  const { user } = useAuth();
  const { content } = useContent();
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
            Our services
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            A ride for <span className="text-gold-300">every occasion</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Whether you are coordinating group travel, planning a corporate event or need
            dependable airport transportation, we bring the same level of care, professionalism
            and comfort to every ride.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to={bookUrl}>
              <Button size="lg" className="shadow-xl">
                Book a ride now
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

      {/* ============ SERVICE GRID ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Full-service transportation
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Explore our services
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            From elegant sedans to spacious vans and buses, every vehicle is designed to meet the
            highest standards of luxury and safety.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.slug} delay={(i % 3) * 90} className="h-full">
              <Link
                to={`/services/${s.slug}`}
                className="card-lift group relative flex h-full flex-col overflow-hidden card p-7"
              >
                <div className="absolute inset-x-0 top-0 h-1.5 bg-brand-gradient opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex items-start justify-between">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient-soft">
<ServiceIcon name={s.icon} className="h-7 w-7 text-brand-700" />
                  </span>
                  <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
                    {s.tagline}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-ink">{s.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{s.summary}</p>
                <div className="mt-5 flex-1" />
                <span className="inline-flex items-center gap-1.5 border-t border-accent-100 pt-5 text-sm font-semibold text-brand-700">
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ PROMPT / COURTEOUS / PROFESSIONAL ============ */}
      <section className="bg-brand-gradient-soft py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Prompt · Courteous · Professional
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Superior customer service, every trip
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              No matter where you are headed, your trip will always be professional, comfortable
              and safe.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((p, i) => (
              <Reveal key={p.title} delay={i * 80} className="h-full">
                <div className="card-lift h-full card p-7 text-center shadow-sm">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient-soft">
                    <p.icon className="h-7 w-7 text-brand-700" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-ink">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Looking for something specific?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/80">
            If you do not see the service you need, ask us. We build custom transportation plans
            for every client, every group and every event.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" className="shadow-xl">
                Get a free quote
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
    </div>
  );
}
