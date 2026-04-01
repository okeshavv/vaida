import { Mic, ShieldCheck, Users, ChevronRight } from 'lucide-react';

interface SmartCtaCardProps {
  onClick: () => void;
}

export default function SmartCtaCard({ onClick }: SmartCtaCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-white p-5 text-left shadow-xl shadow-teal-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-2xl hover:shadow-teal-200/70 active:translate-y-0 active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-600/10">
          <span className="absolute inline-flex h-16 w-16 rounded-full bg-teal-400/25 animate-ping" />
          <span className="absolute inline-flex h-12 w-12 rounded-full bg-teal-500/20 animate-pulse" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-500/30">
            <Mic size={22} className="text-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold tracking-tight text-slate-900">Start Voice Symptom Check</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Tap the microphone and tell VAIDA how you are feeling today.
          </p>
        </div>

        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 transition-colors group-hover:bg-teal-200 sm:flex">
          <ChevronRight size={18} />
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200/80 pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-teal-700" />
            <span>95% Accurate AI Triage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-teal-700" />
            <span>Trusted by 10,000+ Patients</span>
          </div>
        </div>
      </div>
    </button>
  );
}
