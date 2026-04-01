import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Mic, ClipboardList, User, Activity, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import clsx from 'clsx';

const patientTabs = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/intake', icon: Mic, labelKey: 'nav.intake' },
  { path: '/history', icon: ClipboardList, labelKey: 'nav.history' },
  { path: '/profile', icon: User, labelKey: 'nav.profile' },
];

const ashaTabs = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/intake', icon: Mic, labelKey: 'nav.intake' },
  { path: '/epi', icon: Activity, labelKey: 'nav.epi' },
  { path: '/profile', icon: User, labelKey: 'nav.profile' },
];

const doctorTabs = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/epi', icon: Activity, labelKey: 'nav.epi' },
  { path: '/history', icon: ClipboardList, labelKey: 'nav.history' },
  { path: '/profile', icon: User, labelKey: 'nav.profile' },
];

export default function BottomNav() {
  const { t } = useTranslation();
  const { role, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav on intake flow and login
  if (location.pathname.startsWith('/intake') || location.pathname === '/login') return null;

  const tabs = role === 'doctor' ? doctorTabs : role === 'asha' ? ashaTabs : patientTabs;

  return (
    <nav
      className={clsx(
        'fixed z-50 bg-white/95 backdrop-blur-xl border-vaida-bg2',
        'bottom-0 left-0 right-0 border-t safe-bottom',
        'md:top-0 md:bottom-0 md:right-auto md:h-screen md:w-56 md:border-t-0 md:border-r md:pb-0 md:pt-[max(1.5rem,env(safe-area-inset-top))]',
      )}
    >
      <div
        className={clsx(
          'max-w-lg mx-auto flex justify-around items-center h-16',
          'md:max-w-none md:mx-0 md:h-full md:flex-col md:justify-start md:items-stretch md:gap-1 md:px-3 md:py-6',
        )}
      >
        {tabs.map(({ path, icon: Icon, labelKey }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => clsx(
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200',
              'md:flex-row md:items-center md:gap-3 md:px-3 md:py-2.5 md:w-full md:justify-start',
              isActive
                ? 'text-vaida-teal'
                : 'text-vaida-text-hint hover:text-vaida-text-muted',
            )}
          >
            {({ isActive }) => (
              <>
                <div
                  className={clsx(
                    'p-1.5 rounded-xl transition-all duration-200 shrink-0',
                    'md:p-2',
                    isActive && 'bg-vaida-teal-light',
                  )}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium md:text-sm md:truncate">{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Logout — desktop sidebar only, pinned to bottom */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className={clsx(
            'hidden md:flex items-center gap-3 px-3 py-2.5 w-full rounded-xl transition-all duration-200 mt-auto',
            'text-red-500 hover:bg-red-50 hover:text-red-600',
          )}
        >
          <div className="p-2 rounded-xl shrink-0">
            <LogOut size={20} strokeWidth={2} />
          </div>
          <span className="text-sm truncate font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
