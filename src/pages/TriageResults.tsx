import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getTriageGuidance, initiateConsult } from '../api/client';
import type { TriageResult, TriageGuidance } from '../types';

export default function TriageResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: sessionId } = useParams<{ id: string }>();

  const triageResult: TriageResult | null = location.state?.triageResult ?? null;
  const urgency = triageResult?.urgency ?? 'GREEN';

  const [guidance, setGuidance] = useState<TriageGuidance | null>(null);
  const [loadingGuidance, setLoadingGuidance] = useState(true);
  const [startingConsult, setStartingConsult] = useState(false);

  useEffect(() => {
    const sid = sessionId || triageResult?.session_id;
    if (!sid) { setLoadingGuidance(false); return; }
    getTriageGuidance(sid)
      .then(setGuidance)
      .catch(() => {})
      .finally(() => setLoadingGuidance(false));
  }, [sessionId, triageResult?.session_id]);

  const handleStartConsult = async () => {
    const sid = sessionId || triageResult?.session_id;
    if (!sid) return;
    setStartingConsult(true);
    try {
      const { jitsi_room_url } = await initiateConsult(sid);
      window.open(jitsi_room_url, '_blank');
    } catch {
      // handled
    } finally {
      setStartingConsult(false);
    }
  };

  const theme = {
    RED: {
      border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700',
      badgeBg: 'bg-red-100', btn: 'bg-red-600 hover:bg-red-700',
      label: 'EMERGENCY', title: 'Seek Immediate Care',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10 text-red-600">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    AMBER: {
      border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700',
      badgeBg: 'bg-amber-100', btn: 'bg-amber-600 hover:bg-amber-700',
      label: 'URGENT', title: 'Consultation Required',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10 text-amber-500">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    GREEN: {
      border: 'border-teal-500', bg: 'bg-teal-50', text: 'text-teal-700',
      badgeBg: 'bg-teal-100', btn: 'bg-teal-600 hover:bg-teal-700',
      label: 'SELF-CARE', title: 'Self-Care Instructions',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10 text-teal-600">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  }[urgency];

  return (
    <div className="min-h-screen bg-[#F9F9F9] md:ml-56 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <header className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VAIDA Triage Report</h1>
            <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString()}</p>
          </div>
          <button onClick={() => navigate('/')} className="text-sm font-semibold text-gray-600 hover:text-black">
            ✕ Close
          </button>
        </header>

        {/* Main Clinical Card */}
        <div className={`bg-white border-t-4 ${theme.border} rounded-xl shadow-sm border-x border-b border-gray-200 overflow-hidden mb-6`}>
          <div className="p-6 md:p-8">

            {/* Urgency header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3 rounded-full ${theme.bg}`}>{theme.icon}</div>
              <div>
                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${theme.badgeBg} ${theme.text}`}>
                  {theme.label} ({urgency})
                </span>
                <h2 className="text-xl font-bold text-gray-900">{theme.title}</h2>
                {triageResult && (
                  <p className="text-xs text-gray-500 mt-1">
                    AI Confidence: {(triageResult.confidence_score * 100).toFixed(0)}% · {triageResult.model_version}
                  </p>
                )}
              </div>
            </div>

            {/* Guidance text */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 text-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recommended Action</h3>
              {loadingGuidance ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 size={14} className="animate-spin" /> Loading guidance…
                </div>
              ) : (
                <p className="text-gray-800 leading-relaxed">
                  {guidance?.guidance_text ?? 'Follow up with a healthcare provider as needed.'}
                </p>
              )}
            </div>

            {/* Differential diagnoses */}
            {triageResult?.differential_json && triageResult.differential_json.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Differential Diagnoses</h3>
                <ol className="space-y-2">
                  {triageResult.differential_json.map((d, i) => (
                    <li key={d.condition} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-900">{i + 1}. {d.condition}</span>
                        <span className="text-[10px] font-mono text-gray-500 tabular-nums shrink-0">
                          {(d.probability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug">{d.reasoning}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Action button */}
            {(urgency === 'AMBER' || urgency === 'RED') ? (
              <button
                onClick={handleStartConsult}
                disabled={startingConsult}
                className={`w-full text-white font-bold py-3 px-4 rounded-lg text-sm shadow-sm transition-colors flex items-center justify-center gap-2 ${theme.btn}`}
              >
                {startingConsult && <Loader2 size={16} className="animate-spin" />}
                {urgency === 'RED' ? 'Start Emergency Consultation' : 'Book Tele-Consult'}
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className={`w-full text-white font-bold py-3 px-4 rounded-lg text-sm shadow-sm transition-colors ${theme.btn}`}
              >
                View Care Guide
              </button>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-slate-800 text-slate-300 p-4 rounded-lg text-[10px] leading-relaxed flex items-start gap-3">
          <span className="text-lg">ℹ️</span>
          <div>
            <strong className="text-white">DISCLAIMER:</strong> This is an AI-generated guidance brief and does not constitute a definitive medical diagnosis. Always consult a qualified healthcare professional.
            <br />
            <span className="opacity-60 mt-1 block">
              Session ID: {sessionId || triageResult?.session_id || '—'} · Model: {triageResult?.model_version ?? 'triage-v2.1.0'} · Protocol: FHIR R4
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
