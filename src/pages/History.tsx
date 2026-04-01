import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import type { UrgencyLevel } from '../types';

interface HistorySession {
  id: string;
  date: string;
  complaint: string;
  urgency: UrgencyLevel;
  source: string;
  confidence: number;
}

const mockHistory: HistorySession[] = [
  { id: '1', date: '2026-03-28', complaint: 'Headache & Nausea', urgency: 'GREEN', source: 'voice', confidence: 0.89 },
  { id: '2', date: '2026-03-25', complaint: 'Skin Rash — Left Arm', urgency: 'AMBER', source: 'image', confidence: 0.76 },
  { id: '3', date: '2026-03-20', complaint: 'Chest Discomfort', urgency: 'RED', source: 'mixed', confidence: 0.94 },
  { id: '4', date: '2026-03-15', complaint: 'Persistent Cough', urgency: 'AMBER', source: 'voice', confidence: 0.71 },
  { id: '5', date: '2026-03-10', complaint: 'Mild Fever & Body Ache', urgency: 'GREEN', source: 'icon', confidence: 0.85 },
  { id: '6', date: '2026-03-05', complaint: 'Eye Irritation', urgency: 'GREEN', source: 'image', confidence: 0.92 },
];

export default function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const urgencyStyles = {
    GREEN: { bg: 'bg-urgency-green-bg', text: 'text-urgency-green', dot: 'bg-urgency-green', label: 'Self-Care' },
    AMBER: { bg: 'bg-urgency-amber-bg', text: 'text-urgency-amber', dot: 'bg-urgency-amber', label: 'Teleconsult' },
    RED: { bg: 'bg-urgency-red-bg', text: 'text-urgency-red', dot: 'bg-urgency-red', label: 'Emergency' },
  };

  return (
    <div className="min-h-screen bg-vaida-bg pb-24">
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-vaida-bg2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">{t('nav.history')}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5">
        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-vaida-bg2" />

          <div className="space-y-4">
            {mockHistory.map((session, i) => {
              const style = urgencyStyles[session.urgency];
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="relative pl-10"
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-3 top-5 w-3 h-3 rounded-full ${style.dot} border-2 border-white shadow-sm`} />

                  <div
                    className="bg-white rounded-2xl p-4 border border-vaida-bg2 cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => navigate('/triage/' + session.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{session.complaint}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-vaida-text-hint" />
                          <span className="text-xs text-vaida-text-hint">{session.date}</span>
                          <span className="text-[10px] text-vaida-text-hint px-1.5 py-0.5 bg-vaida-bg rounded-full capitalize">{session.source}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        <ChevronRight size={16} className="text-vaida-text-hint" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-[10px] text-vaida-text-hint">Confidence:</div>
                      <div className="flex-1 h-1 bg-vaida-bg2 rounded-full overflow-hidden max-w-[80px]">
                        <div className={`h-full ${style.dot} rounded-full`} style={{ width: `${session.confidence * 100}%` }} />
                      </div>
                      <div className="text-[10px] font-medium text-vaida-text-muted">{Math.round(session.confidence * 100)}%</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
