import type { DaySlot } from '../types/treatment';

interface Props {
  slots: DaySlot[];
  onToggle: (slot: DaySlot) => void;
  disabled?: boolean;
}

function slotKey(s: DaySlot): string {
  return `${s.treatment.id}|${s.slot}`;
}

export function SlotList({ slots, onToggle, disabled = false }: Props) {
  return (
    <ul className="space-y-2">
      {slots.map((s) => {
        const taken = Boolean(s.intake);
        return (
          <li key={slotKey(s)}>
            <button
              type="button"
              onClick={() => onToggle(s)}
              disabled={disabled}
              aria-pressed={taken}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                taken
                  ? 'border-emerald-200/80 bg-emerald-50/70'
                  : 'border-gray-200/80 bg-white/50 hover:border-gray-300'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                  taken ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white'
                }`}
                aria-hidden="true"
              >
                {taken && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.treatment.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-medium ${taken ? 'text-emerald-900' : 'text-gray-900'}`}>
                  {s.treatment.name}
                </span>
                <span className="block truncate text-xs text-gray-500">
                  {[s.treatment.dose, s.treatment.frequency.timesPerDay > 1 ? `toma ${s.slot + 1} de ${s.treatment.frequency.timesPerDay}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-gray-500">
                {s.time && <span className="block font-medium text-gray-700">{s.time}</span>}
                {s.intake && !s.intake.backfilled && (
                  <span className="block">
                    {new Date(s.intake.takenAt).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
