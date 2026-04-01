import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '../types';
import PatientDashboard from './PatientDashboard';
import AshaDashboard from './AshaDashboard';
import DoctorDashboard from './DoctorDashboard';

/** Primary key `userRole`; one-time sync from legacy `vaida_role` if present. */
function parseStoredUserRole(): UserRole | null {
  const u = localStorage.getItem('userRole');
  if (u === 'patient' || u === 'asha' || u === 'doctor') return u;
  const v = localStorage.getItem('vaida_role');
  if (v === 'patient' || v === 'asha' || v === 'doctor') {
    localStorage.setItem('userRole', v);
    return v;
  }
  return null;
}

export default function Dashboard() {
  const storedRole = useMemo(() => parseStoredUserRole(), []);

  if (storedRole === null) {
    return <Navigate to="/login" replace />;
  }

  switch (storedRole) {
    case 'asha':
      return <AshaDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'patient':
    default:
      return <PatientDashboard />;
  }
}
