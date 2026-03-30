import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Stethoscope, Activity, ArrowRight,
  Loader2, Shield, ChevronLeft, Zap,
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
    subtitle: 'Rural Healthcare User',
    Icon: Heart,
    cardCls: 'bg-emerald-50 border-emerald-200',
    iconCls: 'bg-emerald-100 text-emerald-600',
    tagCls: 'text-emerald-600',
    dot: 'bg-emerald-500',
    btn: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
  },
  {
    role: 'asha' as UserRole,
    name: 'Sunita Devi',
    phone: '9000000002',
    label: 'ASHA Worker',
    subtitle: 'Community Health Worker',
    Icon: Activity,
    cardCls: 'bg-orange-50 border-orange-200',
    iconCls: 'bg-orange-100 text-orange-600',
    tagCls: 'text-orange-600',
    dot: 'bg-orange-500',
    btn: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700',
  },
  {
    role: 'doctor' as UserRole,
    name: 'Dr. Arjun Mehta',
    phone: '9000000003',
    label: 'Doctor',
    subtitle: 'Teleconsult Physician',
    Icon: Stethoscope,
    cardCls: 'bg-purple-50 border-purple-200',
    iconCls: 'bg-purple-100 text-purple-600',
    tagCls: 'text-purple-600',
    dot: 'bg-purple-500',
    btn: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800',
  },
] as const;

