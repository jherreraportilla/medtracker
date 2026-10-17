import type { DayState, Intake, Treatment } from '../types/treatment';
import { addMonths, daysOfMonth, formatDateKey, weekdayOf } from '../utils/dates';
import { buildDaySlots, dayState, WEEKDAY_SHORT, WEEKDAYS_MONDAY_FIRST } from '../utils/schedule';

interface Props {
  monthKey: string;
  todayKey: string;
  selectedKey: string;
  treatments: Treatment[];
  intakes: Intake[];
  onMonthChange: (monthKey: string) => void;
  onSelect: (dateKey: string) => void;
}

const CELL_STYLES: Record<DayState, string> = {
  complete: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  partial: 'bg-amber-50 border-amber-200 text-amber-900',
  missed: 'bg-rose-50 border-rose-200 text-rose-900',
  notDue: 'bg-gray-50 border-gray-200 text-gray-500',
  future: 'bg-white border-dashed border-gray-300 text-gray-700',
};

const STATE_LABELS: Record<Exclude<DayState, 'future' | 'notDue'>, string> = {
  complete: 'Completo',
  partial: 'Parcial',
  missed: 'Olvidado',
};

export function MonthCalendar({
  monthKey,
  todayKey,
  selectedKey,
  treatments,
  intakes,
  onMonthChange,
  onSelect,
}: Props) {
  const days = daysOfMonth(monthKey);
  const leadingBlanks = (weekdayOf(days[0]) + 6) % 7;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <NavButton label="Mes anterior" onClick={() => onMonthChange(addMonths(monthKey, -1))} direction="left" />
        <h2 className="text-lg font-semibold first-letter:uppercase">
          {formatDateKey(days[0], { month: 'long', year: 'numeric' })}
        </h2>
        <NavButton label="Mes siguiente" onClick={() => onMonthChange(addMonths(monthKey, 1))} direction="right" />
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {WEEKDAYS_MONDAY_FIRST.map((d) => (
          <div key={d}>{WEEKDAY_SHORT[d]}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((key) => {
          const slots = buildDaySlots(treatments, intakes, key);
          const state = dayState(slots, key, todayKey);
          const dueTreatments = [...new Map(slots.map((s) => [s.treatment.id, s.treatment])).values()];
          const selected = key === selectedKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={selected}
              className={`flex aspect-square min-h-[2.75rem] flex-col items-center justify-between rounded-lg border p-1 text-sm transition-shadow ${CELL_STYLES[state]} ${
                selected ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
              }`}
            >
              <span className={key === todayKey ? 'font-bold underline underline-offset-2' : 'font-medium'}>
                {Number(key.slice(8))}
              </span>
              <span className="flex flex-wrap justify-center gap-0.5">
                {dueTreatments.slice(0, 4).map((t) => (
                  <span key={t.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        {(Object.keys(STATE_LABELS) as (keyof typeof STATE_LABELS)[]).map((state) => (
          <span key={state} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded border ${CELL_STYLES[state]}`} />
            {STATE_LABELS[state]}
          </span>
        ))}
      </div>
    </div>
  );
}

function NavButton({ label, onClick, direction }: { label: string; onClick: () => void; direction: 'left' | 'right' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-5 w-5 ${direction === 'left' ? 'rotate-180' : ''}`}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
