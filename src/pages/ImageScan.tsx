import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { ImageType } from '../types';

// ─── Scan Type Options ───────────────────────────────────────
const scanTypes: { type: ImageType; emoji: string; label: string; hint: string }[] = [
  { type: 'wound', emoji: '🩹', label: 'Wound', hint: 'Cuts, burns, abrasions' },
  { type: 'rash', emoji: '🔴', label: 'Rash', hint: 'Skin irritation, hives' },
  { type: 'eye', emoji: '👁️', label: 'Eye', hint: 'Redness, discharge' },
  { type: 'skin', emoji: '🧴', label: 'Skin', hint: 'Lesions, discoloration' },
];

// ─── Mock GPT-4o Vision analysis payloads ────────────────────
interface VisionFinding {
  description: string;
  possibleConditions: string[];
  affectedArea: string;
  severity: 'mild' | 'moderate' | 'severe';
  confidenceScore: number;
}

const mockFindings: Record<ImageType, VisionFinding> = {
  wound: {
    description:
      'Superficial laceration approximately 4cm × 1.5cm. Wound edges clean with minimal erythema. No signs of active infection.',
    possibleConditions: ['Superficial laceration', 'Abrasion'],
    affectedArea: 'left forearm',
    severity: 'mild',
    confidenceScore: 0.89,
  },
  rash: {
    description:
      'Maculopapular rash on the anterior trunk. Raised erythematous lesions averaging 3-8mm diameter. Pattern consistent with contact dermatitis or viral exanthem.',
    possibleConditions: ['Contact Dermatitis', 'Viral Exanthem', 'Drug Rash'],
    affectedArea: 'chest and torso',
    severity: 'moderate',
    confidenceScore: 0.76,
  },
  eye: {
    description:
      'Bilateral conjunctival injection with watery discharge. Pupils equal, round, reactive. Pattern suggests viral conjunctivitis.',
    possibleConditions: ['Viral Conjunctivitis', 'Allergic Conjunctivitis'],
    affectedArea: 'both eyes',
    severity: 'mild',
    confidenceScore: 0.92,
  },
  skin: {
    description:
      'Hyperpigmented macule ~6mm diameter with irregular borders. Asymmetry noted laterally. Recommend dermoscopic evaluation.',
    possibleConditions: ['Melanocytic Nevus', 'Seborrheic Keratosis', 'Melanoma (rule out)'],
    affectedArea: 'upper back',
    severity: 'severe',
    confidenceScore: 0.71,
  },
};

// ─── Pipeline Steps (for animated loader) ────────────────────
const pipelineSteps = [
  'Uploading image securely…',
  'Running GPT-4o Vision analysis…',
  'Cross-referencing WHO clinical DB…',
];

