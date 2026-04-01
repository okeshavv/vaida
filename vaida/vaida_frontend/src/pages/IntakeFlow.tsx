import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowLeft, ArrowRight, ChevronLeft, Check,
  Mic, MicOff, Loader2, AlertCircle
} from 'lucide-react';
import { useIntake } from '../hooks/useIntake';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type { IntakeStep } from '../types';

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 200 : -200, opacity: 0 }),
};

export default function IntakeFlow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const intake = useIntake();
  const voice = useVoiceRecorder();
  const [direction, setDirection] = useState(1);
  const [manualSymptoms, setManualSymptoms] = useState('');

  const handleNext = useCallback(() => {
    setDirection(1);
    intake.goNext();
  }, [intake]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    intake.goBack();
  }, [intake]);

  const handleConsentAgree = useCallback(() => {
    intake.giveConsent();
    setDirection(1);
    intake.goNext();
  }, [intake]);

  const handleSubmit = useCallback(async () => {
    try {
      const result = await intake.submitIntake();
      navigate(`/triage/${result.session_id}`, { state: { triageResult: result } });
    } catch {
      // error is in intake.error
    }
  }, [intake, navigate]);

  const handleVoiceToggle = useCallback(async () => {
    if (voice.isRecording) {
      voice.stopRecording();
      if (voice.audioBlob) {
        await intake.processVoice(voice.audioBlob);
      }
    } else {
      voice.startRecording();
    }
  }, [voice, intake]);

  const stepLabels: Record<IntakeStep, string> = {
    consent: t('intake.steps.consent'),
    voice: t('intake.steps.voice'),
    bodymap: t('intake.steps.bodymap'),
    severity: t('intake.steps.severity'),
    review: t('intake.steps.review'),
  };

  const steps: IntakeStep[] = ['consent', 'voice', 'bodymap', 'severity', 'review'];

  const bodyParts = [
    { id: 'head', label: 'Head', cx: 150, cy: 45 },
    { id: 'chest', label: 'Chest', cx: 150, cy: 130 },
    { id: 'abdomen', label: 'Abdomen', cx: 150, cy: 190 },
    { id: 'left-arm', label: 'Left Arm', cx: 90, cy: 160 },
    { id: 'right-arm', label: 'Right Arm', cx: 210, cy: 160 },
    { id: 'left-leg', label: 'Left Leg', cx: 125, cy: 290 },
    { id: 'right-leg', label: 'Right Leg', cx: 175, cy: 290 },
    { id: 'back', label: 'Back', cx: 150, cy: 150 },
  ];

  const commonSymptoms = [
    'Headache', 'Fever', 'Cough', 'Body Ache', 'Nausea',
    'Dizziness', 'Fatigue', 'Sore Throat', 'Rash', 'Breathing Difficulty',
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => intake.isFirstStep ? navigate(-1) : handleBack()} className="p-2 -ml-2 rounded-xl hover:bg-vaida-bg2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">{t('intake.title')}</h1>
        <div className="w-10" />
      </div>

      {/* Progress Bar */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-1 mb-2">
          {steps.map((step, i) => (
            <div key={step} className="flex-1 flex items-center gap-1">
              <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= intake.currentStepIndex ? 'bg-vaida-teal' : 'bg-vaida-bg2'
              }`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-vaida-text-muted text-center">
          {stepLabels[intake.state.currentStep]} ({intake.currentStepIndex + 1}/{steps.length})
        </p>
      </div>

      {/* Step Content */}
      <div className="flex-1 px-5 pb-32 overflow-y-auto relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={intake.state.currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {/* ── CONSENT STEP ── */}
            {intake.state.currentStep === 'consent' && (
              <div className="space-y-6">
                <div className="bg-vaida-teal-light rounded-2xl p-6 text-center">
                  <Shield className="mx-auto mb-3 text-vaida-teal" size={40} />
                  <h2 className="text-xl font-bold mb-2">{t('intake.consent.title')}</h2>
                  <p className="text-sm text-vaida-text-muted leading-relaxed">
                    {t('intake.consent.body')}
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleConsentAgree}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> {t('intake.consent.agree')}
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="btn-ghost w-full text-vaida-text-muted"
                  >
                    {t('intake.consent.disagree')}
                  </button>
                </div>
              </div>
            )}

            {/* ── VOICE STEP ── */}
            {intake.state.currentStep === 'voice' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-1">{t('intake.voice.title')}</h2>
                  <p className="text-sm text-vaida-text-muted">{t('intake.voice.subtitle')}</p>
                </div>

                {/* Voice Recorder */}
                <div className="flex flex-col items-center gap-6 py-6">
                  {/* Waveform */}
                  <div className="flex items-end gap-[3px] h-20 px-4">
                    {(voice.isRecording ? voice.waveformData : Array(40).fill(0.05)).map((val, i) => (
                      <motion.div
                        key={i}
                        className={`w-1.5 rounded-full ${voice.isRecording ? 'bg-vaida-teal' : 'bg-vaida-bg2'}`}
                        animate={{ height: Math.max(4, val * 80) }}
                        transition={{ duration: 0.1 }}
                      />
                    ))}
                  </div>

                  {/* Record Button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleVoiceToggle}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      voice.isRecording
                        ? 'bg-urgency-red animate-recording'
                        : 'bg-vaida-teal hover:bg-vaida-teal-mid'
                    }`}
                  >
                    {voice.isRecording ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
                  </motion.button>
                  <p className="text-sm font-medium text-vaida-text-muted">
                    {voice.isRecording ? t('intake.voice.recording') : t('intake.voice.tapToRecord')}
                  </p>
                  {voice.duration > 0 && (
                    <p className="text-xs text-vaida-text-hint">{voice.duration}s</p>
                  )}
                </div>

                {/* Transcript */}
                {intake.state.voiceTranscript && (
                  <div className="bg-vaida-teal-light rounded-2xl p-4">
                    <p className="text-xs text-vaida-teal font-semibold mb-1">Transcript</p>
                    <p className="text-sm">{intake.state.voiceTranscript}</p>
                  </div>
                )}

                {/* Manual Input */}
                <div className="text-center">
                  <p className="text-xs text-vaida-text-hint mb-3">{t('intake.voice.or')}</p>
                  <textarea
                    placeholder={t('intake.voice.typeManually')}
                    value={manualSymptoms}
                    onChange={(e) => {
                      setManualSymptoms(e.target.value);
                      intake.setVoiceTranscript(e.target.value);
                    }}
                    className="input-field min-h-[80px] resize-none"
                  />
                </div>

                {/* Quick Symptom Tags */}
                <div className="flex flex-wrap gap-2">
                  {commonSymptoms.map(symptom => (
                    <button
                      key={symptom}
                      onClick={() => {
                        const newSymptoms = intake.state.symptoms.includes(symptom)
                          ? intake.state.symptoms.filter(s => s !== symptom)
                          : [...intake.state.symptoms, symptom];
                        intake.setSymptoms(newSymptoms);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        intake.state.symptoms.includes(symptom)
                          ? 'bg-vaida-teal text-white border-vaida-teal'
                          : 'bg-white text-vaida-text-muted border-vaida-bg2 hover:border-vaida-teal-mid'
                      }`}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── BODY MAP STEP ── */}
            {intake.state.currentStep === 'bodymap' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-1">{t('intake.bodyMap.title')}</h2>
                  <p className="text-sm text-vaida-text-muted">{t('intake.bodyMap.subtitle')}</p>
                </div>

                <div className="flex justify-center">
                  <svg viewBox="0 0 300 400" className="w-64 h-80">
                    {/* Simple body outline */}
                    <ellipse cx="150" cy="42" rx="28" ry="32" fill="#E8E5DC" stroke="#CCC" strokeWidth="1.5" />
                    <rect x="120" y="72" width="60" height="80" rx="10" fill="#E8E5DC" stroke="#CCC" strokeWidth="1.5" />
                    <rect x="70" y="80" width="50" height="15" rx="7" fill="#E8E5DC" stroke="#CCC" strokeWidth="1.5" />
                    <rect x="180" y="80" width="50" height="15" rx="7" fill="#E8E5DC" stroke="#CCC" strokeWidth="1.5" />
                    <rect x="70" y="95" width="16" height="80" rx="8" fill="#E8E5DC" stroke="#CCC" strokeWidth="1.5" />
                    <rect x="214" y="95" width="16" height="80" rx="8" fill="#E8E5DC" stroke="#CCC" strokeWidth="1.5" />
                    <rect x="120" y="152" width="60" height="70" rx="8" fill="#E8E5DC" stroke="#CCC" strokeWidth="1.5" />
                    <rect x="118" y="222" width="25" height="100" rx="8" fill="#E8E5DC" stroke="#CCC" strokeWidth="1.5" />
                    <rect x="157" y="222" width="25" height="100" rx="8" fill="#E8E5DC" stroke="#CCC" strokeWidth="1.5" />

                    {/* Touchable regions */}
                    {bodyParts.map(part => (
                      <g key={part.id} onClick={() => intake.toggleBodyPart(part.id)} className="cursor-pointer">
                        <circle
                          cx={part.cx}
                          cy={part.cy}
                          r={22}
                          fill={intake.state.selectedBodyParts.includes(part.id)
                            ? 'rgba(29, 158, 117, 0.35)'
                            : 'transparent'
                          }
                          stroke={intake.state.selectedBodyParts.includes(part.id) ? '#1D9E75' : 'transparent'}
                          strokeWidth="2"
                          className="transition-all duration-200"
                        />
                        {intake.state.selectedBodyParts.includes(part.id) && (
                          <circle cx={part.cx} cy={part.cy} r="22" fill="none" stroke="#1D9E75" strokeWidth="2" opacity="0.5">
                            <animate attributeName="r" from="22" to="30" dur="1.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                          </circle>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>

                {intake.state.selectedBodyParts.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {intake.state.selectedBodyParts.map(part => (
                      <span key={part} className="px-3 py-1 bg-vaida-teal text-white text-xs rounded-full font-medium capitalize">
                        {bodyParts.find(b => b.id === part)?.label || part}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SEVERITY STEP ── */}
            {intake.state.currentStep === 'severity' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-1">{t('intake.severity.title')}</h2>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-sm font-semibold text-vaida-text mb-3 block">{t('intake.severity.duration')}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 6, 12, 24, 48, 72, 120, 168].map(h => (
                      <button
                        key={h}
                        onClick={() => intake.setDuration(h)}
                        className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                          intake.state.durationHours === h
                            ? 'border-vaida-teal bg-vaida-teal-light text-vaida-teal'
                            : 'border-vaida-bg2 text-vaida-text-muted hover:border-vaida-teal-mid/30'
                        }`}
                      >
                        {h < 24 ? `${h}h` : `${h/24}d`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pain Level */}
                <div>
                  <label className="text-sm font-semibold text-vaida-text mb-3 block">
                    {t('intake.severity.pain')}: <span className="text-vaida-teal-mid">{intake.state.severityScore}/10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={intake.state.severityScore}
                    onChange={(e) => intake.setSeverity(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #639922 0%, #BA7517 50%, #E24B4A 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-urgency-green">{t('intake.severity.mild')}</span>
                    <span className="text-xs text-urgency-red">{t('intake.severity.severe')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── REVIEW STEP ── */}
            {intake.state.currentStep === 'review' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-center mb-2">{t('intake.review.title')}</h2>

                <div className="bg-vaida-bg rounded-2xl p-4 space-y-3">
                  {intake.state.symptoms.length > 0 && (
                    <div>
                      <p className="text-xs text-vaida-text-hint font-semibold uppercase tracking-wider">{t('intake.review.symptoms')}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {intake.state.symptoms.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-vaida-purple-light text-vaida-purple text-xs rounded-full font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {intake.state.voiceTranscript && (
                    <div>
                      <p className="text-xs text-vaida-text-hint font-semibold uppercase tracking-wider">Voice Input</p>
                      <p className="text-sm mt-1">{intake.state.voiceTranscript}</p>
                    </div>
                  )}

                  {intake.state.selectedBodyParts.length > 0 && (
                    <div>
                      <p className="text-xs text-vaida-text-hint font-semibold uppercase tracking-wider">{t('intake.review.location')}</p>
                      <p className="text-sm mt-1 capitalize">{intake.state.selectedBodyParts.join(', ')}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-vaida-text-hint font-semibold uppercase tracking-wider">{t('intake.review.duration')}</p>
                      <p className="text-sm mt-1 font-medium">{intake.state.durationHours}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-vaida-text-hint font-semibold uppercase tracking-wider">{t('intake.review.severity')}</p>
                      <p className="text-sm mt-1 font-medium">{intake.state.severityScore}/10</p>
                    </div>
                  </div>
                </div>

                {intake.error && (
                  <div className="bg-urgency-red-bg text-urgency-red p-3 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle size={16} /> {intake.error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={intake.isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {intake.isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> {t('intake.review.submitting')}</>
                  ) : (
                    <>{t('intake.review.submit')}</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Nav Buttons */}
      {intake.state.currentStep !== 'consent' && intake.state.currentStep !== 'review' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-vaida-bg2 p-4 flex gap-3 safe-bottom">
          {!intake.isFirstStep && (
            <button onClick={handleBack} className="btn-ghost flex-1 flex items-center justify-center gap-1">
              <ArrowLeft size={16} /> {t('common.back')}
            </button>
          )}
          <button onClick={handleNext} className="btn-primary flex-1 flex items-center justify-center gap-1">
            {t('common.next')} <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
