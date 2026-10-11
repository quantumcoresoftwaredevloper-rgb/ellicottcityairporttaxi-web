import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useContent } from '../../context/ContentContext.jsx';

export default function Footer() {
  const { services } = useCatalog();
  const { content } = useContent();
  return (
    <footer className="mt-auto bg-brand-gradient text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          {/* The real logo is a full lockup whose wordmark is dark navy, so it
              cannot sit directly on the navy band — it needs a light plate. */}
          <Link
            to="/"
            aria-label="Ellicott City Airport Taxi — home"
            className="inline-block rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5"
          >
            <img
              src="/images/logo-full.png"
              alt="Ellicott City Airport Taxi"
              className="w-40"
              loading="lazy"
              width={527}
              height={344}
            />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            {content.tagline} {content.hours}
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href={`tel:${content.contactPhoneHref}`}
              aria-label="Call us"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={`mailto:${content.contactEmail}`}
              aria-label="Email us"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li><Link to="/" className="transition-colors hover:text-white">Home</Link></li>
            <li><Link to="/about" className="transition-colors hover:text-white">About</Link></li>
            <li><Link to="/services" className="transition-colors hover:text-white">Services</Link></li>
            <li><Link to="/fleet" className="transition-colors hover:text-white">Fleet</Link></li>
            <li><Link to="/contact" className="transition-colors hover:text-white">Contact</Link></li>
            <li><Link to="/careers" className="transition-colors hover:text-white">Careers</Link></li>
            {/* Play Store requires a public privacy policy URL */}
            <li><Link to="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/reservations" className="transition-colors hover:text-white">Client Portal</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Services</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            {services.slice(0, 7).map((s) => (
              <li key={s.slug}>
                <Link to={`/services/${s.slug}`} className="transition-colors hover:text-white">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Contact</h4>
          <ul className="mt-3 space-y-2.5 text-sm text-white/75">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{content.contactAddress}</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" />
              <a href={`tel:${content.contactPhoneHref}`} className="phone-number transition-colors hover:text-white">{content.contactPhone}</a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <a href={`mailto:${content.contactEmail}`} className="break-all transition-colors hover:text-white">{content.contactEmail}</a>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>24/7 dispatch &amp; support</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Ellicott City Airport Taxi. All rights reserved. · Ellicott City, Maryland
      </div>
    </footer>
  );
}