// ─── Component ───────────────────────────────────────────────
export default function ImageScan() {
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [selectedType, setSelectedType] = useState<ImageType | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [pipelineIndex, setPipelineIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ── File handler ──────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, or WebP).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }, []);

  // ── Drag & drop ───────────────────────────────────────────
  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === dropZoneRef.current) setIsDragging(false);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  // ── Simulated GPT-4o Vision analysis (3-second pipeline) ──
  const runAnalysis = useCallback(async () => {
    if (!file || !selectedType) return;
    setIsAnalysing(true);
    setPipelineIndex(0);
    setError(null);

    try {
      // Step 1 — Upload (1s)
      await new Promise((r) => setTimeout(r, 1000));
      setPipelineIndex(1);

      // Step 2 — GPT-4o Vision (1.2s)
      await new Promise((r) => setTimeout(r, 1200));
      setPipelineIndex(2);

      // Step 3 — Cross-ref DB (0.8s)
      await new Promise((r) => setTimeout(r, 800));

      // Build mock data to pass downstream
      const finding = mockFindings[selectedType];
      const severityToBodyParts: Record<string, string[]> = {
        wound: ['left_arm'],
        rash: ['chest_front', 'abdomen_front'],
        eye: ['head_front'],
        skin: ['back_upper'],
      };

      // Navigate to /intake/severity with visual symptom data in router state
      navigate('/intake/severity', {
        state: {
          selectedParts: severityToBodyParts[selectedType] || ['chest_front'],
          source: 'vision_scan',
          visionAnalysis: {
            imageType: selectedType,
            ...finding,
          },
        },
      });
    } catch {
      setError('Analysis failed — please try again.');
      setIsAnalysing(false);
    }
  }, [file, selectedType, navigate]);

  // ── Reset ─────────────────────────────────────────────────
  const resetScan = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setError(null);
  }, [preview]);

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // ── Progress percentage for the loading bar ───────────────
  const progressPct = isAnalysing
    ? Math.min(95, Math.round(((pipelineIndex + 1) / pipelineSteps.length) * 90))
    : 0;

  /* ═══════════════════════════════════════════════════════════ */
  /*  RENDER                                                     */
  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 md:ml-56 flex flex-col">
      {/* ─── Header Bar ───────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 p-4">
        <h1 className="text-center text-xl font-bold text-slate-900">
          Vision AI Scanner
        </h1>
        <div className="flex justify-center mt-2">
          <div className="h-1 w-64 bg-slate-200 flex rounded">
            <div
              className="h-full bg-teal-700 rounded transition-all duration-500"
              style={{
                width: !selectedType
                  ? '25%'
                  : !preview
                    ? '50%'
                    : isAnalysing
                      ? '75%'
                      : '90%',
              }}
            />
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-1">
          Image Scan ({!selectedType ? '1' : !preview ? '2' : isAnalysing ? '3' : '4'}/4)
        </p>
      </div>

      {/* ─── Content ──────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto w-full p-6 md:p-10 flex-grow">
        {/* ── Powered-by badge ─────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold px-3 py-1 rounded-full">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            Powered by GPT-4o Vision AI
          </span>
        </div>

        <AnimatePresence mode="wait">
          {/* ══════ STEP 1 — Type Selector ══════════════════ */}
          {!selectedType && (
            <motion.div
              key="step-type"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <h2 className="text-3xl font-black text-center text-slate-900 mb-2">
                What do you need scanned?
              </h2>
              <p className="text-center text-slate-500 text-sm mb-8">
                Choose the type of symptom you'd like AI to analyse
              </p>

              <div className="grid grid-cols-2 gap-4">
                {scanTypes.map(({ type, emoji, label, hint }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className="bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-teal-400 hover:shadow-md transition-all group"
                  >
                    <div className="text-3xl mb-3">{emoji}</div>
                    <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {label}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{hint}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ══════ STEP 2 — Upload / Camera ═══════════════ */}
          {selectedType && !preview && !isAnalysing && (
            <motion.div
              key="step-upload"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <h2 className="text-3xl font-black text-center text-slate-900 mb-2">
                Upload or capture
              </h2>
              <p className="text-center text-slate-500 text-sm mb-8">
                Take a clear, well-lit photo of the affected area
              </p>

              {/* ── Drop Zone ──────── */}
              <div
                ref={dropZoneRef}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300
                  ${
                    isDragging
                      ? 'border-teal-500 bg-teal-50 scale-[1.01] shadow-lg'
                      : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-slate-50'
                  }`}
                role="button"
                tabIndex={0}
                aria-label="Drag and drop zone for image upload"
              >
                {/* Visual guide */}
                <div className="w-32 h-32 mx-auto relative mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                  {/* Corner brackets */}
                  <div className="absolute top-1.5 left-1.5 w-5 h-5 border-t-2 border-l-2 border-teal-600 rounded-tl" />
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 border-t-2 border-r-2 border-teal-600 rounded-tr" />
                  <div className="absolute bottom-1.5 left-1.5 w-5 h-5 border-b-2 border-l-2 border-teal-600 rounded-bl" />
                  <div className="absolute bottom-1.5 right-1.5 w-5 h-5 border-b-2 border-r-2 border-teal-600 rounded-br" />

                  <svg
                    className={`w-12 h-12 transition-colors ${isDragging ? 'text-teal-600' : 'text-slate-300'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <p className="font-semibold text-sm text-slate-700 mb-1">
                  {isDragging ? 'Drop your image here' : 'Drag & drop your image here'}
                </p>
                <p className="text-xs text-slate-400">
                  JPEG, PNG, WebP — up to 10 MB
                </p>
              </div>

              {/* ── Separator ──────── */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  or
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* ── Camera Button ──────── */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 bg-[#2A523C] hover:bg-[#1f3d2d] text-white font-bold py-4 rounded-xl shadow-md transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Open Device Camera
              </button>

              {/* Hidden inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </motion.div>
          )}

          {/* ══════ STEP 3 — Preview & Confirm ════════════ */}
          {preview && !isAnalysing && (
            <motion.div
              key="step-preview"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <h2 className="text-3xl font-black text-center text-slate-900 mb-6">
                Review image
              </h2>

              <div className="relative rounded-2xl overflow-hidden shadow-lg mb-6 border border-slate-200">
                <img
                  src={preview}
                  alt="Patient symptom image"
                  className="w-full h-72 object-cover"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                {/* Top badges */}
                <div className="absolute top-3 left-3 right-3 flex justify-between">
                  <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">
                    📷 {file ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : ''}
                  </span>
                  <button
                    onClick={resetScan}
                    className="bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full hover:bg-black/60 transition-colors"
                  >
                    ✕ Remove
                  </button>
                </div>

                {/* Bottom tag */}
                <div className="absolute bottom-3 left-3">
                  <span className="bg-teal-700/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full capitalize">
                    {selectedType} scan
                  </span>
                </div>
              </div>

              <button
                onClick={runAnalysis}
                className="w-full bg-[#2A523C] hover:bg-[#1f3d2d] text-white font-bold py-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Analyse with Vision AI
              </button>
            </motion.div>
          )}

          {/* ══════ STEP 4 — Analysis Loading ═════════════ */}
          {isAnalysing && (
            <motion.div
              key="step-analysing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              {/* Blurred preview thumbnail */}
              {preview && (
                <div className="relative rounded-2xl overflow-hidden h-40 w-full mb-6">
                  <img
                    src={preview}
                    alt="Analysing"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                  </div>
                </div>
              )}

              {/* Progress bar */}
              <div className="w-full mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900">
                    Analysing…
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {progressPct}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-teal-600 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Pipeline steps */}
              <div className="w-full space-y-3">
                {pipelineSteps.map((step, i) => {
                  const isActive = i === pipelineIndex;
                  const isComplete = i < pipelineIndex;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                        ${isActive ? 'bg-teal-50 border border-teal-200' : isComplete ? 'bg-slate-100 opacity-70' : 'opacity-30'}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                          ${isActive ? 'bg-teal-700 text-white' : isComplete ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-400'}`}
                      >
                        {isActive ? (
                          <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="opacity-25"
                            />
                            <path
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              className="opacity-75"
                            />
                          </svg>
                        ) : isComplete ? (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${isActive ? 'text-teal-800' : 'text-slate-600'}`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error banner ─────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm"
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Bottom Navigation ────────────────────────────── */}
      <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center md:px-10">
        <button
          onClick={() => {
            if (isAnalysing) return;
            if (preview) {
              resetScan();
            } else if (selectedType) {
              setSelectedType(null);
            } else {
              navigate(-1);
            }
          }}
          className="text-slate-600 font-bold px-6 py-3 hover:bg-slate-50 rounded-lg"
        >
          ← Back
        </button>
        <div className="text-xs text-slate-400">
          {selectedType && (
            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-full capitalize">
              {scanTypes.find((s) => s.type === selectedType)?.emoji}{' '}
              {selectedType}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
