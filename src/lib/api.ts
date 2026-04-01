/**
 * Forwarding shim — all calls delegate to the canonical Axios client.
 * Kept for backwards-compatibility with imports in Login.tsx / useIntake.ts.
 */
import type { AuthTokens, IntakeRequest, IntakeResponse, VoiceIntakeResponse, TriageResult, TriageGuidance, ImageAnalysis, DoctorBrief, EpiCluster, StructuredSymptoms } from '../types';
import {
    login,
    register,
    submitIntake,
    submitVoice,
    runTriage,
    getTriageGuidance,
    analyseImage,
    getPrebrief,
    getEpiClusters,
} from '../api/client';

export async function apiLogin(phone: string, otp: string): Promise<AuthTokens> {
    return login(phone, otp) as Promise<AuthTokens>;
}

export async function apiRegister(data: { name: string; phone: string; role: string; lang: string; consent: boolean }): Promise<AuthTokens> {
    const result = await register({ ...data, lang: data.lang as import('../types').SupportedLanguage });
    return { access_token: result.token, refresh_token: '' };
}

export async function apiSubmitIntake(data: IntakeRequest): Promise<IntakeResponse> {
    return submitIntake(data);
}

export async function apiVoiceIntake(audioBlob: Blob, langHint?: string): Promise<VoiceIntakeResponse> {
    return submitVoice(audioBlob, langHint);
}

export async function apiRunTriage(sessionId: string, symptoms: StructuredSymptoms): Promise<TriageResult> {
    return runTriage(sessionId, symptoms);
}

export async function apiGetTriageGuidance(sessionId: string): Promise<TriageGuidance> {
    return getTriageGuidance(sessionId);
}

export async function apiAnalyseImage(sessionId: string, image: File, imageType: string): Promise<ImageAnalysis> {
    return analyseImage(sessionId, image, imageType as import('../types').ImageType);
}

export async function apiGetBrief(sessionId: string): Promise<DoctorBrief> {
    return getPrebrief(sessionId);
}

export async function apiGetEpiClusters(district?: string): Promise<EpiCluster[]> {
    return getEpiClusters(district);
}