import { useState } from 'react';
import type { Intake, Treatment } from '../types/treatment';
import { formatDateKey } from '../utils/dates';
import { frequencyLabel } from '../utils/schedule';
import { treatmentProgress } from '../utils/stats';
import { ProgressSummary } from './ProgressSummary';

interface Props {
  treatments: Treatment[];
  intakes: Intake[];
  todayKey: string;
  onNew: () => void;
  onEdit: (treatment: Treatment) => void;
  onToggleArchived: (treatment: Treatment) => void;
  onDelete: (treatment: Treatment) => void;
}

export function TreatmentList({ treatments, intakes, todayKey, onNew, onEdit, onToggleArchived, onDelete }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const active = treatments.filter((t) => !t.archived);
  const archived = treatments.filter((t) => t.archived);

  function renderCard(t: Treatment) {
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
            <p className="text-xs text-gray-500">
              Desde {formatDateKey(t.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}
              {t.endDate && ` hasta ${formatDateKey(t.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </p>
            {t.notes && <p className="mt-1 text-xs italic text-gray-500">{t.notes}</p>}
          </div>
        </div>

        <ProgressSummary progress={treatmentProgress(t, intakes, todayKey)} color={t.color} />

        <div className="flex flex-wrap justify-end gap-1 text-xs font-medium">
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
