import type { DaySlot } from '../types/treatment';
import { formatDateKey } from '../utils/dates';
import { SlotList } from './SlotList';

interface Props {
  todayKey: string;
  slots: DaySlot[];
  onToggle: (slot: DaySlot) => void;
}

export function TodayPanel({ todayKey, slots, onToggle }: Props) {
  const taken = slots.filter((s) => s.intake).length;

  return (
    <section className="space-y-4 glass-card rounded-xl p-5 text-gray-900">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Hoy</h2>
          <p className="text-sm first-letter:uppercase text-gray-500">
            {formatDateKey(todayKey, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {slots.length > 0 && (
          <span className={`text-sm font-medium ${taken === slots.length ? 'text-emerald-700' : 'text-gray-600'}`}>
            {taken} / {slots.length} tomas
          </span>
        )}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-gray-500">No hay tomas previstas para hoy.</p>
      ) : (
        <SlotList slots={slots} onToggle={onToggle} />
      )}
    </section>
  );
}
