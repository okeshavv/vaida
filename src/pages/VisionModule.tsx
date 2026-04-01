import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, ChevronLeft, Loader2, AlertCircle, CheckCircle2, Crosshair } from 'lucide-react';
import { apiAnalyseImage } from '../lib/api';
import type { ImageAnalysis, ImageType } from '../types';

const imageTypes: { type: ImageType; emoji: string }[] = [
  { type: 'wound', emoji: '🩹' },
  { type: 'rash', emoji: '🔴' },
  { type: 'eye', emoji: '👁️' },
  { type: 'skin', emoji: '🧴' },
];

export default function VisionModule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<ImageType | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [result, setResult] = useState<ImageAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, []);

  const handleAnalyse = useCallback(async () => {
    if (!file || !selectedType) return;
    setIsAnalysing(true);
    setError(null);
    try {
      const res = await apiAnalyseImage('demo-session', file, selectedType);
      setResult(res);
    } catch {
      setError('Analysis failed. Please try again.');
    } finally {
      setIsAnalysing(false);
    }
  }, [file, selectedType]);

  const urgencyColors = {
    low: 'text-urgency-green bg-urgency-green-bg',
    medium: 'text-urgency-amber bg-urgency-amber-bg',
    high: 'text-urgency-red bg-urgency-red-bg',
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-vaida-bg2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">{t('vision.title')}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 space-y-6">
        {/* Image Type Selector */}
        <div>
          <p className="text-sm font-semibold mb-3">{t('vision.selectType')}</p>
          <div className="grid grid-cols-4 gap-2">
            {imageTypes.map(({ type, emoji }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selectedType === type
                    ? 'border-vaida-teal bg-vaida-teal-light'
                    : 'border-vaida-bg2 hover:border-vaida-teal-mid/30'
                }`}
              >
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-xs font-medium capitalize">{t(`vision.${type}`)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Camera / Upload Area */}
        {selectedType && !preview && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="border-2 border-dashed border-vaida-bg2 rounded-2xl p-8 text-center">
              {/* Camera overlay guide */}
              <div className="w-48 h-48 mx-auto relative mb-4 bg-vaida-bg rounded-2xl flex items-center justify-center">
                <Crosshair size={64} className="text-vaida-text-hint/20" />
                <div className="absolute inset-4 border-2 border-vaida-teal rounded-xl" />
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-vaida-teal" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-vaida-teal" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-vaida-teal" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-vaida-teal" />
              </div>

              <p className="text-sm text-vaida-text-muted mb-4">{t('vision.subtitle')}</p>

              <div className="flex gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Camera size={18} /> {t('vision.capture')}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-ghost flex-1 flex items-center justify-center gap-2 border border-vaida-bg2"
                >
                  <Upload size={18} /> {t('vision.upload')}
                </button>
              </div>
            </div>

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

        {/* Image Preview */}
        {preview && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt="Captured" className="w-full h-64 object-cover" />
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => { setPreview(null); setFile(null); setResult(null); }}
                  className="bg-black/50 text-white text-xs px-3 py-1 rounded-full"
                >
                  Retake
                </button>
              </div>
            </div>

            {!result && (
              <button
                onClick={handleAnalyse}
                disabled={isAnalysing}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {isAnalysing ? (
                  <><Loader2 size={18} className="animate-spin" /> {t('vision.analyzing')}</>
                ) : (
                  'Analyse Image'
                )}
              </button>
            )}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-urgency-red-bg text-urgency-red p-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Analysis Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="bg-vaida-bg rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-vaida-text-hint uppercase tracking-wider">
                    {t('vision.findings')}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${urgencyColors[result.urgency_indicator]}`}>
                    {result.urgency_indicator.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{result.findings}</p>

                <div className="pt-2 border-t border-vaida-bg2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-vaida-teal" />
                    <span className="text-xs text-vaida-text-muted">
                      <strong>{t('vision.specialist')}:</strong> {result.specialist_type}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
