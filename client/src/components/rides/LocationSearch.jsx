import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from '../../services/rideService.js';
import { Spinner } from '../ui/Spinner.jsx';

/* global setTimeout, clearTimeout */

export default function LocationSearch({ label, icon, value, onSelect, placeholder }) {
  // `icon` is a component (MapPin, Flag, ...). React only treats a JSX tag as
  // a component when it is capitalised — rendering <icon /> emitted a literal
  // <icon> DOM element and logged an "unrecognized tag" warning.
  const Icon = icon;
  const [query, setQuery] = useState(value?.address || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  // Keep input in sync when location is set from the map
  useEffect(() => {
    setQuery(value?.address || '');
  }, [value?.address]);

  // Debounced autocomplete
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    // Picking a suggestion fills the input with the full address, which would
    // otherwise re-trigger the search and pop the list back open on top of the
    // next field. Only search when the text differs from the chosen address.
    if (value?.address && q === value.address.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchPlaces(query.trim());
        setResults(data.places || []);
        setOpen(true);
        setActive(-1);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, value?.address]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pick = (r) => {
    setOpen(false);
    setResults([]);
    onSelect({ address: r.address, lat: r.lat, lng: r.lng });
  };

  const onKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>}
      <div className="relative" ref={boxRef}>
        {Icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-accent-400">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          className="input-pill w-full border border-accent-300 bg-surface py-3 pl-10 pr-9 text-sm outline-none transition-colors placeholder:text-accent-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-600">
            <Spinner size="sm" />
          </span>
        )}

        {open && results.length > 0 && (
          <ul className="absolute left-0 right-0 z-[1100] mt-2 max-h-72 overflow-y-auto panel py-1 shadow-xl">
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(r);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${
                    i === active ? 'bg-brand-50 text-brand-900' : 'text-ink'
                  }`}
                >
                  {Icon && (
                    <span className="mt-0.5 shrink-0 text-accent-400">
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="leading-snug">{r.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </label>
  );
}