import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { offlineQueue } from './lib/offlineQueue';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// ── Register offline sync listener ──────────────────────────
// When the device comes back online, auto-flush queued API
// requests that were saved while offline.
offlineQueue.registerOnlineListener();
