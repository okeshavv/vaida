import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronLeft, Video, FileText, Clipboard, PhoneCall } from 'lucide-react';

export default function ConsultRoom() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-vaida-bg pb-24">
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-vaida-bg2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Teleconsult</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 space-y-6">
        {/* Jitsi Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-vaida-dark rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-vaida-teal/10 to-vaida-purple/10" />
          <div className="text-center z-10">
            <Video size={48} className="text-white/30 mx-auto mb-3" />
            <p className="text-white/60 text-sm font-medium">Jitsi Meet Integration</p>
            <p className="text-white/30 text-xs mt-1">Room: vaida-consult-abc123</p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-vaida-teal text-white p-4 rounded-2xl flex items-center gap-3"
          >
            <PhoneCall size={20} />
            <div className="text-left">
              <div className="text-sm font-semibold">Join Call</div>
              <div className="text-[10px] opacity-70">Start video consult</div>
            </div>
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white border border-vaida-bg2 p-4 rounded-2xl flex items-center gap-3"
          >
            <FileText size={20} className="text-vaida-purple" />
            <div className="text-left">
              <div className="text-sm font-semibold">View Brief</div>
              <div className="text-[10px] text-vaida-text-hint">AI pre-brief PDF</div>
            </div>
          </motion.button>
        </div>

        {/* Patient Brief Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-vaida-bg2 p-4 space-y-3"
        >
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Clipboard size={16} className="text-vaida-purple" /> Patient Brief
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-vaida-bg2">
              <span className="text-vaida-text-muted">Chief Complaint</span>
              <span className="font-medium">Severe Headache</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-vaida-bg2">
              <span className="text-vaida-text-muted">Duration</span>
              <span className="font-medium">48 hours</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-vaida-bg2">
              <span className="text-vaida-text-muted">Severity</span>
              <span className="font-medium">7/10</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-vaida-bg2">
              <span className="text-vaida-text-muted">AI Triage</span>
              <span className="font-bold text-urgency-amber">AMBER</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-vaida-text-muted">AI Hypothesis</span>
              <span className="font-medium text-xs">Migraine without aura (35%)</span>
            </div>
          </div>
        </motion.div>

        {/* Doctor Notes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-sm font-bold mb-2">Doctor Notes</h3>
          <textarea
            placeholder="Add consultation notes..."
            className="input-field min-h-[100px] resize-none"
          />
          <button className="btn-primary w-full mt-3">Complete Consultation</button>
        </motion.div>
      </div>
    </div>
  );
}
