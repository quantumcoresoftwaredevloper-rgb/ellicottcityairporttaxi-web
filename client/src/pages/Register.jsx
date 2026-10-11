import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, User, Car } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import SocialLoginButtons from '../components/auth/SocialLoginButtons.jsx';
import { useContent } from '../context/ContentContext.jsx';

const ROLES = [
  {
    id: 'passenger',
    label: 'Passenger',
    hint: 'Book and track rides',
    icon: User,
  },
  {
    id: 'driver',
    label: 'Driver',
    hint: 'Accept and run trips',
    icon: Car,
  },
];

// Cheap client-side strength signal (the server only enforces >= 6 chars).
const strengthOf = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) || /[^\w\s]/.test(pw)) score += 1;
  return Math.min(score, 4);
};

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_TONE = [
  '',
  'bg-signal-500',
  'bg-gold-500',
  'bg-success-500',
  'bg-success-600',
];

export default function Register() {
  const { content } = useContent();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'passenger',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // { email, verificationLink }

  const strength = strengthOf(form.password);

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (!form.email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await register(form);
      setDone({ email: form.email, verificationLink: data.verificationLink || '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const goHome = () =>
    navigate(form.role === 'driver' ? '/driver' : '/', { replace: true });

  if (done) {
    return (
      <AuthLayout
        title="You're"
        highlight="almost set."
        subtitle="We sent a verification link to confirm your email address."
      >
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-50 text-success-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="font-display mt-5 text-2xl font-bold tracking-tight">
            Account created
          </h2>
          <p className="mt-2 text-sm text-muted">
            We sent a verification link to <strong className="text-ink">{done.email}</strong>.
            Verify your email to activate your account.
          </p>

          {done.verificationLink && (
            <div className="mt-5 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold-700">
                Development verification link
              </p>
              <a
                href={done.verificationLink}
                className="break-all text-sm font-medium text-brand-700 underline"
              >
                {done.verificationLink}
              </a>
            </div>
          )}

          <Button onClick={goHome} size="xl" className="mt-7 w-full">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Every trip,"
      highlight="one account."
      subtitle="Airport transfers, corporate billing, events and live tracking — create an account in under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <h2 className="font-display text-2xl font-bold tracking-tight">Create account</h2>
      <p className="mt-1.5 text-sm text-muted">Takes under a minute — no card required.</p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <Input
          label="Full name"
          required
          autoComplete="name"
          placeholder="John Passenger"
          value={form.name}
          onChange={set('name')}
        />
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder={content.contactPhone}
          hint="Optional — lets you sign in with your phone number."
          value={form.phone}
          onChange={set('phone')}
        />

        <div>
          <PasswordField
            label="Password"
            required
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={set('password')}
          />
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-full flex-1 rounded-full transition-colors ${
                      step <= strength ? STRENGTH_TONE[strength] : 'bg-accent-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-muted">
                {STRENGTH_LABEL[strength]}
              </span>
            </div>
          )}
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-ink">I am a</span>
          <div className="grid grid-cols-2 gap-2.5">
            {ROLES.map(({ id, label, hint, icon: Icon }) => {
              const selected = form.role === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setForm((f) => ({ ...f, role: id }))}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                    selected
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                      : 'border-accent-200 hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-sm'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      selected
                        ? 'bg-brand-gradient text-white'
                        : 'bg-accent-100 text-accent-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold ${
                        selected ? 'text-brand-700' : 'text-ink'
                      }`}
                    >
                      {label}
                    </span>
                    <span className="block truncate text-xs text-muted">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
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

        <Button type="submit" size="xl" loading={loading} className="w-full">
          {loading ? 'Creating account…' : 'Create account'}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-5 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-center text-xs text-gold-700">
        A verification email is sent after sign-up.
      </p>

      <SocialLoginButtons />
    </AuthLayout>
  );
}
