import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import { resetPassword } from '../services/authService.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is invalid. Request a new one.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new"
      highlight="password."
      subtitle="Pick something at least 6 characters long. Resetting signs out every other device."
      footer={
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <h2 className="font-display text-2xl font-bold tracking-tight">New password</h2>
      <p className="mt-1.5 text-sm text-muted">Make sure it's at least 6 characters.</p>

      {done ? (
        <div className="mt-7 space-y-5">
          <p className="flex items-start gap-2 rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Your password has been reset. All other sessions were signed out.</span>
          </p>
          <Button onClick={() => window.location.assign('/login')} size="xl" className="w-full">
            Sign in with your new password
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <PasswordField
            label="New password"
            required
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={set('password')}
          />
          <PasswordField
            label="Confirm new password"
            required
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
          />
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          <Button type="submit" size="xl" loading={loading} className="w-full">
            {loading ? 'Resetting…' : 'Reset password'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
