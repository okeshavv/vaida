/**
 * DOCTOR DASHBOARD — Clinical Workstation
 * Professional two-panel layout: priority queue (left) + patient detail (right).
 * Color theme: Navy/slate clinical, with urgency color accents.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Activity, AlertCircle, ChevronRight, Clock, FileText, FileJson,
  Loader2, Mic, MicOff, Phone, PhoneOff, Send, Stethoscope,
  Thermometer, Heart, Wind, User, Video, Eye, Image as ImageIcon,
  Users, CheckCircle2, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../context/AppContext';
import { getDoctorQueue, initiateConsult, completeConsult, submitTriageFeedback } from '../api/client';
import type { DifferentialDiagnosis, UrgencyLevel } from '../types';

type LocalConsultStatus = 'pending' | 'active' | 'done';  // matches ConsultStatus from types

type TriageUrgency = Extract<UrgencyLevel, 'AMBER' | 'RED'>;
interface VitalSigns { temp: string; hr: string; spo2: string; rr: string; }
interface ScanImage { id: string; label: string; finding: string; urgency: 'low' | 'medium' | 'high'; }
interface PendingConsult {
  id: string; patientLabel: string; ageSex: string; district: string;
  urgency: TriageUrgency; waitingSince: string; sessionId: string;
  chiefComplaint: string; triageConfidence: number; modelVersion: string;
  differentials: DifferentialDiagnosis[]; pdfBriefSummary: string[];
  vitals: VitalSigns; scanImages: ScanImage[];
  fhirBundle: Record<string, unknown>;
}

const MOCK_QUEUE: PendingConsult[] = [
  {
    id: 'c1', patientLabel: 'Patient ··4821', ageSex: 'F · 34y', district: 'Jaipur Rural',
    urgency: 'RED', waitingSince: '14 min', sessionId: 'ses-a7f3-9c21',
    chiefComplaint: 'Acute onset severe headache with photophobia, neck stiffness, and fever to 39.2°C beginning 8 hours ago.',
    triageConfidence: 0.91, modelVersion: 'vaida-triage-2.4.1',
    differentials: [
      { condition: 'Bacterial Meningitis', probability: 0.68, reasoning: 'Triad of fever, neck stiffness, and photophobia with acute onset is classic presentation.' },
      { condition: 'Viral Meningitis',     probability: 0.21, reasoning: 'Similar presentation; generally milder course.' },
      { condition: 'Subarachnoid Haemorrhage', probability: 0.11, reasoning: '"Thunderclap" headache pattern warrants exclusion.' },
    ],
    pdfBriefSummary: ['34-year-old female presenting with meningeal signs', 'Fever 39.2°C, HR 108 bpm, SpO₂ 97%', 'Urgent LP and empirical IV antibiotics recommended', 'CT head before LP if focal neurology'],
    vitals: { temp: '39.2°C', hr: '108 bpm', spo2: '97%', rr: '22 /min' },
    scanImages: [{ id: 'i1', label: 'Neck Region', finding: 'Visible nuchal rigidity, no rash', urgency: 'high' }],
    fhirBundle: { resourceType: 'Bundle', id: 'ses-a7f3-9c21', type: 'collection', entry: [{ resource: { resourceType: 'Patient', gender: 'female', birthDate: '1992-01' } }] },
  },
  {
    id: 'c2', patientLabel: 'Patient ··7740', ageSex: 'F · 7y', district: 'Jaipur North',
    urgency: 'RED', waitingSince: '52 min', sessionId: 'ses-b8e2-4d10',
    chiefComplaint: 'Parent reports rapid breathing, subcostal retractions, and reduced oral intake for 2 days. SpO₂ 91% at field.',
    triageConfidence: 0.87, modelVersion: 'vaida-triage-2.4.1',
    differentials: [
      { condition: 'Severe Pneumonia',    probability: 0.74, reasoning: 'Subcostal retractions + SpO₂ 91% meets WHO severe pneumonia criteria.' },
      { condition: 'Bronchiolitis',       probability: 0.18, reasoning: 'Common in <2y but can occur up to 7y.' },
      { condition: 'Asthma Exacerbation', probability: 0.08, reasoning: 'No prior wheeze history documented.' },
    ],
    pdfBriefSummary: ['7-year-old female with respiratory distress', 'SpO₂ 91%, RR 48/min, subcostal retractions', 'Meets WHO severe pneumonia — admit + O₂ therapy', 'IV amoxicillin + supportive care'],
    vitals: { temp: '38.1°C', hr: '142 bpm', spo2: '91%', rr: '48 /min' },
    scanImages: [],
    fhirBundle: { resourceType: 'Bundle', id: 'ses-b8e2-4d10', type: 'collection', entry: [] },
  },
  {
    id: 'c3', patientLabel: 'Patient ··9103', ageSex: 'M · 61y', district: 'Jaipur Central',
    urgency: 'AMBER', waitingSince: '36 min', sessionId: 'ses-c3f1-7b44',
    chiefComplaint: 'Progressive exertional dyspnoea and tight substernal discomfort over 5 days, worse on exertion, partial relief at rest.',
    triageConfidence: 0.82, modelVersion: 'vaida-triage-2.4.1',
    differentials: [
      { condition: 'Unstable Angina',  probability: 0.55, reasoning: 'Progressive pattern in 61M with exertional chest tightness.' },
      { condition: 'Stable Angina',    probability: 0.29, reasoning: 'Symptoms partially resolve with rest.' },
      { condition: 'GERD',             probability: 0.16, reasoning: 'Substernal discomfort — functional cause to exclude.' },
    ],
    pdfBriefSummary: ['61-year-old male with chest symptoms 5 days', 'Exertional substernal tightness, rest relief', 'ECG + troponin recommended urgently', 'Aspirin 300mg if ACS suspected'],
    vitals: { temp: '37.1°C', hr: '88 bpm', spo2: '96%', rr: '18 /min' },
    scanImages: [],
    fhirBundle: { resourceType: 'Bundle', id: 'ses-c3f1-7b44', type: 'collection', entry: [] },
  },
];

const urgencyBadge: Record<TriageUrgency, string> = {
  RED:   'bg-red-100 text-red-700 border border-red-200',
  AMBER: 'bg-amber-100 text-amber-700 border border-amber-200',
};
const urgencyDot: Record<TriageUrgency, string> = {
  RED: 'bg-red-500', AMBER: 'bg-amber-400',
};
const urgencyBorder: Record<TriageUrgency, string> = {
  RED: 'border-l-[3px] border-l-red-500', AMBER: 'border-l-[3px] border-l-amber-400',
};

const MEDICATIONS = ['Paracetamol 500mg', 'Amoxicillin 500mg', 'Ibuprofen 400mg', 'ORS Sachets', 'Metformin 500mg', 'Atorvastatin 20mg', 'Amlodipine 5mg'];

const fadeIn: Variants = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

export default function DoctorDashboard() {
  const { user } = useApp();
  const name = user?.name_encrypted || 'Doctor';

  const [queue, setQueue] = useState<PendingConsult[]>(MOCK_QUEUE);
  const [selectedId, setSelectedId] = useState<string>(MOCK_QUEUE[0].id);
  const [briefView, setBriefView] = useState<'pdf' | 'fhir'>('pdf');
  const [consultStatus, setConsultStatus] = useState<Record<string, LocalConsultStatus>>({});
  const [jitsiUrls, setJitsiUrls] = useState<Record<string, string>>({});
  const [muted, setMuted] = useState(false);
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getDoctorQueue()
      .then((data: unknown[]) => { if (data.length > 0) setQueue(data as PendingConsult[]); })
      .catch(() => {});
  }, []);

  const selected = useMemo(() => queue.find(q => q.id === selectedId) ?? queue[0], [queue, selectedId]);
  const status = selected ? (consultStatus[selected.id] ?? 'pending') : 'pending';

  const handleJoinCall = useCallback(async () => {
    if (!selected) return;
    try {
      const result = await initiateConsult(selected.sessionId);
      setJitsiUrls(prev => ({ ...prev, [selected.id]: result.jitsi_room_url }));
      setConsultStatus(prev => ({ ...prev, [selected.id]: 'active' as LocalConsultStatus }));
      window.open(result.jitsi_room_url, '_blank');
    } catch {
      toast.error('Could not start consultation');
    }
  }, [selected]);

  const handleEndCall = useCallback(async () => {
    if (!selected) return;
    setConsultStatus(prev => ({ ...prev, [selected.id]: 'done' as LocalConsultStatus }));
    try { await completeConsult(selected.id, { diagnosis: notes, prescription, follow_up: '' }); } catch { /* offline */ }
    toast.success('Consultation completed');
  }, [selected, notes, prescription]);

  const handleSendToAsha = useCallback(async () => {
    if (!selected || !prescription.trim()) { toast.error('Add a prescription first'); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 1400));
    setSending(false);
    toast.success('Instructions sent to ASHA worker');
  }, [selected, prescription]);

  if (!selected) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-0 md:flex md:h-screen md:overflow-hidden">

      {/* ══ LEFT: Priority Queue ══════════════════════════════════════ */}
      <aside className="md:w-80 md:min-w-[20rem] md:h-full md:overflow-y-auto md:border-r md:border-slate-700/60 bg-slate-900 shrink-0">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700/60 px-4 pt-14 pb-4 md:pt-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">VAIDA · Doctor</p>
              <h1 className="text-white text-base font-bold mt-0.5">Dr. {name.split(' ').slice(-1)[0]}</h1>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Feed
              </span>
              <span className="text-slate-400 text-[10px]">{queue.length} waiting</span>
            </div>
          </div>

          {/* Queue stats */}
          <div className="flex gap-2 mt-3">
            <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
              <div className="text-red-400 font-bold text-lg">{queue.filter(q => q.urgency === 'RED').length}</div>
              <div className="text-red-400/60 text-[9px] font-semibold uppercase">Critical</div>
            </div>
            <div className="flex-1 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2 text-center">
              <div className="text-amber-400 font-bold text-lg">{queue.filter(q => q.urgency === 'AMBER').length}</div>
              <div className="text-amber-400/60 text-[9px] font-semibold uppercase">Urgent</div>
            </div>
            <div className="flex-1 bg-slate-700/50 border border-slate-600/30 rounded-xl px-3 py-2 text-center">
              <div className="text-slate-300 font-bold text-lg">{queue.length}</div>
              <div className="text-slate-500 text-[9px] font-semibold uppercase">Total</div>
            </div>
          </div>
        </div>

        {/* Queue List */}
        <div className="p-3 space-y-2">
          {queue.map((consult) => {
            const isActive = consult.id === selectedId;
            return (
              <motion.button
                key={consult.id}
                onClick={() => setSelectedId(consult.id)}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className={clsx(
                  'w-full text-left rounded-xl p-3.5 transition-all',
                  urgencyBorder[consult.urgency],
                  isActive
                    ? 'bg-slate-700 border border-slate-600'
                    : 'bg-slate-800 border border-slate-700/50 hover:bg-slate-750',
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${urgencyDot[consult.urgency]}`} />
                  <span className="font-bold text-sm text-white flex-1 truncate">{consult.patientLabel}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${urgencyBadge[consult.urgency]}`}>
                    {consult.urgency}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Users size={10} /> {consult.ageSex}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {consult.waitingSince}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-snug">{consult.chiefComplaint}</p>
                {isActive && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-400 font-semibold">
                    <ChevronRight size={11} /> Viewing now
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </aside>

      {/* ══ RIGHT: Clinical Detail Panel ════════════════════════════ */}
      <main className="flex-1 bg-slate-800 md:overflow-y-auto pb-24 md:pb-6">

        <AnimatePresence mode="wait">
          <motion.div key={selected.id} variants={fadeIn} initial="hidden" animate="show">

            {/* Patient Header Bar */}
            <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700/60 px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                <User size={18} className="text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-white">{selected.patientLabel}</h2>
                  <span className="text-slate-400 text-sm">{selected.ageSex}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyBadge[selected.urgency]}`}>
                    {selected.urgency}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">{selected.district} · Session {selected.sessionId.slice(-6)}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-slate-400">Waiting</div>
                <div className="font-bold text-amber-400">{selected.waitingSince}</div>
              </div>
            </div>

            <div className="px-5 py-5 space-y-5">

              {/* ── Vitals ──────────────────────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity size={13} /> Vital Signs
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Thermometer, label: 'Temperature', value: selected.vitals.temp, alert: parseFloat(selected.vitals.temp) >= 38.5 },
                    { icon: Heart,       label: 'Heart Rate',  value: selected.vitals.hr,   alert: parseInt(selected.vitals.hr) > 120 },
                    { icon: Eye,         label: 'SpO₂',        value: selected.vitals.spo2, alert: parseInt(selected.vitals.spo2) < 95 },
                    { icon: Wind,        label: 'Resp. Rate',  value: selected.vitals.rr,   alert: parseInt(selected.vitals.rr) > 30 },
                  ].map(({ icon: Icon, label, value, alert }) => (
                    <div key={label} className={`rounded-xl p-4 border ${alert ? 'bg-red-900/20 border-red-500/30' : 'bg-slate-700/50 border-slate-600/30'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className={alert ? 'text-red-400' : 'text-slate-400'} />
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</span>
                      </div>
                      <div className={`text-lg font-bold ${alert ? 'text-red-300' : 'text-white'}`}>{value}</div>
                      {alert && <div className="text-[9px] text-red-400 mt-1 font-semibold">ABNORMAL</div>}
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Chief Complaint ──────────────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Stethoscope size={13} /> Chief Complaint
                </h3>
                <blockquote className="border-l-4 border-blue-500 pl-4 py-1 text-sm text-slate-200 leading-relaxed italic">
                  "{selected.chiefComplaint}"
                </blockquote>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-slate-500">AI Confidence:</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5 max-w-[8rem]">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${selected.triageConfidence * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">{Math.round(selected.triageConfidence * 100)}%</span>
                  <span className="text-[10px] text-slate-600">{selected.modelVersion}</span>
                </div>
              </section>

              {/* ── Differential Diagnoses ───────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlertCircle size={13} /> Differential Diagnoses
                </h3>
                <div className="space-y-2.5">
                  {selected.differentials.map((d, i) => (
                    <div key={i} className="bg-slate-700/50 border border-slate-600/30 rounded-xl p-3.5">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-sm text-white">{d.condition}</span>
                        <div className="flex-1 bg-slate-600 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-blue-400/60' : 'bg-slate-500'}`}
                            style={{ width: `${d.probability * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-300 w-9 text-right shrink-0">
                          {Math.round(d.probability * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{d.reasoning}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Clinical Brief Toggle ────────────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={13} /> Clinical Brief
                  </h3>
                  <div className="flex bg-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => setBriefView('pdf')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${briefView === 'pdf' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                    >
                      <FileText size={11} className="inline mr-1" />PDF
                    </button>
                    <button
                      onClick={() => setBriefView('fhir')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${briefView === 'fhir' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                    >
                      <FileJson size={11} className="inline mr-1" />FHIR R4
                    </button>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {briefView === 'pdf' ? (
                    <motion.ul
                      key="pdf"
                      variants={fadeIn} initial="hidden" animate="show"
                      className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-4 space-y-2"
                    >
                      {selected.pdfBriefSummary.map((line, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                          <span className="text-blue-400 mt-0.5 shrink-0">·</span>{line}
                        </li>
                      ))}
                    </motion.ul>
                  ) : (
                    <motion.pre
                      key="fhir"
                      variants={fadeIn} initial="hidden" animate="show"
                      className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 text-[11px] text-emerald-400 overflow-x-auto font-mono leading-relaxed"
                    >
                      {JSON.stringify(selected.fhirBundle, null, 2)}
                    </motion.pre>
                  )}
                </AnimatePresence>
              </section>

              {/* ── Vision AI Scans ──────────────────────────────────── */}
              {selected.scanImages.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ImageIcon size={13} /> Vision AI Findings
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selected.scanImages.map(img => (
                      <div key={img.id} className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${img.urgency === 'high' ? 'bg-red-400' : img.urgency === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                          <span className="text-xs font-semibold text-slate-300">{img.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{img.finding}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Tele-Consultation ────────────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Video size={13} /> Tele-Consultation
                </h3>
                <div className="bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden">
                  <div className="h-36 flex items-center justify-center bg-slate-950 relative">
                    {status === 'active' ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                          <User size={28} className="text-slate-400" />
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          <span className="text-[10px] text-red-300 font-bold">LIVE</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <Video size={28} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Call not started</p>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status === 'active' ? 'bg-red-500/20 text-red-300' : status === 'done' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                      {status === 'active' ? 'IN CALL' : status === 'done' ? 'COMPLETED' : 'PENDING'}
                    </div>
                    <div className="flex gap-2 ml-auto">
                      {status !== 'done' && (
                        <>
                          {status === 'active' ? (
                            <>
                              <button
                                onClick={() => setMuted(m => !m)}
                                className={`p-2.5 rounded-xl border transition-all ${muted ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
                              >
                                {muted ? <MicOff size={16} /> : <Mic size={16} />}
                              </button>
                              <button
                                onClick={handleEndCall}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                              >
                                <PhoneOff size={16} /> End Call
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={handleJoinCall}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            >
                              <Phone size={16} /> Join Call
                            </button>
                          )}
                        </>
                      )}
                      {status === 'done' && (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                          <CheckCircle2 size={16} /> Done
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Prescription & Notes ─────────────────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText size={13} /> Prescription & Action
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Medication</label>
                    <select
                      value={prescription}
                      onChange={e => setPrescription(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select medication…</option>
                      {MEDICATIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Clinical Notes</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Diagnosis, instructions, referral notes…"
                      rows={3}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
                    />
                  </div>
                  <button
                    onClick={handleSendToAsha}
                    disabled={sending || !prescription.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98]"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sending ? 'Sending…' : 'Send Instructions to ASHA'}
                  </button>
                </div>
              </section>

              {/* ── AI Triage Feedback (MLOps loop) ─────────────────── */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ThumbsUp size={13} /> AI Feedback — Actual Urgency
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Was the AI triage correct? Your input improves future model accuracy.
                </p>
                <div className="flex gap-2">
                  {(['GREEN', 'AMBER', 'RED'] as const).map(urg => {
                    const styles = {
                      GREEN: 'bg-emerald-600 hover:bg-emerald-700',
                      AMBER: 'bg-amber-500 hover:bg-amber-600',
                      RED:   'bg-red-600 hover:bg-red-700',
                    };
                    return (
                      <button
                        key={urg}
                        onClick={async () => {
                          await submitTriageFeedback(selected.sessionId, urg);
                          toast.success(`Feedback recorded: ${urg}`);
                        }}
                        className={`flex-1 ${styles[urg]} text-white text-xs font-bold py-2.5 rounded-xl transition-all active:scale-95`}
                      >
                        {urg === 'GREEN' ? '🟢 Self-Care' : urg === 'AMBER' ? '🟡 Urgent' : '🔴 Emergency'}
                      </button>
                    );
                  })}
                </div>
              </section>

            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
