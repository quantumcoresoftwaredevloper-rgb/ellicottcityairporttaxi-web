import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, CreditCard, User, Lock, Trash2, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { useContent } from '../../context/ContentContext.jsx';

const UPDATED = 'September 30, 2026';
const SUPPORT_EMAIL = 'chriskbonsu@gmail.com';

const SECTIONS = [
  {
    id: 'collect',
    icon: User,
    title: 'Information we collect',
    points: [
      {
        h: 'Account information you give us',
        p: 'When you register you provide your name, email address, phone number and a password. Drivers additionally provide vehicle details — make, model, class, licence plate and licence number — so passengers can identify the correct car.',
      },
      {
        h: 'Ride and location data',
        p: 'When you request a ride we record your pickup point, your destination, the route taken and the fare. During an active ride, your device and the assigned driver’s device continuously share precise location with each other so you can see each other in real time. This location sharing stops when the ride ends.',
      },
      {
        h: 'Photo ID and profile picture',
        p: 'If you upload a profile picture or a driver document (licence, insurance, registration) it is stored on our servers so our team can verify it.',
      },
      {
        h: 'Payment information',
        p: 'Card payments are processed by Stripe. We never see or store your full card number — we keep only the last four digits and the transaction reference so we can issue refunds or resolve disputes. Cash payments are recorded with no card details at all.',
      },
      {
        h: 'Technical information',
        p: 'Our servers keep security audit logs containing your account, the action performed, your IP address and your browser and device type. This is used to investigate misuse and to protect accounts.',
      },
    ],
  },
  {
    id: 'use',
    icon: MapPin,
    title: 'How we use your information',
    points: [
      { h: 'To provide the service', p: 'Matching you with a driver, calculating your fare and distance, navigating to your pickup point, and sharing live location during the ride.' },
      { h: 'To verify and keep the platform safe', p: 'Checking that drivers are properly licensed and insured, and investigating complaints, fraud or misuse of the service.' },
      { h: 'To communicate with you', p: 'Ride confirmations, driver arrival alerts, ride receipts, and — if you opt in — service updates and offers. Every message can be turned off in your profile settings.' },
      { h: 'To meet legal obligations', p: 'Tax, licensing and regulatory records that transport operators are required to keep.' },
    ],
    note: 'We do not sell your personal information, and we do not share it with advertisers for their own purposes.',
  },
  {
    id: 'sharing',
    icon: CreditCard,
    title: 'Who we share it with',
    points: [
      { h: 'Your assigned driver', p: 'Your pickup and destination, your name, your contact details and your live location — for the duration of that single ride only. Drivers cannot see your saved trips, your payment details, or any information about other passengers.' },
      { h: 'Payment processor', p: 'Stripe handles card payments on our behalf under its own privacy policy.' },
      { h: 'Infrastructure providers', p: 'Companies that host our servers and send email or SMS on our behalf, strictly on our instructions.' },
      { h: 'Law enforcement and regulators', p: 'Where we are legally required to disclose information.' },
    ],
  },
  {
    id: 'retention',
    icon: Lock,
    title: 'How long we keep it',
    points: [
      { h: 'Account data', p: 'Kept while your account is active, and for a reasonable period afterwards so your ride history and receipts remain available.' },
      { h: 'Ride records', p: 'Retained for the period required by transportation and tax regulations in Maryland.' },
      { h: 'Live location', p: 'The precise live position of a driver is discarded automatically within 24 hours of its last update. Historical locations are not kept.' },
      { h: 'Security logs', p: 'Retained for a limited period, then deleted.' },
    ],
  },
  {
    id: 'security',
    icon: ShieldCheck,
    title: 'How we protect it',
    points: [
      { h: 'Encrypted in transit', p: 'All traffic between your device, our app and our servers is encrypted with HTTPS/TLS. The location connection is encrypted the same way.' },
      { h: 'Passwords are hashed', p: 'We never store your password. We store a one-way hash, so nobody — including us — can read it.' },
      { h: 'Role-based access', p: 'Drivers can only see the ride they are assigned. Staff access to personal data is limited to the roles that need it and is recorded in an audit log.' },
      { h: 'Secure tokens', p: 'Sessions use short-lived signed tokens and rotating refresh tokens that can be revoked immediately.' },
    ],
    note: 'No system is perfectly secure. If a breach affects your personal data, we will notify you and the relevant authorities as required by law.',
  },
  {
    id: 'rights',
    icon: Trash2,
    title: 'Your choices and rights',
    points: [
      { h: 'See and correct your data', p: 'You can view and edit your name, phone number and profile picture from your profile page at any time.' },
      { h: 'Turn off notifications', p: 'Push and email notifications are optional and can be disabled in settings.' },
      { h: 'Delete your account', p: 'You can request permanent deletion of your account and associated personal data by contacting us. Deletion removes your profile and personal information; ride and payment records that we are legally required to retain are kept in a minimised form.' },
      { h: 'Withdraw location consent', p: 'You can deny or withdraw location permission at any time in your device settings. Live tracking will not work without it, but you can still book a ride.' },
    ],
  },
  {
    id: 'children',
    icon: FileText,
    title: 'Children',
    points: [
      { h: 'Not for under-18s', p: 'Our service is not directed at children under 18 and we do not knowingly collect their personal information. A parent or guardian arranging a ride on a child’s behalf should use the child’s details only as needed for the trip.' },
    ],
  },
  {
    id: 'contact',
    icon: FileText,
    title: 'Contact us',
    points: [
      { h: 'Questions or complaints', p: 'If you have a privacy question, want to access your data, or wish to file a complaint, contact us using the details below and we will respond as soon as we reasonably can.' },
    ],
  },
];

