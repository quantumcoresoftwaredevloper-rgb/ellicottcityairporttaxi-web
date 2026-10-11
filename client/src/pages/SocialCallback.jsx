import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tokenStore } from '../services/api.js';
import { Spinner } from '../components/ui/Spinner.jsx';
import { Button } from '../components/ui/Button.jsx';
import AuthLayout from '../components/auth/AuthLayout.jsx';

// Landing page for the Passport OAuth callback. The server redirects here with
// fresh tokens in the query string (or ?error=... on failure). We store them
// and hard-redirect so the app reloads with AuthContext picking up the session.
const getQuery = (key) => {
  const match = window.location.search.match(new RegExp(`[?&]${key}=([^&]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

// Access JWTs embed { id, role, v } — decode the payload so the OAuth session is
// stored under the right per-role key (admin/driver/passenger).
const roleFromToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role || 'passenger';
  } catch {
    return 'passenger';
  }
};

export default function SocialCallback() {
  const [status, setStatus] = useState('loading');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const error = getQuery('error');
    const access = getQuery('accessToken');
    const refresh = getQuery('refreshToken');

    if (error) {
      setReason(error);
      setStatus('error');
      return;
    }
    if (!access || !refresh) {
      setStatus('error');
      return;
    }
    tokenStore.setActiveRole(roleFromToken(access));
    tokenStore.setTokens(access, refresh);
    window.location.replace('/');
  }, []);

  return (
    <AuthLayout
      title="One moment,"
      highlight="we're signing you in."
      subtitle="Securely connecting your account — this only takes a second."
      footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}
    >
      <div className="text-center">
        {status === 'loading' && (
          <>
            <h1 className="text-2xl font-bold">Finishing sign-in…</h1>
            <div className="mt-6 flex justify-center">
              <Spinner />
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-700">
              !
            </div>
            <h1 className="font-display text-2xl font-bold">Sign-in failed</h1>
            <p className="mt-2 text-sm text-muted">
              {reason.endsWith('_unavailable')
                ? 'Social sign-in is not available right now. Please use your email or phone number and password.'
                : "We couldn't log you in with that account. Please try again or use another method."}
            </p>
            <Link to="/login" className="mt-6 block">
              <Button size="xl" variant="outline" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}