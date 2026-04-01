import { useState, useCallback } from 'react';
import type { IntakeFlowState, IntakeStep, SupportedLanguage, StructuredSymptoms, TriageResult } from '../types';
import { apiSubmitIntake, apiVoiceIntake, apiRunTriage } from '../lib/api';

const INITIAL_STATE: IntakeFlowState = {
  currentStep: 'consent',
  consent: false,
  voiceTranscript: null,
  selectedBodyParts: [],
  symptoms: [],
  durationHours: 0,
  severityScore: 5,
  language: 'en',
  sessionId: null,
};

const STEP_ORDER: IntakeStep[] = ['consent', 'voice', 'bodymap', 'severity', 'review'];

export function useIntake() {
  const [state, setState] = useState<IntakeFlowState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentStepIndex = STEP_ORDER.indexOf(state.currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;
  const progress = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  const goNext = useCallback(() => {
    setState(s => {
      const idx = STEP_ORDER.indexOf(s.currentStep);
      if (idx < STEP_ORDER.length - 1) return { ...s, currentStep: STEP_ORDER[idx + 1] };
      return s;
    });
  }, []);

  const goBack = useCallback(() => {
    setState(s => {
      const idx = STEP_ORDER.indexOf(s.currentStep);
      if (idx > 0) return { ...s, currentStep: STEP_ORDER[idx - 1] };
      return s;
    });
  }, []);

  const goToStep = useCallback((step: IntakeStep) => {
    setState(s => ({ ...s, currentStep: step }));
  }, []);

  const giveConsent = useCallback(() => {
    setState(s => ({ ...s, consent: true }));
  }, []);

  const setVoiceTranscript = useCallback((transcript: string) => {
    setState(s => ({ ...s, voiceTranscript: transcript }));
  }, []);

  const toggleBodyPart = useCallback((part: string) => {
    setState(s => ({
      ...s,
      selectedBodyParts: s.selectedBodyParts.includes(part)
        ? s.selectedBodyParts.filter(p => p !== part)
        : [...s.selectedBodyParts, part],
    }));
  }, []);

  const setSymptoms = useCallback((symptoms: string[]) => {
    setState(s => ({ ...s, symptoms }));
  }, []);

  const setDuration = useCallback((hours: number) => {
    setState(s => ({ ...s, durationHours: hours }));
  }, []);

  const setSeverity = useCallback((score: number) => {
    setState(s => ({ ...s, severityScore: score }));
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setState(s => ({ ...s, language: lang }));
  }, []);

  const processVoice = useCallback(async (audioBlob: Blob) => {
    try {
      const result = await apiVoiceIntake(audioBlob, state.language);
      setState(s => ({ ...s, voiceTranscript: result.transcript }));
      return result;
    } catch (err) {
      setError('Voice processing failed');
      throw err;
    }
  }, [state.language]);

  const submitIntake = useCallback(async (): Promise<TriageResult> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. POST /intake
      const intakeRes = await apiSubmitIntake({
        patient_id: localStorage.getItem('vaida_user_id') || 'demo-patient',
        voice_transcript: state.voiceTranscript || undefined,
        body_location: state.selectedBodyParts[0],
        symptoms: state.symptoms.length > 0 ? state.symptoms : ['headache'],
        duration: state.durationHours,
        severity: state.severityScore,
        lang: state.language,
      });

      setState(s => ({ ...s, sessionId: intakeRes.session_id }));

      // 2. POST /triage
      const triage = await apiRunTriage(intakeRes.session_id, intakeRes.structured_symptoms);
      setTriageResult(triage);

      return triage;
    } catch (err) {
      setError('Triage failed. Please try again.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [state]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setTriageResult(null);
    setError(null);
  }, []);

  return {
    state,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    progress,
    isSubmitting,
    triageResult,
    error,
    goNext,
    goBack,
    goToStep,
    giveConsent,
    setVoiceTranscript,
    toggleBodyPart,
    setSymptoms,
    setDuration,
    setSeverity,
    setLanguage,
    processVoice,
    submitIntake,
    reset,
  };
}
