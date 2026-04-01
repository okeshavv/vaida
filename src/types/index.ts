// ─── Patient / User ──────────────────────────────────────────
export type UserRole = 'patient' | 'asha' | 'doctor';

export interface Patient {
  id: string; // UUID
  phone_hash: string;
  name_encrypted: string;
  lang_preference: SupportedLanguage;
  role: UserRole;
  district: string;
  consent_tx_hash: string | null;
  created_at: string; // ISO timestamp
  last_active: string | null;
}

// ─── Intake Session ──────────────────────────────────────────
export type IntakeSource = 'voice' | 'icon' | 'mixed';

export interface RedFlagFeatures {
  chest_pain_sweat: boolean;
  facial_droop: boolean;
  loss_of_consciousness: boolean;
  child_breathing_distress: boolean;
  sudden_severe_headache: boolean;
}

export interface StructuredSymptoms {
  chief_complaint: string;
  body_location: string;
  symptom_character: Array<'sharp' | 'dull' | 'burning' | 'throbbing' | 'tight' | 'stabbing'>;
  duration_hours: number;
  severity_1_10: number;
  associated_symptoms: string[];
  red_flag_features: RedFlagFeatures;
  lang_detected: string;
}

export interface IntakeSession {
  id: string; // UUID
  patient_id: string;
  voice_transcript: string | null;
  body_location: string | null;
  symptoms_json: StructuredSymptoms;
  duration_hours: number | null;
  severity_score: number | null;
  lang_detected: string | null;
  source: IntakeSource;
  offline_queued: boolean;
  created_at: string;
}

export interface IntakeRequest {
  patient_id: string;
  voice_transcript?: string;
  body_location?: string;
  symptoms: string[];
  duration?: number;
  severity?: number;
  lang?: SupportedLanguage;
}

export interface IntakeResponse {
  session_id: string;
  structured_symptoms: StructuredSymptoms;
}

export interface VoiceIntakeResponse {
  transcript: string;
  detected_lang: SupportedLanguage;
}

// ─── Triage ──────────────────────────────────────────────────
export type UrgencyLevel = 'GREEN' | 'AMBER' | 'RED';

export interface TriageResult {
  id: string;
  session_id: string;
  urgency: UrgencyLevel;
  confidence_score: number;
  differential_json: DifferentialDiagnosis[];
  rule_override: boolean;
  model_version: string;
  doctor_feedback: DoctorFeedback | null;
  audit_tx_hash: string | null;
  created_at: string;
}

export interface DifferentialDiagnosis {
  condition: string;
  probability: number;
  reasoning: string;
}

export interface TriageGuidance {
  urgency: UrgencyLevel;
  guidance_text: string;
  guidance_audio_url: string | null;
}

export interface DoctorFeedback {
  doctor_urgency: UrgencyLevel;
  notes: string;
  agreed_with_ai: boolean;
}

// ─── Image Analysis ──────────────────────────────────────────
export type ImageType = 'wound' | 'rash' | 'eye' | 'skin';
export type UrgencyIndicator = 'low' | 'medium' | 'high';

export interface ImageAnalysis {
  id: string;
  session_id: string;
  image_type: ImageType;
  image_url_encrypted: string;
  findings: string;
  diagnosis_category: 'inflammatory' | 'infectious' | 'traumatic' | 'other';
  urgency_indicator: UrgencyIndicator;
  specialist_type: string;
  created_at: string;
}

// ─── Doctor Brief ────────────────────────────────────────────
export type ConsultStatus = 'pending' | 'active' | 'done';

export interface DoctorBrief {
  id: string;
  session_id: string;
  doctor_id: string;
  pdf_url: string | null;
  fhir_json: Record<string, unknown> | null;
  ai_hypothesis: DifferentialDiagnosis[];
  jitsi_room_id: string | null;
  consult_status: ConsultStatus;
  consult_outcome_json: ConsultOutcome | null;
  created_at: string;
}

export interface ConsultOutcome {
  diagnosis: string;
  prescription: string;
  follow_up: string;
}

// ─── Epidemiological ─────────────────────────────────────────
export interface EpiEvent {
  id: string;
  district: string;
  symptom_cluster: string[];
  patient_count: number;
  window_start: string;
  window_end: string;
  alert_triggered: boolean;
  alert_tx_hash: string | null;
  zkp_proof_hash: string | null;
}

export interface EpiCluster {
  id: string;
  district: string;
  lat: number;
  lng: number;
  symptom_cluster: string[];
  patient_count: number;
  alert_level: 'low' | 'moderate' | 'high' | 'critical';
}

// ─── Offline Sync Queue ──────────────────────────────────────
export type SyncStatus = 'queued' | 'syncing' | 'synced' | 'failed';

export interface OfflineSyncItem {
  id: string;
  patient_id: string;
  endpoint: string;
  payload_json: Record<string, unknown>;
  status: SyncStatus;
  retry_count: number;
  created_offline_at: string;
  synced_at: string | null;
}

// ─── Auth ────────────────────────────────────────────────────
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  role: UserRole;
  lang: SupportedLanguage;
  consent: boolean;
}

export interface LoginRequest {
  phone: string;
  otp: string;
}

export interface ConsentRequest {
  patient_id: string;
  consent_type: string;
  lang: SupportedLanguage;
}

// ─── Localisation ────────────────────────────────────────────
export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'gu' | 'kn';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  script: string;
}

// ─── UI State ────────────────────────────────────────────────
export type IntakeStep = 'consent' | 'voice' | 'bodymap' | 'severity' | 'review';

export interface IntakeFlowState {
  currentStep: IntakeStep;
  consent: boolean;
  voiceTranscript: string | null;
  selectedBodyParts: string[];
  symptoms: string[];
  durationHours: number;
  severityScore: number;
  language: SupportedLanguage;
  sessionId: string | null;
}
