import type { DaySlot } from '../types/treatment';
import { formatDateKey } from '../utils/dates';
import { SlotList } from './SlotList';

interface Props {
  dateKey: string;
  todayKey: string;
  slots: DaySlot[];
  onToggle: (slot: DaySlot) => void;
}

export function DayDetail({ dateKey, todayKey, slots, onToggle }: Props) {
  const isFuture = dateKey > todayKey;

  return (
    <div className="space-y-3 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold first-letter:uppercase">
        {formatDateKey(dateKey, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </h3>
      {slots.length === 0 ? (
        <p className="text-sm text-gray-500">Sin tomas previstas este día.</p>
      ) : (
        <>
          {isFuture && <p className="text-xs text-gray-500">No se pueden marcar tomas de días futuros.</p>}
          <SlotList slots={slots} onToggle={onToggle} disabled={isFuture} />
        </>
      )}
    </div>
  );
}
