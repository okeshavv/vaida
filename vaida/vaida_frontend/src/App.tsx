import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import { AppProvider, useApp } from './context/AppContext';
import BottomNav from './components/ui/BottomNav';
import OfflineIndicator from './components/ui/OfflineIndicator';
import PageTransition from './components/ui/PageTransition';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IntakeFlow from './pages/IntakeFlow';
import TriageResultPage from './pages/TriageResults';
import VisionModule from './pages/VisionModule';
import EpiDashboard from './pages/EpiDashboard';
import HistoryPage from './pages/History';
import ConsultRoom from './pages/ConsultRoom';
import Profile from './pages/Profile';
import EmergencyAlert from './pages/EmergencyAlert';
import BodyMap from './pages/BodyMap';
import TriageResults from './pages/TriageResults';
import SeverityCheck from './pages/SeverityCheck';
import ImageScan from './pages/ImageScan';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { pathname } = useLocation();
  const showMainNav =
    !pathname.startsWith('/intake') && pathname !== '/login' && pathname !== '/emergency';

  return (
    <div
      className={clsx(
        'relative min-h-screen w-full bg-white',
        'max-w-lg mx-auto shadow-xl',
        'md:max-w-none md:mx-0 md:shadow-none',
        showMainNav && 'pb-16 md:pb-0 md:pl-56',
      )}
    >
      <OfflineIndicator />
      <AnimatePresence mode="wait">
        <Routes location={useLocation()} key={useLocation().pathname}>
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
          <Route path="/intake/voice" element={<ProtectedRoute><PageTransition><IntakeFlow /></PageTransition></ProtectedRoute>} />
          <Route path="/intake/body-map" element={<ProtectedRoute><PageTransition><BodyMap /></PageTransition></ProtectedRoute>} />
          <Route path="/intake/scan" element={<ProtectedRoute><PageTransition><ImageScan /></PageTransition></ProtectedRoute>} />
          <Route path="/intake" element={<ProtectedRoute><PageTransition><IntakeFlow /></PageTransition></ProtectedRoute>} />
          <Route path="/emergency" element={<ProtectedRoute><PageTransition><EmergencyAlert /></PageTransition></ProtectedRoute>} />
          <Route path="/triage" element={<PageTransition><TriageResults /></PageTransition>} />
          <Route path="/triage/:id" element={<ProtectedRoute><PageTransition><TriageResultPage /></PageTransition></ProtectedRoute>} />
          <Route path="/vision" element={<ProtectedRoute><PageTransition><VisionModule /></PageTransition></ProtectedRoute>} />
          <Route path="/epi" element={<ProtectedRoute><PageTransition><EpiDashboard /></PageTransition></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><PageTransition><HistoryPage /></PageTransition></ProtectedRoute>} />
          <Route path="/consult" element={<ProtectedRoute><PageTransition><ConsultRoom /></PageTransition></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/intake/severity" element={<PageTransition><SeverityCheck /></PageTransition>} />
        </Routes>
      </AnimatePresence>
      <BottomNav />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
