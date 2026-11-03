import { useState } from 'react';
import type { Intake, Treatment } from '../types/treatment';
import { addDays, durationBetween, formatDateKey, formatDuration } from '../utils/dates';
import { frequencyLabel } from '../utils/schedule';
import { treatmentProgress } from '../utils/stats';
import { blisterBreakdown, daysLeft, formatPills, isLowStock, pillsPerBox, remainingPills } from '../utils/stock';
import { BackfillForm } from './BackfillForm';
import { ProgressSummary } from './ProgressSummary';

interface Props {
  treatments: Treatment[];
  intakes: Intake[];
  todayKey: string;
  onNew: () => void;
  onEdit: (treatment: Treatment) => void;
  onToggleArchived: (treatment: Treatment) => void;
  onDelete: (treatment: Treatment) => void;
  onAddBox: (treatment: Treatment) => void;
  onBackfill: (treatment: Treatment, fromKey: string, toKey: string) => Promise<number>;
}

const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

export function TreatmentList({
  treatments,
  intakes,
  todayKey,
  onNew,
  onEdit,
  onToggleArchived,
  onDelete,
  onAddBox,
  onBackfill,
}: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const [backfillId, setBackfillId] = useState<string | null>(null);
  const active = treatments.filter((t) => !t.archived);
  const archived = treatments.filter((t) => t.archived);

  function renderCard(t: Treatment) {
    const remaining = remainingPills(t, intakes);
    const low = isLowStock(t, remaining);
    return (
      <li key={t.id} className="space-y-3 rounded-lg border border-gray-200/80 bg-white/30 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">
              {t.name}
              {t.dose && <span className="font-normal text-gray-500"> · {t.dose}</span>}
            </p>
            <p className="text-xs text-gray-500">{frequencyLabel(t.frequency)}</p>
            {t.notes && <p className="mt-1 text-xs italic text-gray-500">{t.notes}</p>}
          </div>
        </div>

        <DurationLine treatment={t} todayKey={todayKey} />

        {t.startDate <= todayKey && <ProgressSummary progress={treatmentProgress(t, intakes, todayKey)} color={t.color} />}

        {t.stock && remaining !== null && (
          <div
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
              low ? 'border-amber-200/80 bg-amber-50/70 text-amber-900' : 'border-gray-200/80 bg-white/40 text-gray-700'
            }`}
          >
            <div className="min-w-0">
              <p className="font-semibold">
                {low ? 'Quedan pocas, toca comprar' : 'Existencias'}: {formatPills(remaining)}{' '}
                {remaining === 1 ? 'pastilla' : 'pastillas'}
              </p>
              <p className={low ? '' : 'text-gray-500'}>
                {[blisterBreakdown(t.stock.pillsPerBlister, remaining), stockDaysLabel(t, remaining)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAddBox(t)}
              title={`Añadir una caja (${formatPills(pillsPerBox(t.stock))} pastillas)`}
              className="shrink-0 rounded-md border border-emerald-600 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50"
            >
              +1 caja
            </button>
          </div>
        )}

        {backfillId === t.id && (
          <BackfillForm
            treatment={t}
            todayKey={todayKey}
            onSubmit={(from, to) => onBackfill(t, from, to)}
            onClose={() => setBackfillId(null)}
          />
        )}

        <div className="flex flex-wrap justify-end gap-1 text-xs font-medium">
          {backfillId !== t.id && (
            <button type="button" onClick={() => setBackfillId(t.id)} className="rounded-md px-2 py-1 text-emerald-700 hover:bg-emerald-50">
              Tomas anteriores
            </button>
          )}
          <button type="button" onClick={() => onEdit(t)} className="rounded-md px-2 py-1 text-emerald-700 hover:bg-emerald-50">
            Editar
          </button>
          <button type="button" onClick={() => onToggleArchived(t)} className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100">
            {t.archived ? 'Reactivar' : 'Finalizar'}
          </button>
          <button type="button" onClick={() => onDelete(t)} className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </li>
    );
  }

  return (
    <section className="space-y-4 glass-card rounded-xl p-5 text-gray-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tratamientos</h2>
        <button
          type="button"
          onClick={onNew}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
        >
          Nuevo
        </button>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-gray-500">No tienes tratamientos activos. Pulsa «Nuevo» para añadir uno.</p>
      ) : (
        <ul className="space-y-3">{active.map(renderCard)}</ul>
      )}

      {archived.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <Chevron open={showArchived} />
            Finalizados ({archived.length})
          </button>
          {showArchived && <ul className="mt-3 space-y-3">{archived.map(renderCard)}</ul>}
        </div>
      )}
    </section>
  );
}

function stockDaysLabel(treatment: Treatment, remaining: number): string | null {
  const days = daysLeft(treatment, remaining);
  if (days === null) return null;
  return days === 1 ? 'para 1 día' : `para unos ${days} días`;
}

function DurationLine({ treatment, todayKey }: { treatment: Treatment; todayKey: string }) {
  const { startDate, endDate } = treatment;
  const start = formatDateKey(startDate, LONG_DATE);

  if (startDate > todayKey) {
    return <p className="rounded-lg bg-white/40 px-3 py-2 text-xs text-gray-600">Empieza el {start}.</p>;
  }

  const finished = endDate !== undefined && endDate < todayKey;
  const lastKey = finished ? endDate : todayKey;
  const duration = formatDuration(durationBetween(startDate, addDays(lastKey, 1)));

  return (
    <div className="rounded-lg bg-white/40 px-3 py-2 text-xs text-gray-600">
      <p>
        {finished
          ? `Del ${start} al ${formatDateKey(lastKey, LONG_DATE)}`
          : `Desde el ${start} hasta hoy, ${formatDateKey(todayKey, LONG_DATE)}`}
      </p>
      <p className="text-sm font-semibold text-gray-900">
        {finished ? 'Duró' : 'Lleva'} {duration}
      </p>
      {!finished && endDate && <p className="text-gray-500">Termina el {formatDateKey(endDate, LONG_DATE)}.</p>}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
