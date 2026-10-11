import { useState } from 'react';
import { API_ROOT } from '../../services/api.js';

// "Continue with Google" — uses the Passport OAuth redirect flow, so it links
// to the server when credentials are set, or shows a friendly notice so the
// button is always visible. Facebook sign-in is intentionally not offered.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const googleReady = Boolean(GOOGLE_CLIENT_ID);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

const buttonClass =
  'flex h-13 w-full items-center justify-center gap-2.5 rounded-full border border-accent-200 bg-paper px-4 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-300 hover:bg-surface hover:shadow-md';

export default function SocialLoginButtons() {
  const [notice, setNotice] = useState('');

  const label = 'Continue with Google';

  return (
    <div className="mt-7">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-accent-200" />
        <span className="text-xs font-medium uppercase tracking-widest text-muted">
          or continue with
        </span>
        <span className="h-px flex-1 bg-accent-200" />
      </div>

      {notice && (
        <p className="mt-3 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-2.5 text-xs text-gold-800">
          {notice}
        </p>
      )}

      <div className="mt-5">
        {googleReady ? (
          <a href={`${API_ROOT}/api/auth/google`} className={buttonClass}>
            <GoogleIcon /> {label}
          </a>
        ) : (
          <button
            type="button"
            onClick={() =>
              setNotice(
                'Google sign-in is not connected yet. It will work once the app owner adds the OAuth credentials.',
              )
            }
            className={buttonClass}
          >
            <GoogleIcon /> {label}
          </button>
        )}
      </div>
    </div>
  );
}