type Demo = typeof DEMO[number];

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

  // Seed demo users on mount (idempotent)
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
      try { await register({ name: demo.name, phone: demo.phone, role: demo.role, lang: 'en', consent: true }); } catch { /* already exists */ }
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
        try { await register({ name, phone, role: selectedRole, lang: 'en', consent: true }); } catch { /* ignore */ }
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
    <div className="min-h-screen bg-[#0F1923] flex flex-col">

      {/* ── Brand header ── */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-14 pb-10 text-center"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="relative w-20 h-20 mx-auto mb-5"
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-3xl bg-vaida-teal opacity-20 blur-xl scale-110" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-vaida-teal to-emerald-700 flex items-center justify-center shadow-2xl">
            <Heart size={32} className="text-white fill-white" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            <span className="text-[#3DD5AA]">V</span>AIDA
          </h1>
          <p className="text-white/60 text-sm mt-1.5 font-medium">Voice AI Diagnostic Assistant</p>
          <div className="flex items-center justify-center gap-3 mt-3">
            {['8 Languages', 'FHIR R4', 'Offline PWA'].map((tag) => (
              <span key={tag} className="text-[10px] text-white/30 border border-white/10 rounded-full px-2.5 py-0.5 font-medium">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Main card ── */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex-1 bg-[#F8F7F2] rounded-t-[2rem] px-5 pt-7 pb-12 overflow-y-auto"
      >
        <AnimatePresence mode="wait">

          {/* ══ WELCOME STEP ══ */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Demo section header */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <Zap size={14} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-vaida-text uppercase tracking-widest">Quick Demo Access</p>
                  <p className="text-[10px] text-vaida-text-hint">One-click login for each role</p>
                </div>
              </div>

              {/* Demo cards */}
              <div className="space-y-3">
                {DEMO.map((demo, i) => {
                  const { Icon } = demo;
                  const isLoading = demoLoading === demo.role;
                  return (
                    <motion.div
                      key={demo.role}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className={`border-2 rounded-2xl ${demo.cardCls} overflow-hidden`}
                    >
                      <div className="flex items-center gap-3 p-4">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl ${demo.iconCls} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={22} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-sm text-vaida-text">{demo.label}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${demo.tagCls} border border-current rounded-full px-1.5 py-0.5`}>
                              Demo
                            </span>
                          </div>
                          <p className="text-[11px] text-vaida-text-muted truncate">{demo.name}</p>
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-vaida-text-hint bg-white rounded-md px-2 py-0.5 border border-vaida-bg2">
                              📱 {demo.phone}
                            </span>
                            <span className="text-[10px] font-mono text-vaida-text-hint bg-white rounded-md px-2 py-0.5 border border-vaida-bg2">
                              🔑 123456
                            </span>
                          </div>
                        </div>

                        {/* CTA */}
                        <button
                          onClick={() => handleDemoLogin(demo)}
                          disabled={demoLoading !== null}
                          className={`${demo.btn} text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 shadow-sm`}
                        >
                          {isLoading
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Zap size={13} />
                          }
                          {isLoading ? '...' : 'Login'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-vaida-bg2" />
                <span className="text-xs text-vaida-text-hint font-medium px-1">or sign in manually</span>
                <div className="flex-1 h-px bg-vaida-bg2" />
              </div>

              {/* Manual form */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name (required for new users)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field text-sm"
                />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-vaida-text-muted select-none">+91</span>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="input-field pl-12 text-sm"
                  />
                </div>

                {/* Role pills */}
                <div className="grid grid-cols-3 gap-2">
                  {(['patient', 'asha', 'doctor'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRole(r)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border-2 capitalize transition-all ${
                        selectedRole === r
                          ? 'border-vaida-teal bg-vaida-teal text-white shadow-sm'
                          : 'border-vaida-bg2 text-vaida-text-muted bg-white hover:border-vaida-teal/50'
                      }`}
                    >
                      {r === 'asha' ? 'ASHA' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleManualContinue}
                  disabled={phone.length < 10}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                >
                  Continue <ArrowRight size={15} />
                </button>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-urgency-red text-center bg-urgency-red-bg rounded-xl p-3 border border-red-100"
                >
                  {error}
                </motion.p>
              )}

              {/* Footer note */}
              <p className="text-center text-[10px] text-vaida-text-hint leading-relaxed">
                Backend must be running on <span className="font-mono">localhost:8000</span>.<br />
                All demo OTPs use bypass code <span className="font-mono font-bold">123456</span>.
              </p>
            </motion.div>
          )}

          {/* ══ OTP STEP ══ */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <button
                onClick={() => { setStep('welcome'); setOtp(''); setError(''); }}
                className="flex items-center gap-1.5 text-sm text-vaida-text-muted hover:text-vaida-text transition-colors"
              >
                <ChevronLeft size={16} /> Back
              </button>

              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-vaida-teal-light flex items-center justify-center mb-4">
                  <Shield size={24} className="text-vaida-teal" />
                </div>
                <h2 className="text-xl font-bold text-vaida-text">Verify your number</h2>
                <p className="text-sm text-vaida-text-muted mt-1">OTP sent to <span className="font-semibold">+91 {phone}</span></p>
                <span className="inline-block mt-2 text-[11px] text-vaida-teal-mid font-semibold bg-vaida-teal-light px-3 py-1 rounded-full">
                  Dev mode: use 123456
                </span>
              </div>

              {/* OTP boxes */}
              <div className="flex gap-2 justify-center">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/, '');
                      const arr = otp.split('');
                      arr[i] = val;
                      setOtp(arr.join(''));
                      if (val) (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[i]) (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus();
                    }}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-vaida-bg2 rounded-xl bg-white focus:border-vaida-teal focus:ring-2 focus:ring-vaida-teal/20 transition-all"
                  />
                ))}
              </div>

              <div className="bg-vaida-teal-light rounded-xl p-3 flex items-start gap-2 border border-vaida-teal/20">
                <Shield size={14} className="text-vaida-teal mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-vaida-teal leading-relaxed">
                  By verifying, you consent to DPDPA 2023 data processing for AI-assisted healthcare triage.
                </p>
              </div>

              {error && (
                <p className="text-xs text-urgency-red text-center bg-urgency-red-bg rounded-xl p-3 border border-red-100">
                  {error}
                </p>
              )}

              <button
                onClick={handleOtpLogin}
                disabled={otp.length < 6 || loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Verify & Login
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
