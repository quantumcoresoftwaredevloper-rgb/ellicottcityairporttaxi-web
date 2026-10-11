import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { verifyEmail } from '../services/authService.js';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Missing verification token. Use the link from your email.');
      return;
    }
    let cancelled = false;
    verifyEmail(token)
      .then(() => !cancelled && setState('success'))
      .catch((err) => {
        if (!cancelled) {
          setState('error');
          setMessage(err.response?.data?.message || 'Verification failed.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthLayout
      title={state === 'success' ? 'You are' : 'Almost'}
      highlight={state === 'success' ? 'verified.' : 'there.'}
      subtitle="One quick email check keeps your account and your rides secure."
      footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}
    >
      <div className="text-center">
        {state === 'verifying' && (
          <>
            <h1 className="text-2xl font-bold">Verifying your email…</h1>
            <p className="mt-1 text-sm text-muted">Just a moment.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">Email verified</h1>
            <p className="mt-2 text-sm text-muted">
              Your account is active. You can now book rides with Ellicott City Airport Taxi.
            </p>
            <Link to="/login" className="mt-6 block">
              <Button size="xl" className="w-full">
                Sign in
              </Button>
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-700">
              !
            </div>
            <h1 className="text-2xl font-bold">Verification failed</h1>
            <p className="mt-2 text-sm text-muted">{message}</p>
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