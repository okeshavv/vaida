import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Stethoscope,
  Activity,
  ArrowRight,
  Loader2,
  Shield,
  ChevronLeft,
  Zap,
  Mic,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { login, register } from '../api/client';
import type { UserRole, Patient } from '../types';

// ─── Demo accounts ───────────────────────────────────────────
const DEMO = [
  {
    role: 'patient' as UserRole,
    name: 'Priya Sharma',
    phone: '9000000001',
    label: 'Patient',
    Icon: Heart,
    chipBg: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  },
  {
    role: 'asha' as UserRole,
    name: 'Sunita Devi',
    phone: '9000000002',
    label: 'ASHA',
    Icon: Activity,
    chipBg: 'bg-orange-100 text-orange-700 ring-orange-200',
  },
  {
    role: 'doctor' as UserRole,
    name: 'Dr. Arjun Mehta',
    phone: '9000000003',
    label: 'Doctor',
    Icon: Stethoscope,
    chipBg: 'bg-violet-100 text-violet-700 ring-violet-200',
  },
] as const;

type Demo = (typeof DEMO)[number];

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'patient', label: 'Patient' },
  { value: 'asha', label: 'ASHA' },
  { value: 'doctor', label: 'Doctor' },
];

// ─── Component ───────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const { setUser, setRole } = useApp();

  const [step, setStep] = useState<'welcome' | 'otp'>('welcome');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/auth/demo-seed', { method: 'POST' }).catch(() => {});
  }, []);

  const persist = (userId: string, role: UserRole, displayName: string) => {
    const userObj: Patient = {
      id: userId,
      phone_hash: 'hashed',
      name_encrypted: displayName,
      lang_preference: 'en',
      role,
      district: 'Jaipur',
      consent_tx_hash: null,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    };
    localStorage.setItem('vaida_user', JSON.stringify(userObj));
    setUser(userObj);
    setRole(role);
    navigate('/');
  };

  const handleDemoLogin = async (demo: Demo) => {
    setDemoLoading(demo.role);
    setError('');
    try {
      try {
        await register({ name: demo.name, phone: demo.phone, role: demo.role, lang: 'en', consent: true });
      } catch {
        /* already exists */
      }
      const res = await login(demo.phone, '123456');
      persist(res.user_id, res.role || demo.role, demo.name);
    } catch {
      setError('Demo login failed — is the backend running on :8000?');
    } finally {
      setDemoLoading(null);
    }
  };

  const handleManualContinue = () => {
    if (phone.length < 10) return;
    setStep('otp');
  };

  const handleOtpLogin = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    setError('');
    try {
      if (name.trim()) {
        try {
          await register({ name, phone, role: selectedRole, lang: 'en', consent: true });
        } catch {
          /* ignore */
        }
      }
      const res = await login(phone, otp);
      persist(res.user_id, res.role || selectedRole, name || 'User');
    } catch {
      setError('Invalid OTP or user not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-slate-50">
      {/* Mobile: compact brand strip */}
      <header className="lg:hidden shrink-0 border-b border-teal-800/20 bg-gradient-to-r from-teal-900 to-teal-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Heart size={18} className="text-white" fill="currentColor" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-white">VAIDA</p>
              <p className="truncate text-[11px] text-teal-100/90">Voice AI Diagnostic Assistant</p>
            </div>
          </div>
        </div>
      </header>

      {/* Left: brand / creative (desktop only) */}
      <aside className="relative hidden lg:flex min-h-0 flex-col justify-center overflow-hidden bg-gradient-to-br from-teal-900 to-teal-700 px-12 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(45,212,191,0.12),transparent_55%)]" />
        <div className="relative z-10 mx-auto w-full max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200/90">VAIDA</p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.15] tracking-tight text-white">
            Healthcare for every village, just a voice away.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-teal-100/90">
            VAIDA brings AI-powered symptom triage and multilingual support to rural communities.
          </p>

          <div className="mt-12 flex flex-wrap items-end justify-center gap-5">
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg shadow-black/10 backdrop-blur-md ring-1 ring-white/10">
              <Mic className="h-14 w-14 text-white/95" strokeWidth={1.25} />
            </div>
            <div className="flex h-36 w-36 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg shadow-black/10 backdrop-blur-md ring-1 ring-white/10">
              <Activity className="h-20 w-20 text-white/95" strokeWidth={1.25} />
            </div>
            <div className="hidden xl:flex h-24 w-24 items-center justify-center rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm ring-1 ring-white/10">
              <Heart className="h-10 w-10 text-teal-100" fill="currentColor" />
            </div>
          </div>
        </div>
      </aside>

      {/* Right: utility / login */}
      <main className="flex min-h-0 flex-col justify-center px-5 py-8 sm:px-8 lg:overflow-hidden lg:py-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 hidden lg:block">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 shadow-md shadow-teal-600/25">
              <Heart size={22} className="text-white" fill="currentColor" />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Sign in to VAIDA</h2>
            <p className="mt-1 text-sm text-slate-500">Secure access to AI-assisted triage and care.</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick demo access</p>
                  <p className="mt-1 text-sm text-slate-600">One-tap login for each role · OTP <span className="font-mono font-medium">123456</span></p>
                </div>

                <div className="flex flex-wrap items-stretch justify-center gap-3 sm:justify-between sm:gap-2">
                  {DEMO.map((demo) => {
                    const { Icon } = demo;
                    const isLoading = demoLoading === demo.role;
                    return (
                      <button
                        key={demo.role}
                        type="button"
                        onClick={() => handleDemoLogin(demo)}
                        disabled={demoLoading !== null}
                        aria-label={`Demo login as ${demo.label}`}
                        aria-busy={isLoading}
                        className={`group flex min-w-[5.5rem] flex-1 flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm transition-all hover:border-teal-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 sm:min-w-0 sm:flex-1`}
                      >
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white ${demo.chipBg}`}
                        >
                          {isLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Icon size={20} strokeWidth={2} />
                          )}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{demo.label}</span>
                        <span className="line-clamp-1 w-full text-[10px] text-slate-500">{demo.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="shrink-0 text-xs font-medium text-slate-400">or sign in manually</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name-input" className="mb-1.5 block text-xs font-medium text-slate-700">
                      Full name
                    </label>
                    <input
                      id="name-input"
                      type="text"
                      placeholder="Required for new users"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      aria-label="Full name"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone-input" className="mb-1.5 block text-xs font-medium text-slate-700">
                      Phone number
                    </label>
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500"
                        aria-hidden="true"
                      >
                        +91
                      </span>
                      <input
                        id="phone-input"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-14 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        aria-label="Mobile number (India +91)"
                        autoComplete="tel"
                        inputMode="numeric"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div>
                    <span id="role-label" className="mb-1.5 block text-xs font-medium text-slate-700">
                      Role
                    </span>
                    <div
                      className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner"
                      role="group"
                      aria-labelledby="role-label"
                    >
                      {ROLE_OPTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSelectedRole(value)}
                          aria-pressed={selectedRole === value}
                          className={`flex-1 rounded-lg px-2 py-2.5 text-center text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
                            selectedRole === value
                              ? 'bg-white text-teal-800 shadow-sm ring-1 ring-slate-200/80'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualContinue}
                    disabled={phone.length < 10}
                    aria-disabled={phone.length < 10}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition-all hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    Continue
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>

                {error && (
                  <motion.p
                    role="alert"
                    aria-live="assertive"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-100 bg-red-50 p-3 text-center text-xs text-red-700"
                  >
                    {error}
                  </motion.p>
                )}

                <p className="text-center text-[10px] leading-relaxed text-slate-400">
                  Backend on <span className="font-mono text-slate-500">localhost:8000</span>. Demo OTP{' '}
                  <span className="font-mono font-semibold text-slate-600">123456</span>.
                </p>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep('welcome');
                    setOtp('');
                    setError('');
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                >
                  <ChevronLeft size={18} /> Back
                </button>

                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 ring-1 ring-teal-100">
                    <Shield size={26} className="text-teal-700" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Verify your number</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    OTP sent to <span className="font-semibold text-slate-800">+91 {phone}</span>
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-800 ring-1 ring-teal-100">
                    Dev mode: use 123456
                  </span>
                </div>

                <div className="flex justify-center gap-2" role="group" aria-label="Enter 6-digit OTP">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i] || ''}
                      aria-label={`OTP digit ${i + 1}`}
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/, '');
                        const arr = otp.split('');
                        arr[i] = val;
                        setOtp(arr.join(''));
                        if (val) (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otp[i])
                          (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus();
                      }}
                      className="h-14 w-11 rounded-xl border-2 border-slate-200 bg-white text-center text-xl font-bold text-slate-900 shadow-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 sm:w-12"
                    />
                  ))}
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/80 p-3">
                  <Shield size={14} className="mt-0.5 shrink-0 text-teal-700" />
                  <p className="text-[10px] leading-relaxed text-teal-900">
                    By verifying, you consent to DPDPA 2023 data processing for AI-assisted healthcare triage.
                  </p>
                </div>

                {error && (
                  <p
                    role="alert"
                    aria-live="assertive"
                    className="rounded-xl border border-red-100 bg-red-50 p-3 text-center text-xs text-red-700"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleOtpLogin}
                  disabled={otp.length < 6 || loading}
                  aria-disabled={otp.length < 6 || loading}
                  aria-label="Verify OTP and log in"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition-all hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  Verify &amp; Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
