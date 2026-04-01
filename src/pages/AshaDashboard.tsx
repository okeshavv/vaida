/**
 * ASHA DASHBOARD — Field Health Worker
 * Operational, efficiency-first UI for community health workers managing
 * multiple patients in the field.
 * Color theme: Warm orange/amber + slate operational.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Users, Clock, TrendingUp, MapPin,
  RefreshCw, ChevronRight, Mic, CloudOff, Wifi, WifiOff,
  Home, Plus, Eye, Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { getAshaQueue } from '../api/client';

type TriageUrgency = 'GREEN' | 'AMBER' | 'RED';

interface QueuePatient {
  id: string; name: string; age: number; village: string;
  symptom: string; urgency: TriageUrgency; timeAgo: string;
}

const MOCK_PATIENTS: QueuePatient[] = [
  { id: 'p1', name: 'Sita Devi',    age: 42, village: 'Ward 3 – East Hamlet', symptom: 'High fever 39.2°C, severe body ache',   urgency: 'RED',   timeAgo: '12 min' },
  { id: 'p2', name: 'Lakshmi Bai',  age: 55, village: 'Ward 3 – Temple Area', symptom: 'Chest pain, dizziness on standing',     urgency: 'RED',   timeAgo: '3 hr' },
  { id: 'p3', name: 'Ramesh Kumar', age: 67, village: 'Ward 1 – Main Road',   symptom: 'Persistent cough, breathlessness',      urgency: 'AMBER', timeAgo: '28 min' },
  { id: 'p4', name: 'Vikram Singh', age:  8, village: 'Ward 4 – Canal Road',  symptom: 'Diarrhea, dehydration risk (child)',     urgency: 'AMBER', timeAgo: '2 hr' },
  { id: 'p5', name: 'Geeta Sharma', age: 34, village: 'Ward 2 – Anganwadi',   symptom: 'Skin rash, mild itching, no fever',     urgency: 'GREEN', timeAgo: '1 hr' },
];

const urgBg: Record<TriageUrgency, string> = {
  RED: 'bg-red-500', AMBER: 'bg-amber-400', GREEN: 'bg-emerald-500',
};
const urgBorderL: Record<TriageUrgency, string> = {
  RED: 'border-l-4 border-l-red-500', AMBER: 'border-l-4 border-l-amber-400', GREEN: 'border-l-4 border-l-emerald-400',
};
const urgText: Record<TriageUrgency, string> = {
  RED: 'text-red-700 bg-red-50', AMBER: 'text-amber-700 bg-amber-50', GREEN: 'text-emerald-700 bg-emerald-50',
};

export default function AshaDashboard() {
  const { t } = useTranslation();
  const { user, isOnline, pendingSyncCount } = useApp();
  const navigate = useNavigate();
  const name = user?.name_encrypted || 'ASHA Worker';
  const district = user?.district ?? 'Jaipur Rural';

  const [syncing, setSyncing] = useState(false);
  const [patients, setPatients] = useState<QueuePatient[]>(MOCK_PATIENTS);
  const [filter, setFilter] = useState<TriageUrgency | 'ALL'>('ALL');

  useEffect(() => {
    getAshaQueue()
      .then((data: unknown[]) => {
        if (data.length > 0) {
          setPatients(data.map((s: unknown) => {
            const item = s as Record<string, unknown>;
            return {
              id: String(item.id ?? ''),
              name: String(item.patient_id ?? 'Patient'),
              age: 0,
              village: String(item.body_location ?? '—'),
              symptom: String((item.symptoms_json as Record<string, unknown>)?.chief_complaint ?? '—'),
              urgency: ((item.urgency as string) ?? 'GREEN') as TriageUrgency,
              timeAgo: new Date(String(item.created_at ?? '')).toLocaleTimeString(),
            };
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSync = () => {
    if (!isOnline) { toast.error('Offline — sync will run when connectivity returns.'); return; }
    setSyncing(true);
    setTimeout(() => { setSyncing(false); toast.success('All records synced'); }, 2000);
  };

  const redCount   = patients.filter(p => p.urgency === 'RED').length;
  const amberCount = patients.filter(p => p.urgency === 'AMBER').length;
  const greenCount = patients.length - redCount - amberCount;
  const displayed  = filter === 'ALL' ? patients : patients.filter(p => p.urgency === filter);

  return (
    <div className="min-h-screen bg-slate-100 pb-28">

      {/* ── Field Worker Header ──────────────────────────────────── */}
      <div className="bg-gradient-to-br from-orange-600 to-orange-700 px-5 pt-14 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-orange-200 text-xs font-bold tracking-widest uppercase mb-1">VAIDA · ASHA Worker</p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="text-white text-xl font-bold"
            >
              {name}
            </motion.h1>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin size={12} className="text-orange-200" />
              <span className="text-orange-100 text-xs">{district}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-full ${isOnline ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/25 text-red-200'}`}>
              {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isOnline ? 'Connected' : 'Offline'}
            </div>
            {!isOnline && (pendingSyncCount ?? 0) > 0 && (
              <span className="text-[10px] text-orange-200">{pendingSyncCount} pending sync</span>
            )}
          </div>
        </div>

        {/* Today Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-4 gap-2 mt-5"
        >
          {[
            { icon: Home,          value: '18',                          label: 'Visited',    color: 'text-orange-200' },
            { icon: Users,         value: String(patients.length),       label: 'In Queue',   color: 'text-orange-200' },
            { icon: AlertTriangle, value: String(redCount + amberCount), label: 'Alerts',     color: 'text-red-300' },
            { icon: TrendingUp,    value: '45',                          label: 'This Month', color: 'text-orange-200' },
          ].map(({ icon: Icon, value, label, color }, i) => (
            <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-2.5 text-center">
              <Icon size={14} className={`${color} mx-auto mb-1`} />
              <div className="text-white font-bold text-base leading-none">{value}</div>
              <div className="text-orange-200 text-[9px] mt-0.5 leading-tight">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="px-4 mt-3 space-y-4">

        {/* ── Offline Banner ─────────────────────────────────────── */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3"
            >
              <CloudOff size={20} className="text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Working Offline</p>
                <p className="text-xs text-amber-600 mt-0.5">{pendingSyncCount ?? 0} records queued for upload</p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Disease Cluster Alert ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-amber-50 border-2 border-amber-300 rounded-2xl overflow-hidden"
        >
          <div className="bg-amber-100 px-4 py-2.5 flex items-center gap-2 border-b border-amber-200">
            <Zap size={15} className="text-amber-700" />
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Active Cluster Alert</span>
            <span className="ml-auto text-[10px] text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full font-semibold">MODERATE</span>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">3 suspected Scabies cases — Sector 4</p>
            <p className="text-xs text-amber-700 mt-1">Last 48 hrs · Symptoms: intense itching, skin lesions</p>
            <button
              onClick={() => navigate('/epi')}
              className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800 transition-colors"
            >
              View cluster map <ChevronRight size={13} />
            </button>
          </div>
        </motion.div>

        {/* ── Patient Queue ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Patient Queue</h2>
              <p className="text-xs text-slate-400">Sorted by urgency · {patients.length} patients today</p>
            </div>
            <button
              onClick={() => navigate('/intake')}
              className="flex items-center gap-1.5 bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all"
            >
              <Plus size={13} />
              New Intake
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {([
              { key: 'ALL',   label: `All (${patients.length})`,  active: 'bg-slate-800 text-white' },
              { key: 'RED',   label: `🔴 Red (${redCount})`,       active: 'bg-red-500 text-white' },
              { key: 'AMBER', label: `🟡 Amber (${amberCount})`,   active: 'bg-amber-400 text-white' },
              { key: 'GREEN', label: `🟢 Green (${greenCount})`,   active: 'bg-emerald-500 text-white' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as TriageUrgency | 'ALL')}
                className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all ${filter === f.key ? f.active : 'bg-white border border-slate-200 text-slate-500'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {displayed.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className={`bg-white rounded-2xl shadow-sm ${urgBorderL[p.urgency]} overflow-hidden`}
              >
                <div className="px-4 py-3.5 flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${urgBg[p.urgency]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-bold text-sm text-slate-800">{p.name}</span>
                      <span className="text-xs text-slate-400">{p.age}y</span>
                      <span className="ml-auto text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0">
                        <Clock size={9} /> {p.timeAgo}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <MapPin size={10} className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-400 truncate">{p.village}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-snug">{p.symptom}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgText[p.urgency]}`}>
                        {p.urgency}
                      </span>
                      <button
                        onClick={() => navigate(`/triage/${p.id}`)}
                        className="ml-auto flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        <Eye size={13} /> View Triage
                      </button>
                      {p.urgency !== 'GREEN' && (
                        <button
                          onClick={() => navigate('/consult')}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <Mic size={11} /> Refer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Quick Field Actions ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <button
            onClick={() => navigate('/intake')}
            className="bg-orange-600 text-white rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-orange-200"
          >
            <Mic size={20} />
            <div className="text-left">
              <p className="text-sm font-bold">New Patient</p>
              <p className="text-xs text-orange-200">Voice intake</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/epi')}
            className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-all"
          >
            <AlertTriangle size={20} className="text-amber-500" />
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">Epi Map</p>
              <p className="text-xs text-slate-400">Cluster alerts</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
