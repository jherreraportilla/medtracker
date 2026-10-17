import type { TreatmentProgress } from '../types/treatment';

interface Props {
  progress: TreatmentProgress;
  color: string;
}

export function ProgressSummary({ progress, color }: Props) {
  const { dayNumber, totalDays, takenIntakes, expectedIntakes, adherence, currentStreak, longestStreak } = progress;
  const percent = Math.round(adherence * 100);

  if (dayNumber === 0) {
    return <p className="text-xs text-gray-500">Aún no ha empezado.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Día" value={totalDays ? `${dayNumber} / ${totalDays}` : String(dayNumber)} />
        <Stat label="Adherencia" value={`${percent}%`} />
        <Stat label="Racha" value={`${currentStreak} d`} hint={`Máx. ${longestStreak} d`} />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      <p className="text-[11px] text-gray-500">
        {takenIntakes} de {expectedIntakes} tomas registradas
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-1.5">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}
