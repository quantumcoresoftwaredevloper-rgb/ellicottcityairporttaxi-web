import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { forgotPassword } from '../services/authService.js';
import AuthLayout from '../components/auth/AuthLayout.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Enter your account email.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await forgotPassword(email);
      setSent(true);
      setDevLink(data.resetLink || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Locked"
      highlight="out?"
      subtitle="Enter the email on your account and we'll send a secure reset link. It expires in one hour."
      footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}
    >
        <h2 className="font-display text-2xl font-bold tracking-tight">Forgot password?</h2>
        <p className="mt-1.5 text-sm text-muted">We'll email you a link to choose a new one.</p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-2 rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                If an account exists for <strong>{email}</strong>, a password reset link is on its way.
                It expires in 1 hour.
              </span>
            </div>
            {devLink && (
              <div className="rounded-xl bg-accent-50 px-4 py-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Development reset link
                </p>
                <a href={devLink} className="break-all font-medium text-brand-700 underline">
                  {devLink}
                </a>
              </div>
            )}
            <p className="text-sm text-muted">
              Didn't get it?{' '}
              <button type="button" onClick={() => setSent(false)} className="font-semibold text-brand-700 hover:underline">
                Try again
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              icon={<Mail className="h-4 w-4" />}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            <Button type="submit" size="xl" loading={loading} className="w-full">
              {loading ? 'Sending…' : 'Send reset link'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        )}
    </AuthLayout>
  );
}