/**
 * PATIENT DASHBOARD
 * Soft, personal health companion.
 * Primary goal: start a new intake or see recent health events.
 * Color theme: Teal/Emerald, warm white background.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Mic, Camera, MapPin, PhoneCall, ChevronRight,
  Shield, Heart, AlertCircle, CheckCircle2, Clock, Wifi, WifiOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getPatientSessions } from '../api/client';

type TriageUrgency = 'GREEN' | 'AMBER' | 'RED';
interface Session {
  id: string; date: string; complaint: string;
  urgency: TriageUrgency | null; confidence: number | null;
}

const FALLBACK: Session[] = [
  { id: '1', date: '2026-03-28', complaint: 'Headache & Nausea', urgency: 'GREEN', confidence: 0.89 },
  { id: '2', date: '2026-03-25', complaint: 'Skin Rash — Left Arm', urgency: 'AMBER', confidence: 0.76 },
  { id: '3', date: '2026-03-20', complaint: 'Chest Discomfort', urgency: 'RED', confidence: 0.94 },
];

const urgencyConfig: Record<TriageUrgency, { icon: typeof CheckCircle2; bg: string; text: string; label: string }> = {
  GREEN:  { icon: CheckCircle2,  bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Self-Care' },
  AMBER:  { icon: Clock,         bg: 'bg-amber-50  border-amber-200',   text: 'text-amber-700',   label: 'Follow Up' },
  RED:    { icon: AlertCircle,   bg: 'bg-red-50    border-red-200',     text: 'text-red-700',     label: 'Urgent' },
};

export default function PatientDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnline } = useApp();
  const name = (user?.name_encrypted || 'Friend').split(' ')[0];

  const [sessions, setSessions] = useState<Session[]>(FALLBACK);
  useEffect(() => {
    getPatientSessions()
      .then((data) => { if (data.length > 0) setSessions(data.slice(0, 5) as Session[]); })
      .catch(() => {});
  }, []);

  const redCount = sessions.filter(s => s.urgency === 'RED').length;
  const amberCount = sessions.filter(s => s.urgency === 'AMBER').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white pb-28">

      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 to-teal-800 px-5 pt-14 pb-16 rounded-b-[2.5rem]">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-teal-500/20" />
        <div className="absolute top-4 right-12 w-24 h-24 rounded-full bg-teal-400/15" />

        <div className="relative z-10 flex items-start justify-between mb-2">
          <div>
            <p className="text-teal-200 text-xs font-semibold tracking-widest uppercase mb-1">VAIDA · Patient</p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white text-2xl font-bold"
            >
              Hi, {name} 👋
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              transition={{ delay: 0.15 }}
              className="text-teal-100 text-sm mt-1"
            >
              {t('dashboard.subtitle')}
            </motion.p>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${isOnline ? 'bg-teal-500/30 text-teal-100' : 'bg-amber-400/30 text-amber-200'}`}>
            {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Health Summary Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 flex gap-2 mt-4 flex-wrap"
        >
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
            <Heart size={12} className="text-teal-200" />
            <span className="text-white text-xs font-medium">{sessions.length} sessions</span>
          </div>
          {redCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/25 px-3 py-1.5 rounded-full">
              <AlertCircle size={12} className="text-red-200" />
              <span className="text-red-100 text-xs font-medium">{redCount} urgent</span>
            </div>
          )}
          {amberCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-400/25 px-3 py-1.5 rounded-full">
              <Clock size={12} className="text-amber-200" />
              <span className="text-amber-100 text-xs font-medium">{amberCount} follow-up</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Primary CTA: Start New Intake ───────────────────────── */}
      <div className="px-5 -mt-6">
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 24 }}
          onClick={() => navigate('/intake')}
          className="w-full bg-white shadow-xl shadow-teal-100 border border-teal-100 rounded-3xl p-5 flex items-center gap-4 hover:shadow-teal-200 active:scale-[0.98] transition-all duration-200"
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-teal-600/30">
            <Mic size={26} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-800 text-base">How are you feeling?</p>
            <p className="text-sm text-slate-500 mt-0.5">Tap to start voice symptom check</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
            <ChevronRight size={18} className="text-teal-600" />
          </div>
        </motion.button>
      </div>

      {/* ── Quick Actions Row ────────────────────────────────────── */}
      <div className="px-5 mt-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Other options</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Camera, label: 'Scan Image', path: '/intake/scan', bg: 'bg-violet-50', iconColor: 'text-violet-600', border: 'border-violet-100' },
            { icon: MapPin,  label: 'Body Map',   path: '/intake/body-map', bg: 'bg-orange-50', iconColor: 'text-orange-600', border: 'border-orange-100' },
            { icon: PhoneCall, label: 'Emergency', path: '/emergency', bg: 'bg-red-50', iconColor: 'text-red-600', border: 'border-red-100' },
          ].map(({ icon: Icon, label, path, bg, iconColor, border }) => (
            <motion.button
              key={path}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(path)}
              className={`${bg} border ${border} rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-[0.96] transition-all`}
            >
              <Icon size={22} className={iconColor} />
              <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Recent Health Events ─────────────────────────────────── */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">Recent Health Events</h2>
          <button onClick={() => navigate('/history')} className="text-xs font-semibold text-teal-600">
            View All
          </button>
        </div>

        <div className="space-y-2.5">
          {sessions.map((s, i) => {
            const urg = (s.urgency ?? 'GREEN') as TriageUrgency;
            const cfg = urgencyConfig[urg];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                onClick={() => navigate('/triage/' + s.id)}
                className={`bg-white border rounded-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow ${cfg.bg}`}
              >
                <Icon size={18} className={cfg.text} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{s.complaint}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.date}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.text} bg-white/80 border`}>
                  {cfg.label}
                </span>
                <ChevronRight size={15} className="text-slate-300 shrink-0" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────── */}
      <div className="mx-5 mt-6 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2">
        <Shield size={13} className="text-slate-400 mt-0.5 shrink-0" />
        <p className="text-[10px] text-slate-400 leading-relaxed">{t('triage.disclaimer')}</p>
      </div>
    </div>
  );
}
