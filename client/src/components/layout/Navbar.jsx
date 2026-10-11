import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Phone, ArrowRight, ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useContent } from '../../context/ContentContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { isStaff, isDriver } from '../../lib/roles.js';
import NotificationsBell from './NotificationsBell.jsx';
import ServiceIcon from '../ui/ServiceIcon.jsx';

// Single source of truth: desktop and mobile both render from this list, so a
// page can never appear in one and be missing from the other.
const NAV_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services', hasMenu: true },
  { to: '/fleet', label: 'Fleet' },
  { to: '/contact', label: 'Contact' },
];

// One height for every interactive control in the bar, so the row reads as a
// single line instead of a collection of mismatched pills.
const CONTROL = 'h-10 shrink-0 rounded-full';

const navItem = ({ isActive }) =>
  `font-ui relative flex ${CONTROL} items-center px-4 text-sm font-semibold transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
  }`;

// Chevron rotates to signal the menu state without a second icon.
const chevron = (open) => (
  <ChevronDown
    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    aria-hidden="true"
  />
);

export default function Navbar() {
  const { services } = useCatalog();
  const { user, logout } = useAuth();
  const { content } = useContent();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef(null);
  const servicesButtonRef = useRef(null);

  const closeAll = () => {
    setOpen(false);
    setServicesOpen(false);
  };

  const handleLogout = () => {
    closeAll();
    logout();
    navigate('/login');
  };

  const go = (to) => {
    closeAll();
    navigate(to);
  };

  // Close the services menu on outside click.
  useEffect(() => {
    if (!servicesOpen) return undefined;
    const onDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setServicesOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [servicesOpen]);

  // Escape closes whichever menu is open and returns focus to the trigger.
  useEffect(() => {
    if (!open && !servicesOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      setServicesOpen(false);
      servicesButtonRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, servicesOpen]);

  // Stop the page scrolling behind the full-height mobile drawer.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Any route change (including a browser back/forward) collapses the menus.
  // Keyed on the pathname because `navigate` is referentially stable and would
  // never re-fire the effect.
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  const accountLinks = [
    ...(isDriver(user) ? [{ to: '/driver', label: 'Driver' }] : []),
    ...(isStaff(user) ? [{ to: '/admin', label: 'Admin' }] : []),
    ...(user ? [{ to: '/profile', label: 'Profile' }] : []),
  ];

  return (
    <header className="bg-brand-gradient sticky top-0 z-[1001] shadow-lg shadow-brand-950/20">
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Brand — the real logo mark on a white plate. The mark (car + plane +
            tower) is the graphic-only crop of the full lockup: at navbar height
            the wordmark would be ~28px wide and illegible, so the name stays as
            live text beside it. The plate is required because the artwork has a
            dark car and a white ground — on the navy band it would vanish. */}
        <Link to="/" onClick={closeAll} className="group flex shrink-0 items-center gap-2.5" aria-label="Ellicott City Airport Taxi — home">
          <span className="grid h-11 shrink-0 place-items-center rounded-xl bg-white px-2 shadow-sm transition-transform group-hover:scale-[1.03]">
            <img
              src="/images/logo-mark.png"
              alt=""
              aria-hidden="true"
              className="h-7 w-auto"
              width={451}
              height={224}
            />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-semibold tracking-tight text-white sm:text-base">
              Ellicott City
            </span>
            <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-300">
              Airport Taxi
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="ml-2 hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((link) =>
            link.hasMenu ? (
              <div key={link.to} ref={dropdownRef} className="relative">
                <button
                  ref={servicesButtonRef}
                  type="button"
                  aria-expanded={servicesOpen}
                  aria-haspopup="true"
                  onClick={() => setServicesOpen((v) => !v)}
                  className={`font-ui flex ${CONTROL} items-center gap-1.5 px-4 text-sm font-semibold transition-colors ${
                    servicesOpen
                      ? 'bg-white/15 text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                  {chevron(servicesOpen)}
                </button>

                {servicesOpen && (
                  <div className="absolute left-1/2 top-full w-[min(38rem,90vw)] -translate-x-1/2 pt-2">
                    <div className="card overflow-hidden p-3 shadow-2xl">
                      <div className="grid max-h-[26rem] grid-cols-2 gap-1 overflow-y-auto">
                        {services.map((s) => (
                          <button
                            key={s.slug}
                            onClick={() => go(`/services/${s.slug}`)}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-brand-50"
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-gradient-soft">
                              <ServiceIcon name={s.icon} className="h-5 w-5 text-brand-700" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink">{s.name}</span>
                              <span className="block truncate text-xs text-muted">{s.tagline}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-1 border-t border-accent-100 pt-2">
                        <Link
                          to="/services"
                          onClick={closeAll}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                        >
                          View all services
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={link.to} to={link.to} className={navItem}>
                {link.label}
              </NavLink>
            )
          )}
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`tel:${content.contactPhoneHref}`}
            className={`phone-number hidden ${CONTROL} items-center gap-2 px-4 text-sm text-gold-300 transition-colors hover:bg-white/10 xl:flex`}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {content.contactPhone}
          </a>

          {user ? (
            <div className="hidden items-center gap-1 lg:flex">
              <NotificationsBell />
              {accountLinks.map((l) => (
                <NavLink key={l.to} to={l.to} className={navItem}>
                  {l.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className={`flex ${CONTROL} items-center gap-2 px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white`}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                to="/login"
                className={`flex ${CONTROL} items-center px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white`}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className={`flex ${CONTROL} items-center bg-surface px-5 text-sm font-semibold text-brand-700 shadow-sm transition-colors hover:bg-gold-300`}
              >
                Get started
              </Link>
            </div>
          )}

          {user && (
            <div className="lg:hidden">
              <NotificationsBell />
            </div>
          )}

          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className={`grid ${CONTROL} w-10 place-items-center text-white transition-colors hover:bg-white/10 lg:hidden`}
          >
            <span className="relative block h-4 w-5">
              <span className={`absolute left-0 block h-0.5 w-5 rounded-full bg-surface transition-all duration-200 ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 top-1.5 block h-0.5 w-5 rounded-full bg-surface transition-opacity duration-200 ${open ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`absolute left-0 block h-0.5 w-5 rounded-full bg-surface transition-all duration-200 ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-white/10 bg-brand-gradient lg:hidden">
          <div className="mx-auto max-w-7xl px-4 pb-6 pt-3 sm:px-6">
            <p className="px-1 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Explore
            </p>
            <ul className="space-y-0.5">
              <li>
                <NavLink
                  to="/"
                  end
                  onClick={closeAll}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'
                    }`
                  }
                >
                  Home
                </NavLink>
              </li>
              {NAV_LINKS.map((link) =>
                link.hasMenu ? (
                  <li key={link.to}>
                    <button
                      onClick={() => setServicesOpen((v) => !v)}
                      aria-expanded={servicesOpen}
                      className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                    >
                      {link.label}
                      {chevron(servicesOpen)}
                    </button>
                    {servicesOpen && (
                      <ul className="mt-0.5 space-y-0.5 pb-1 pl-2">
                        {services.map((s) => (
                          <li key={s.slug}>
                            <Link
                              to={`/services/${s.slug}`}
                              onClick={closeAll}
                              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                            >
                              <ServiceIcon name={s.icon} className="h-4 w-4 shrink-0 text-gold-300" />
                              <span className="truncate">{s.name}</span>
                            </Link>
                          </li>
                        ))}
                        <li>
                          <Link
                            to="/services"
                            onClick={closeAll}
                            className="mt-1 flex items-center justify-between rounded-xl border border-white/20 px-3 py-2.5 text-sm font-semibold text-gold-300 transition-colors hover:bg-white/10"
                          >
                            View all services
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>
                ) : (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      onClick={closeAll}
                      className={({ isActive }) =>
                        `flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                          isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                )
              )}
            </ul>

            <a
              href={`tel:${content.contactPhoneHref}`}
              className="phone-number mt-3 flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-3 text-sm text-gold-300"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {content.contactPhone}
            </a>

            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {user ? 'Your account' : 'Ready to ride?'}
              </p>
              {user ? (
                <ul className="space-y-0.5">
                  {accountLinks.map((l) => (
                    <li key={l.to}>
                      <NavLink
                        to={l.to}
                        onClick={closeAll}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                            isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'
                          }`
                        }
                      >
                        <UserRound className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                        {l.label}
                      </NavLink>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-2.5 rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-white/20"
                    >
                      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Sign out ({user.name})
                    </button>
                  </li>
                </ul>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={closeAll}
                    className="flex items-center justify-center rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeAll}
                    className="flex items-center justify-center rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-brand-700 shadow-sm"
                  >
                    Get started
                  </Link>
                  <Link
                    to="/reservations"
                    onClick={closeAll}
                    className="flex items-center justify-center rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-gold-300 transition-colors hover:bg-white/10"
                  >
                    Client Portal
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
