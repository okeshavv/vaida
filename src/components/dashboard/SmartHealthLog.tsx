import { CheckCircle, MessageSquareQuote } from 'lucide-react';

export interface SmartHealthEvent {
  symptom: string;
  location: string;
  date: string;
  severity: 'High' | 'Moderate' | 'Low';
  recommendation: string;
  status: 'Resolved' | 'Ongoing';
  emoji: string;
}

interface SmartHealthLogProps {
  events: SmartHealthEvent[];
}

const severityStyles: Record<SmartHealthEvent['severity'], { badge: string }> = {
  High: {
    badge: 'text-red-700 border-red-200 bg-red-50',
  },
  Moderate: {
    badge: 'text-amber-700 border-amber-200 bg-amber-50',
  },
  Low: {
    badge: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  },
};

export function formatEventDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.toLocaleString('en-US', { day: 'numeric' });
  const time = date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${month} ${day}, ${time}`;
}

export default function SmartHealthLog({ events }: SmartHealthLogProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center">
        <p className="text-sm font-medium text-slate-700">No recent events found</p>
        <p className="mt-1 text-xs text-slate-500">Your latest AI-tracked health events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const severity = severityStyles[event.severity];
        const isResolved = event.status === 'Resolved';

        return (
          <article
            key={`${event.symptom}-${event.date}-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow duration-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                  <span aria-hidden="true">{event.emoji}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{event.symptom}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{event.location}</p>
                </div>
              </div>

              {isResolved ? (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle size={14} />
                  <span>RESOLVED</span>
                </div>
              ) : (
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-amber-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  <span>MONITORING</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">{formatEventDate(event.date)}</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${severity.badge}`}>
                {event.severity}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <MessageSquareQuote size={14} className="mt-0.5 shrink-0 text-slate-500" />
                <p className="text-xs leading-relaxed text-slate-700">{event.recommendation}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
