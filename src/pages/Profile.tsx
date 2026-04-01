import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, User, Globe, Shield, LogOut,
  Bell, Moon, HelpCircle, X, Phone, BookOpen, Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// ── Shared modal backdrop + panel ──────────────────────────────
function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* scrim */}
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      {/* panel */}
      <motion.div
        className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
      <h3 className="font-bold text-base text-slate-900">{title}</h3>
      <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
        <X size={18} className="text-slate-500" />
      </button>
    </div>
  );
}

// ── Animated Toggle ─────────────────────────────────────────────
function Toggle({ enabled }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 pointer-events-none ${enabled ? 'bg-teal-600' : 'bg-slate-200'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
        style={{ x: enabled ? 26 : 4 }}
      />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, role, logout } = useApp();

  // ── Dark Mode ──────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('vaida-dark-mode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vaida-dark-mode', String(darkMode));
  }, [darkMode]);

  // ── Notifications ──────────────────────────────────────────
  const [notificationsOn, setNotificationsOn] = useState<boolean>(() => {
    return localStorage.getItem('vaida-notifications') !== 'false';
  });

  const handleNotificationsToggle = () => {
    setNotificationsOn((prev) => {
      localStorage.setItem('vaida-notifications', String(!prev));
      return !prev;
    });
  };

  // ── Language ───────────────────────────────────────────────
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>(
    (i18n.language?.slice(0, 2) as 'en' | 'hi') || 'en'
  );
  const [showLangModal, setShowLangModal] = useState(false);

  const handleLanguageChange = (lang: 'en' | 'hi') => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    setShowLangModal(false);
  };

  // ── Modals ─────────────────────────────────────────────────
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // ── Logout ─────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const langLabel = currentLang === 'hi' ? 'Hindi (HI)' : 'English (EN)';

  return (
    <div className="min-h-screen bg-vaida-bg pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-vaida-bg2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">{t('nav.profile')}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 space-y-4">
        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 border border-vaida-bg2 flex items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-vaida-teal flex items-center justify-center">
            <User size={28} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{user?.name_encrypted || 'Guest'}</h2>
            <p className="text-sm text-vaida-text-muted capitalize">{role}</p>
            <p className="text-xs text-vaida-text-hint">{user?.district || 'Jaipur, Rajasthan'}</p>
          </div>
        </motion.div>

        {/* Logout Button — prominent, always visible */}
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-red-50 border border-red-200 text-red-600 font-semibold rounded-2xl hover:bg-red-100 active:scale-[0.98] transition-all duration-200"
        >
          <LogOut size={18} />
          Sign Out
        </motion.button>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl border border-vaida-bg2 overflow-hidden">

          {/* Language */}
          <motion.button
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0 }}
            onClick={() => setShowLangModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-vaida-bg transition-colors border-b border-vaida-bg2"
          >
            <Globe size={18} className="text-vaida-text-muted" />
            <span className="flex-1 text-left text-sm font-medium">Language</span>
            <span className="text-xs text-vaida-text-hint">{langLabel}</span>
            <ChevronRight size={16} className="text-vaida-text-hint" />
          </motion.button>

          {/* Notifications */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
            onClick={handleNotificationsToggle}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-vaida-bg transition-colors border-b border-vaida-bg2 cursor-pointer"
          >
            <Bell size={18} className="text-vaida-text-muted" />
            <span className="flex-1 text-left text-sm font-medium">Notifications</span>
            <span className="text-xs text-vaida-text-hint mr-2">{notificationsOn ? 'On' : 'Off'}</span>
            <Toggle enabled={notificationsOn} onToggle={handleNotificationsToggle} />
          </motion.button>

          {/* Privacy & Consent */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            onClick={() => setShowPrivacyModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-vaida-bg transition-colors border-b border-vaida-bg2 cursor-pointer"
          >
            <Shield size={18} className="text-vaida-text-muted" />
            <span className="flex-1 text-left text-sm font-medium">Privacy & Consent</span>
            <ChevronRight size={16} className="text-vaida-text-hint" />
          </motion.button>

          {/* Dark Mode */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            onClick={() => setDarkMode((d) => !d)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-vaida-bg transition-colors border-b border-vaida-bg2 cursor-pointer"
          >
            <Moon size={18} className="text-vaida-text-muted" />
            <span className="flex-1 text-left text-sm font-medium">Dark Mode</span>
            <span className="text-xs text-vaida-text-hint mr-2">{darkMode ? 'On' : 'Off'}</span>
            <Toggle enabled={darkMode} onToggle={() => setDarkMode((d) => !d)} />
          </motion.button>

          {/* Help & Support */}
          <motion.button
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            onClick={() => setShowHelpModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-vaida-bg transition-colors"
          >
            <HelpCircle size={18} className="text-vaida-text-muted" />
            <span className="flex-1 text-left text-sm font-medium">Help & Support</span>
            <ChevronRight size={16} className="text-vaida-text-hint" />
          </motion.button>
        </div>

        <p className="text-center text-[10px] text-vaida-text-hint pb-2">
          VAIDA v1.0.0 · Team Phoenix · NHH 2.0
        </p>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      <AnimatePresence>

        {/* Language Modal */}
        {showLangModal && (
          <ModalBackdrop onClose={() => setShowLangModal(false)}>
            <ModalHeader title="Select Language" onClose={() => setShowLangModal(false)} />
            <div className="p-5 space-y-3">
              {([
                { code: 'en', label: 'English', native: 'English (EN)' },
                { code: 'hi', label: 'Hindi', native: 'हिन्दी (HI)' },
              ] as const).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all ${currentLang === lang.code
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50'
                    }`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-sm text-slate-900">{lang.native}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{lang.label}</p>
                  </div>
                  {currentLang === lang.code && (
                    <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
                      <Check size={13} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
              <p className="text-[10px] text-slate-400 text-center pt-1">
                More languages coming soon
              </p>
            </div>
          </ModalBackdrop>
        )}

        {/* Privacy & Consent Modal */}
        {showPrivacyModal && (
          <ModalBackdrop onClose={() => setShowPrivacyModal(false)}>
            <ModalHeader title="Privacy & Data Consent" onClose={() => setShowPrivacyModal(false)} />
            <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5">
                <Shield size={15} className="text-teal-700 shrink-0" />
                <p className="text-xs font-semibold text-teal-800">ABHA Compliant · DPDPA 2023</p>
              </div>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  Your health data is processed under the <strong className="text-slate-800">Ayushman Bharat Health Account (ABHA)</strong> framework and is fully compliant with India's <strong className="text-slate-800">Digital Personal Data Protection Act 2023</strong>.
                </p>
                <p>
                  All personally identifiable information is <strong className="text-slate-800">encrypted at rest and in transit</strong>. Voice transcripts and images are anonymized before AI processing — no raw biometric data leaves your device unencrypted.
                </p>
                <p>
                  Epidemiological data shared with district health authorities uses <strong className="text-slate-800">zero-knowledge proofs</strong> to ensure individual patient identity is never exposed.
                </p>
                <p>
                  You may request <strong className="text-slate-800">full data deletion</strong> at any time by contacting your ASHA worker or writing to <span className="font-mono text-xs bg-slate-100 px-1 rounded">privacy@vaida.health</span>.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-2xl transition-colors"
              >
                I Understand
              </button>
            </div>
          </ModalBackdrop>
        )}

        {/* Help & Support Modal */}
        {showHelpModal && (
          <ModalBackdrop onClose={() => setShowHelpModal(false)}>
            <ModalHeader title="Help & Support" onClose={() => setShowHelpModal(false)} />
            <div className="p-5 space-y-3">
              <button
                onClick={() => { window.location.href = 'tel:+911800112345'; }}
                className="w-full flex items-center gap-4 px-4 py-4 bg-teal-50 border border-teal-200 rounded-2xl hover:bg-teal-100 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
                  <Phone size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">Contact ASHA Worker</p>
                  <p className="text-xs text-slate-500 mt-0.5">Call your assigned field health worker</p>
                </div>
              </button>
              <button
                onClick={() => { setShowHelpModal(false); navigate('/epi'); }}
                className="w-full flex items-center gap-4 px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                  <BookOpen size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">View App FAQ</p>
                  <p className="text-xs text-slate-500 mt-0.5">Guides, tips, and troubleshooting</p>
                </div>
              </button>
              <p className="text-center text-[10px] text-slate-400 pt-1">
                Support hours: Mon–Sat, 8am–8pm IST
              </p>
            </div>
          </ModalBackdrop>
        )}

      </AnimatePresence>
    </div>
  );
}