export default function Privacy() {
  const { content } = useContent();

  useEffect(() => {
    document.title = 'Privacy Policy | Ellicott City Airport Taxi';
    return () => { document.title = 'Ellicott City Airport Taxi'; };
  }, []);

  return (
    <>
      <header className="bg-brand-gradient relative overflow-hidden text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold-300">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Your privacy
          </p>
          <h1 className="font-display mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Privacy <span className="text-gold-300">Policy</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/85">
            This policy explains what information Ellicott City Airport Taxi collects, why we collect
            it, and the choices you have. It applies to our website, our Android and iPhone apps, and
            every ride booked through them.
          </p>
          <p className="mt-4 text-sm text-white/65">Last updated: {UPDATED}</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <div className="space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-display flex items-center gap-3 text-2xl font-bold text-ink">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient-soft">
                  <section.icon className="h-5 w-5 text-brand-700" aria-hidden />
                </span>
                {section.title}
              </h2>
              <div className="mt-5 space-y-4">
                {section.points.map((point) => (
                  <div key={point.h} className="card p-5">
                    <h3 className="text-sm font-bold text-ink">{point.h}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{point.p}</p>
                  </div>
                ))}
                {section.note && (
                  <p className="rounded-2xl border-l-4 border-brand-600 bg-brand-50 px-5 py-4 text-sm font-medium text-brand-900">
                    {section.note}
                  </p>
                )}
              </div>
            </section>
          ))}

          {/* Business contact — the only party collecting this data. */}
          <section className="card p-6">
            <h2 className="font-display text-xl font-bold text-ink">Ellicott City Airport Taxi</h2>
            <address className="mt-3 space-y-1 text-sm not-italic text-muted">
              <p>9019 Early April Way, Ellicott City, MD</p>
              <p>
                <a className="phone-number text-brand-700 hover:underline" href={`tel:${content.contactPhoneHref}`}>
                  {content.contactPhone}
                </a>
              </p>
              <p>
                <a className="font-semibold text-brand-700 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </address>
            <p className="mt-4 text-sm text-muted">
              We serve Maryland, Washington DC and Northern Virginia. This service is operated from
              Maryland, which is the state whose law governs this policy.
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-accent-200 pt-8">
          <Link to="/reservations">
            <Button size="lg" variant="primary">Book a ride</Button>
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-brand-600 px-6 py-3 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            Contact us
          </Link>
        </div>
      </main>
    </>
  );
}
