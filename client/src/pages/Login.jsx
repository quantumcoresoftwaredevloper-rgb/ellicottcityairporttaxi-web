import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import SocialLoginButtons from '../components/auth/SocialLoginButtons.jsx';
import { useContent } from '../context/ContentContext.jsx';

export default function Login() {
  const { content } = useContent();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({
    identifier: '',
    password: '',
    rememberMe: true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    const value = k === 'rememberMe' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.identifier.trim() || !form.password) {
      setError('Enter your email or phone number and password.');
      return;
    }
    setLoading(true);
    try {
      const loggedIn = await login(form);
      navigate(
        loggedIn.role === 'driver'
          ? '/driver'
          : loggedIn.role === 'admin'
            ? '/admin'
            : from,
        { replace: true },
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Every ride,"
      highlight="handled."
      subtitle="Professional chauffeurs, a late-model fleet and door-to-door service across Maryland, DC and Virginia — on your schedule, every single trip."
      footer={
        <>
          New to Ellicott City Airport Taxi?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight sm:text-3xl">
        Welcome back
      </h2>
      <p className="mt-2 text-sm text-muted">Sign in to book and manage your rides.</p>

      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <Input
          label="Email or phone number"
          type="text"
          required
          autoComplete="username"
          placeholder={`you@example.com or ${content.contactPhone}`}
          value={form.identifier}
          onChange={set('identifier')}
        />

        <PasswordField
          label="Password"
          required
          value={form.password}
          onChange={set('password')}
        />

        <div className="flex items-center justify-between gap-4 pt-1">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={set('rememberMe')}
              className="h-4 w-4 rounded border-accent-300 accent-brand-600"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="shrink-0 text-sm font-medium text-brand-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" size="xl" loading={loading} className="mt-2 w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <SocialLoginButtons />
    </AuthLayout>
  );
}
