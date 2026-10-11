import { Link } from 'react-router-dom';
import { Check, Lock, Phone, Star } from 'lucide-react';
import { useContent } from '../../context/ContentContext.jsx';

// Full-screen auth shell shared by every auth page (login, register,
// forgot/reset password, verify email).
//
// Two halves, split by colour: a brand-red company panel on the left and a
// clean white form on the right. Rendered without the site Navbar/Footer
// (see AUTH_PATHS in App.jsx) so the split owns the whole viewport.
export default function AuthLayout({ title, highlight, subtitle, children, footer }) {
  const { content } = useContent();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand half — deep red */}
      <aside className="relative flex flex-col justify-between overflow-hidden bg-brand-gradient px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-gold-500/15 blur-3xl" />

        <div className="relative">
          <Link
            to="/"
            aria-label="Ellicott City Airport Taxi — home"
            className="inline-block rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5"
          >
            <img
              src="/images/logo-full.png"
              alt="Ellicott City Airport Taxi"
              className="w-36"
              width={527}
              height={344}
            />
          </Link>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">
            Ellicott City · Maryland
          </p>
        </div>

        <div className="relative my-8 max-w-lg sm:my-10">
          <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[42px]">
            {title} {highlight && <span className="text-gold-300">{highlight}</span>}
          </h1>
          {subtitle && (
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
              {subtitle}
            </p>
          )}
        </div>

        <div className="relative space-y-5">
          <p className="inline-flex items-center gap-2 border-b border-white/10 pb-5 text-sm font-medium text-white/90">
            <Star className="h-4 w-4 fill-gold-400 text-gold-400" />
            Local Howard County company
          </p>

          <ul className="space-y-2.5">
            {content.authProof.map((line) => (
              <li key={line} className="flex items-center gap-3 text-sm text-white/75">
                <Check className="h-4 w-4 shrink-0 text-gold-300" />
                {line}
              </li>
            ))}
          </ul>

          <a
            href={`tel:${content.contactPhoneHref}`}
            className="flex items-center gap-3 pt-2 transition-opacity hover:opacity-90"
          >
            <Phone className="h-5 w-5 text-gold-300" />
            <span className="phone-number text-lg text-white/90">{content.contactPhone}</span>
          </a>
        </div>
      </aside>

      {/* Form half — white */}
      <section className="flex flex-col bg-surface px-6 py-10 sm:px-10 lg:px-14">
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-base font-bold text-white">
                E
              </span>
              <span className="font-display text-base font-bold tracking-tight">
                Ellicott City <span className="text-gold-600">Airport Taxi</span>
              </span>
            </Link>

            {children}

            {footer && <div className="mt-7 text-center text-sm text-muted">{footer}</div>}
          </div>
        </div>

        <div className="mt-10 space-y-2.5 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Lock className="h-3.5 w-3.5 text-success-600" />
            Secure sign-in · your details stay private
          </p>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Ellicott City Airport Taxi · Maryland · Virginia ·
            Washington DC · Baltimore
          </p>
        </div>
      </section>
    </div>
  );
}
