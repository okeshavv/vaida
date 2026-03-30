/**
 * ─── VAIDA Centralized API Client ───────────────────────────
 *
 * Axios-based API layer mapped to the real backend endpoints.
 * Falls back to mock data when VITE_USE_MOCKS=true (default for dev).
 *
 * Base URL: VITE_API_URL (e.g. http://localhost:8000/api/v1)
 * ─────────────────────────────────────────────────────────────
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import type {
  IntakeRequest,
  IntakeResponse,
  VoiceIntakeResponse,
  TriageResult,
  TriageGuidance,
  ImageAnalysis,
  DoctorBrief,
  EpiCluster,
  StructuredSymptoms,
  OfflineSyncItem,
  SupportedLanguage,
  ImageType,
  UserRole,
} from '../types';
import { offlineQueue } from '../lib/offlineQueue';

// ─── Config ──────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

// ─── Axios Instance ──────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor — JWT injection ─────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('vaida_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor — token refresh + offline queue ────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 → attempt silent refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('vaida_refresh_token');
        if (refreshToken) {
          const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
            `${API_BASE}/auth/refresh`,
            { refresh_token: refreshToken },
          );
          localStorage.setItem('vaida_access_token', data.access_token);
          localStorage.setItem('vaida_refresh_token', data.refresh_token);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('vaida_access_token');
        localStorage.removeItem('vaida_refresh_token');
        localStorage.removeItem('vaida_user');
        window.location.href = '/login';
      }
    }

    // Offline: queue POST/PUT/PATCH for later sync
    if (
      !navigator.onLine &&
      originalRequest &&
      ['post', 'put', 'patch'].includes(originalRequest.method || '')
    ) {
      const queueItem: Omit<OfflineSyncItem, 'id'> = {
        patient_id: localStorage.getItem('vaida_patient_id') || 'unknown',
        endpoint: originalRequest.url || '',
        payload_json:
          typeof originalRequest.data === 'string'
            ? JSON.parse(originalRequest.data)
            : originalRequest.data || {},
        status: 'queued',
        retry_count: 0,
        created_offline_at: new Date().toISOString(),
        synced_at: null,
      };
      await offlineQueue.enqueue(queueItem);
      return { data: { offline_queued: true, message: 'Saved for sync' }, status: 202 };
    }

    return Promise.reject(error);
  },
);

// ─── Mock helper ─────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uuid = () => crypto.randomUUID();

// ─── Auth response types ──────────────────────────────────────
export interface LoginResult {
  access_token: string;
  refresh_token: string;
  user_id: string;
  role: UserRole;
}

export interface RegisterResult {
  user_id: string;
  token: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
export async function login(phone: string, otp: string): Promise<LoginResult> {
  if (USE_MOCKS) {
    await delay(800);
    const result: LoginResult = {
      access_token: 'mock_jwt_' + Date.now(),
      refresh_token: 'mock_refresh_' + Date.now(),
      user_id: uuid(),
      role: (localStorage.getItem('vaida_role') as UserRole) || 'patient',
    };
    _storeAuthData(result.access_token, result.refresh_token, result.user_id, result.role);
    return result;
  }
  const { data } = await api.post<LoginResult>('/auth/login', { phone, otp });
  _storeAuthData(data.access_token, data.refresh_token, data.user_id, data.role);
  return data;
}

export async function register(payload: {
  name: string;
  phone: string;
  password?: string;
  role: string;
  lang: SupportedLanguage;
  consent: boolean;
  district?: string;
}): Promise<RegisterResult> {
  if (USE_MOCKS) {
    await delay(1000);
    const result: RegisterResult = {
      user_id: uuid(),
      token: 'mock_jwt_' + Date.now(),
      message: 'Registration successful (mock)',
    };
    _storeAuthData(result.token, '', result.user_id, payload.role as UserRole);
    return result;
  }
  const { data } = await api.post<RegisterResult>('/auth/register', {
    ...payload,
    password: payload.password || '123456',
  });
  _storeAuthData(data.token, '', data.user_id, payload.role as UserRole);
  return data;
}

export async function refreshTokens(): Promise<{ access_token: string }> {
  const refreshToken = localStorage.getItem('vaida_refresh_token');
  const { data } = await api.post<{ access_token: string; refresh_token: string }>(
    '/auth/refresh',
    { refresh_token: refreshToken },
  );
  localStorage.setItem('vaida_access_token', data.access_token);
  if (data.refresh_token) localStorage.setItem('vaida_refresh_token', data.refresh_token);
  return data;
}

/** Persist all auth state to localStorage so AppContext picks it up. */
function _storeAuthData(
  accessToken: string,
  refreshToken: string,
  userId: string,
  role: UserRole,
) {
  localStorage.setItem('vaida_access_token', accessToken);
  if (refreshToken) localStorage.setItem('vaida_refresh_token', refreshToken);
  localStorage.setItem('vaida_patient_id', userId);
  localStorage.setItem('vaida_role', role);
  localStorage.setItem('userRole', role);
}

