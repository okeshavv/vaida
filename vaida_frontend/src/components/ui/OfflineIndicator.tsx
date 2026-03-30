import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineIndicator() {
  const { isOnline, pendingSyncCount } = useApp();
  const { t } = useTranslation();

  const showBanner = !isOnline || pendingSyncCount > 0;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-[60] px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 ${
            !isOnline
              ? 'bg-urgency-amber text-white'
              : 'bg-vaida-teal-light text-vaida-teal'
          }`}
        >
          {!isOnline ? (
            <>
              <WifiOff size={14} />
              {t('common.offline')}
              {pendingSyncCount > 0 && ` · ${t('common.syncPending', { count: pendingSyncCount })}`}
            </>
          ) : pendingSyncCount > 0 ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              {t('common.syncing')}
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              {t('common.synced')}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
