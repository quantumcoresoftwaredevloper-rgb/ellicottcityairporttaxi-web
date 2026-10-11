import { Link } from 'react-router-dom';
import { UserRound, Clock, Sparkles, Receipt, ShieldCheck, Map, Smartphone, Headphones, Car, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { useContent } from '../../context/ContentContext.jsx';

const WHY_US = [
  {
    icon: UserRound,
    title: 'Professional drivers',
    desc: 'Our drivers are not just skilled behind the wheel — they are trained professionals committed to a safe and comfortable ride.',
  },
  {
    icon: Clock,
    title: 'Guaranteed scheduled rides',
    desc: 'Count on us to be punctual. We prioritize on-time arrivals and departures, putting your schedule first.',
  },
  {
    icon: Sparkles,
    title: 'Personalized amenities',
    desc: 'Make your journey unique. Enjoy a selection of amenities tailored to your preferences on every ride.',
  },
  {
    icon: Receipt,
    title: 'Transparent pricing',
    desc: 'Say goodbye to hidden fees. With our upfront pricing, you know exactly what to expect before you book.',
  },
  {
    icon: ShieldCheck,
    title: 'Commercially insured',
    desc: 'Your safety is our top priority. Rest easy knowing our services are backed by comprehensive coverage.',
  },
  {
    icon: Map,
    title: 'Local knowledge',
    desc: 'Our drivers know the area well, providing timely arrivals and valuable insight into the best routes.',
  },
  {
    icon: Smartphone,
    title: 'Effortless booking',
    desc: 'Booking with us is a breeze. Use our app or web form to schedule your ride quickly and easily.',
  },
  {
    icon: Headphones,
    title: '24/7 support',
    desc: 'Our dispatch team is always available to help — day or night, weekdays or weekends.',
  },
];

export default function About() {
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
            About us
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Easy. Efficient. <span className="text-gold-300">Transparent.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Offering immaculate customer service and responsiveness, the Ellicott City Airport Taxi team is
            available and ready to assist you in all your event, business and personal transport
            needs. Priding ourselves on reliability and availability, we are always there to get
            you from Point A to Point B.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to={bookUrl}>
              <Button size="lg" className="shadow-xl">
                Secure your ride
              </Button>
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      {/* ============ STORY ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Our story
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              A local company that puts people first
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              Ellicott City Airport Taxi was founded in Ellicott City, Maryland with a simple
              belief: getting around
              should be effortless, comfortable and honest. What started as a commitment to
              prompt, professional local rides has grown into a full-service transportation
              provider serving Maryland, DC, and Virginia.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              We have combined experience, expertise and a genuine personal touch to create a
              transportation experience that is worry-free for every client. Our drivers and
              coordinators treat every ride — and every rider — like family, because to us,
              that is exactly what you are.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              We are committed to creating customized and competitive rates for your personal and
              corporate transportation needs.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl bg-brand-gradient text-white shadow-xl">
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-4">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
                  <Car className="h-8 w-8 text-white" />
                </span>
                <div>
                  <div className="text-xl font-bold">Ellicott City Airport Taxi</div>
                  <div className="text-sm text-white/70">Ellicott City, Maryland · Est. 2006</div>
                </div>
              </div>
              <p className="mt-6 text-[15px] leading-relaxed text-white/85">
                “We do not just move you from A to B — we take care of you the whole way. Reliable,
                transparent and genuinely personal. That is the Ellicott City Airport Taxi way.”
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={`tel:${content.contactPhoneHref}`}
                  className="phone-number inline-flex items-center gap-2 rounded-full bg-surface px-6 py-3 text-base text-brand-900 shadow-sm transition-colors hover:bg-brand-50 "
                >
                  <Phone className="h-4 w-4" />
                  {content.contactPhone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHY CHOOSE US ============ */}
      <section className="bg-brand-gradient-soft py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Why choose us
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              More than just a ride
            </h2>
            <p className="mt-4 text-muted">
              You have many options when it comes to transportation. With Ellicott City Airport Taxi, we offer an
              unparalleled journey that combines reliability, comfort, personalized service and
              safety.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 80} className="h-full">
                <div className="card-lift h-full card p-7">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient-soft">
                    <f.icon className="h-7 w-7 text-brand-700" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
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
            Choose Ellicott City Airport Taxi for your next journey
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/80">
            We are dedicated to making every ride exceptional — ensuring you arrive with comfort,
            style and peace of mind.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to={bookUrl}>
              <Button size="lg" className="shadow-xl">
                Book now
              </Button>
            </Link>
            <Link
              to="/careers"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Drive with us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