// ═══════════════════════════════════════════════════════════════
//  INTAKE / TRIAGE PIPELINE
// ═══════════════════════════════════════════════════════════════
export async function submitIntake(payload: IntakeRequest): Promise<IntakeResponse> {
  if (USE_MOCKS) {
    await delay(1200);
    return {
      session_id: uuid(),
      structured_symptoms: {
        chief_complaint: 'Headache with nausea',
        body_location: payload.body_location || 'head',
        symptom_character: ['throbbing'],
        duration_hours: payload.duration || 48,
        severity_1_10: payload.severity || 7,
        associated_symptoms: payload.symptoms || [],
        red_flag_features: {
          chest_pain_sweat: false,
          facial_droop: false,
          loss_of_consciousness: false,
          child_breathing_distress: false,
          sudden_severe_headache: false,
        },
        lang_detected: payload.lang || 'en',
      },
    };
  }
  const { data } = await api.post<IntakeResponse>('/intake', payload);
  return data;
}

/** Upload voice audio → Whisper STT → transcript. Backend: POST /intake/voice */
export async function submitVoice(
  audioBlob: Blob,
  langHint?: string,
): Promise<VoiceIntakeResponse> {
  if (USE_MOCKS) {
    await delay(2000);
    return {
      transcript: 'मुझे सिर में तेज़ दर्द हो रहा है, साथ में जी मिचलाना भी है',
      detected_lang: 'hi',
    };
  }
  const fd = new FormData();
  fd.append('audio_blob', audioBlob);
  if (langHint) fd.append('lang_hint', langHint);
  const { data } = await api.post<VoiceIntakeResponse>('/intake/voice', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function runTriage(
  sessionId: string,
  symptoms: StructuredSymptoms,
): Promise<TriageResult> {
  if (USE_MOCKS) {
    await delay(2500);
    const hasRedFlag = Object.values(symptoms.red_flag_features).some((v) => v);
    const urgency = hasRedFlag ? 'RED' : symptoms.severity_1_10 >= 8 ? 'AMBER' : 'GREEN';
    return {
      id: uuid(),
      session_id: sessionId,
      urgency,
      confidence_score: 0.72 + Math.random() * 0.25,
      differential_json: [
        { condition: 'Tension headache', probability: 0.45, reasoning: 'Bilateral pressure' },
        { condition: 'Migraine', probability: 0.35, reasoning: 'Throbbing, nausea' },
      ],
      rule_override: false,
      model_version: 'triage-v2.1.0',
      doctor_feedback: null,
      audit_tx_hash: '0x' + uuid().replace(/-/g, ''),
      created_at: new Date().toISOString(),
    };
  }
  const { data } = await api.post<TriageResult>('/triage', {
    session_id: sessionId,
    structured_symptoms: symptoms,
  });
  return data;
}

/** GET /triage/{sessionId}/result — patient-facing guidance text */
export async function getTriageGuidance(sessionId: string): Promise<TriageGuidance> {
  if (USE_MOCKS) {
    await delay(500);
    return {
      urgency: 'GREEN',
      guidance_text:
        'Rest in a quiet, dark room. Apply a cold compress. Take paracetamol if needed.',
      guidance_audio_url: null,
    };
  }
  const { data } = await api.get<TriageGuidance>(`/triage/${sessionId}/result`);
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  IMAGE / VISION AI
// ═══════════════════════════════════════════════════════════════
export async function analyseImage(
  sessionId: string,
  image: File,
  imageType: ImageType,
): Promise<ImageAnalysis> {
  if (USE_MOCKS) {
    await delay(3000);
    return {
      id: uuid(),
      session_id: sessionId,
      image_type: imageType,
      image_url_encrypted: 'encrypted_url_placeholder',
      findings: 'Superficial abrasion ~3cm × 2cm. Mild erythema. No infection signs.',
      diagnosis_category: 'traumatic',
      urgency_indicator: 'low',
      specialist_type: 'General Practitioner',
      created_at: new Date().toISOString(),
    };
  }
  const fd = new FormData();
  fd.append('session_id', sessionId);
  fd.append('image', image);
  fd.append('image_type', imageType);
  const { data } = await api.post<ImageAnalysis>('/image/analyse', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  DOCTOR BRIEF / CONSULT
// ═══════════════════════════════════════════════════════════════
export async function getPrebrief(sessionId: string): Promise<DoctorBrief> {
  if (USE_MOCKS) {
    await delay(1000);
    return {
      id: uuid(),
      session_id: sessionId,
      doctor_id: uuid(),
      pdf_url: null,
      fhir_json: null,
      ai_hypothesis: [
        { condition: 'Tension headache', probability: 0.5, reasoning: 'Pattern matches' },
      ],
      jitsi_room_id: 'vaida-consult-' + sessionId.slice(0, 8),
      consult_status: 'pending',
      consult_outcome_json: null,
      created_at: new Date().toISOString(),
    };
  }
  const { data } = await api.get<DoctorBrief>(`/brief/${sessionId}?format=json`);
  return data;
}

export async function initiateConsult(
  sessionId: string,
  doctorId?: string,
): Promise<{ jitsi_room_url: string; consult_id: string }> {
  if (USE_MOCKS) {
    await delay(800);
    return {
      jitsi_room_url: `https://meet.jit.si/vaida-consult-${sessionId.slice(0, 8)}`,
      consult_id: uuid(),
    };
  }
  const userId = doctorId || localStorage.getItem('vaida_patient_id') || '';
  const { data } = await api.post('/consult/initiate', {
    session_id: sessionId,
    doctor_id: userId,
  });
  return data;
}

export async function completeConsult(
  consultId: string,
  outcome: { diagnosis: string; prescription: string; follow_up: string },
): Promise<{ record_id: string }> {
  if (USE_MOCKS) {
    await delay(600);
    return { record_id: uuid() };
  }
  const { data } = await api.put(`/consult/${consultId}/complete`, outcome);
  return data;
}

/** GET /brief/queue — doctor's pending consultation list */
export async function getDoctorQueue(): Promise<unknown[]> {
  if (USE_MOCKS) {
    await delay(600);
    return [];
  }
  const { data } = await api.get('/brief/queue');
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  PATIENT HISTORY
// ═══════════════════════════════════════════════════════════════
export async function getPatientSessions(): Promise<
  Array<{ id: string; date: string; complaint: string; urgency: string | null; confidence: number | null }>
> {
  if (USE_MOCKS) {
    await delay(500);
    return [];
  }
  const { data } = await api.get('/intake/list');
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  ASHA WORKER
// ═══════════════════════════════════════════════════════════════
export async function getAshaQueue() {
  if (USE_MOCKS) {
    await delay(600);
    return [];
  }
  const { data } = await api.get('/intake/list');
  return data;
}

export async function syncAshaRecords(records: unknown[]) {
  if (USE_MOCKS) {
    await delay(1000);
    return { synced: records.length };
  }
  const { data } = await api.post('/intake/sync', { queued_sessions: records });
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  EPI ALERTS / CLUSTERS
// ═══════════════════════════════════════════════════════════════
export async function getEpiClusters(district?: string): Promise<EpiCluster[]> {
  if (USE_MOCKS) {
    await delay(800);
    return [
      { id: uuid(), district: 'Jaipur', lat: 26.9124, lng: 75.7873, symptom_cluster: ['fever', 'cough'], patient_count: 23, alert_level: 'high' },
      { id: uuid(), district: 'Jodhpur', lat: 26.2389, lng: 73.0243, symptom_cluster: ['diarrhea'], patient_count: 15, alert_level: 'moderate' },
      { id: uuid(), district: 'Kota', lat: 25.2138, lng: 75.8648, symptom_cluster: ['fever', 'joint pain'], patient_count: 31, alert_level: 'critical' },
    ];
  }
  const { data } = await api.get<EpiCluster[]>('/epi/clusters', {
    params: district ? { district } : undefined,
  });
  return data;
}

export async function getEpiDashboard(params?: { state?: string; date_from?: string; date_to?: string }) {
  if (USE_MOCKS) {
    await delay(500);
    return { geo_json: { type: 'FeatureCollection', features: [] }, timeseries: [] };
  }
  const { data } = await api.get('/epi/dashboard', { params });
  return data;
}

export async function publishEpiAlert(alert: { cluster_id: string }) {
  if (USE_MOCKS) {
    await delay(1000);
    return { alert_tx_hash: '0x' + uuid().replace(/-/g, '') };
  }
  const { data } = await api.post('/epi/alert', alert);
  return data;
}

/** POST /triage/feedback — doctor submits actual urgency for MLOps drift detection */
export async function submitTriageFeedback(
  sessionId: string,
  actualUrgency: 'GREEN' | 'AMBER' | 'RED',
): Promise<{ recorded: boolean }> {
  if (USE_MOCKS) {
    await delay(400);
    return { recorded: true };
  }
  const { data } = await api.post('/triage/feedback', {
    session_id: sessionId,
    actual_urgency: actualUrgency,
  });
  return data;
}

// ─── Export the raw Axios instance for advanced usage ──────────
export { api as axiosInstance };
export default api;
