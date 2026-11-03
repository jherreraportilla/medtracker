import { useEffect, useMemo, useState } from 'react';
import { AlertsPanel } from './components/AlertsPanel';
import { AppointmentsPanel } from './components/AppointmentsPanel';
import { BackgroundColorPicker } from './components/BackgroundColorPicker';
import { DayDetail } from './components/DayDetail';
import { IosInstallHint } from './components/IosInstallHint';
import { MonthCalendar } from './components/MonthCalendar';
import { TodayPanel } from './components/TodayPanel';
import { TreatmentForm } from './components/TreatmentForm';
import { TreatmentList } from './components/TreatmentList';
import type { Appointment, AppointmentInput } from './types/appointment';
import type { DaySlot, Intake, Treatment, TreatmentInput } from './types/treatment';
import { deleteAppointment, listAppointments, saveAppointment, updateAppointment } from './utils/appointmentStore';
import { averageImageColor, clearBgImage, loadBgImage, saveBgImage } from './utils/bgImageStore';
import { getTextColorForBackground, mixHex, TEXT_DARK, TEXT_LIGHT } from './utils/contrast';
import { toLocalDateKey, toMonthKey } from './utils/dates';
import { listIntakes, markIntake, putIntakes, unmarkIntake } from './utils/intakeStore';
import { buildBackfill, buildDaySlots } from './utils/schedule';
import { pillsPerBox, remainingPills, roundPills } from './utils/stock';
import {
  getStoredBgColor,
  getStoredGlassTransparency,
  MAX_GLASS_TRANSPARENCY,
  setStoredBgColor,
  setStoredGlassTransparency,
} from './utils/themeStore';
import { deleteTreatment, listTreatments, saveTreatment, updateTreatment } from './utils/treatmentStore';

const TEXT_BOOST_FROM = 30;
const TEXT_BOOST_TO = 70;

function currentDateKey(): string {
  return toLocalDateKey(new Date());
}

export default function App() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayKey, setTodayKey] = useState(currentDateKey);
  const [monthKey, setMonthKey] = useState(() => toMonthKey(currentDateKey()));
  const [selectedKey, setSelectedKey] = useState(currentDateKey);
  const [editing, setEditing] = useState<Treatment | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState(getStoredBgColor);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImageColor, setBgImageColor] = useState<string | null>(null);
  const [glassTransparency, setGlassTransparency] = useState(getStoredGlassTransparency);

  useEffect(() => {
    function loadData() {
      Promise.all([listTreatments(), listIntakes(), listAppointments()])
        .then(([loadedTreatments, loadedIntakes, loadedAppointments]) => {
          setTreatments(loadedTreatments);
          setIntakes(loadedIntakes);
          setAppointments(loadedAppointments);
          setError(null);
        })
        .catch(() => setError('No se pudieron cargar los datos guardados. Cierra y vuelve a abrir la app.'));
    }
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      setTodayKey(currentDateKey());
      loadData();
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) onVisible();
    }
    loadData();
    navigator.storage?.persist?.().catch(() => undefined);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    loadBgImage().then((blob) => {
      if (!blob || cancelled) return;
      createdUrl = URL.createObjectURL(blob);
      setBgImageUrl(createdUrl);
    });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, []);

  useEffect(() => {
    if (!bgImageUrl) {
      setBgImageColor(null);
      return;
    }
    let cancelled = false;
    fetch(bgImageUrl)
      .then((res) => res.blob())
      .then(averageImageColor)
      .then((color) => {
        if (!cancelled) setBgImageColor(color);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bgImageUrl]);

  useEffect(() => {
    const effective = previewColor ?? bgColor;
    const backdrop = bgImageUrl && bgImageColor ? bgImageColor : effective;
    const mode = getTextColorForBackground(backdrop);
    const root = document.documentElement;
    root.style.setProperty('--app-bg', effective);
    root.style.setProperty('--app-text', mode === 'light' ? TEXT_LIGHT : TEXT_DARK);
    if (bgImageUrl) {
      const scrim = mode === 'light' ? 'rgba(17, 24, 39, 0.12)' : 'rgba(249, 250, 251, 0.12)';
      root.style.setProperty('--app-bg-image', `linear-gradient(${scrim}, ${scrim}), url("${bgImageUrl}")`);
    } else {
      root.style.setProperty('--app-bg-image', 'none');
    }

    const glassAlpha = 1 - glassTransparency / 100;
    const lightGlass = mixHex('#ffffff', backdrop, glassAlpha);
    const tone = getTextColorForBackground(lightGlass) === 'light' ? 'dark' : 'light';
    const strength = glassTransparency / MAX_GLASS_TRANSPARENCY;
    root.style.setProperty('--glass-alpha', String(glassAlpha));
    root.style.setProperty('--glass-blur', `${Math.round(16 + 12 * strength)}px`);
    root.style.setProperty('--glass-contrast', String(1 - 0.55 * strength));
    root.style.setProperty('--glass-brightness', String(tone === 'light' ? 1 + 0.45 * strength : 1 - 0.5 * strength));
    root.dataset.glassTone = tone;
    const textBoost = Math.min(1, Math.max(0, (glassTransparency - TEXT_BOOST_FROM) / (TEXT_BOOST_TO - TEXT_BOOST_FROM)));
    root.style.setProperty('--glass-text-boost', `${Math.round(textBoost * 100)}%`);
    root.style.setProperty('--glass-text-stroke', `${(0.35 * textBoost).toFixed(3)}px`);
  }, [bgColor, previewColor, bgImageUrl, bgImageColor, glassTransparency]);

  const todaySlots = useMemo(() => buildDaySlots(treatments, intakes, todayKey), [treatments, intakes, todayKey]);
  const selectedSlots = useMemo(
    () => buildDaySlots(treatments, intakes, selectedKey),
    [treatments, intakes, selectedKey]
  );

  function changeBgColor(color: string) {
    setBgColor(color);
    setStoredBgColor(color);
    setPreviewColor(null);
  }

  function changeGlassTransparency(value: number) {
    setGlassTransparency(value);
    setStoredGlassTransparency(value);
  }

  async function changeBgImage(file: File) {
    const blob = await saveBgImage(file);
    setBgImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  }

  async function removeBgImage() {
    await clearBgImage();
    setBgImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function toggleSlot(dateKey: string, slot: DaySlot) {
    setError(null);
    const { treatment } = slot;
    try {
      if (slot.intake) {
        await unmarkIntake(treatment.id, dateKey, slot.slot);
        const removedId = slot.intake.id;
        setIntakes((prev) => prev.filter((i) => i.id !== removedId));
      } else {
        const intake = await markIntake(treatment.id, dateKey, slot.slot);
        setIntakes((prev) => [...prev.filter((i) => i.id !== intake.id), intake]);
      }
    } catch {
      setError('No se pudo guardar la toma.');
    }
  }

  async function submitTreatment(data: TreatmentInput) {
    if (editing && editing !== 'new') {
      const updated: Treatment = { ...editing, ...data };
      await updateTreatment(updated);
      setTreatments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await saveTreatment(data);
      setTreatments((prev) => [...prev, created]);
    }
    setEditing(null);
  }

  async function toggleArchived(treatment: Treatment) {
    setError(null);
    const updated: Treatment = treatment.archived
      ? { ...treatment, archived: false }
      : {
          ...treatment,
          archived: true,
          endDate: treatment.endDate && treatment.endDate < todayKey ? treatment.endDate : todayKey,
        };
    try {
      await updateTreatment(updated);
      setTreatments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      setError('No se pudo actualizar el tratamiento.');
    }
  }

  async function removeTreatment(treatment: Treatment) {
    if (!confirm(`¿Eliminar «${treatment.name}» y todas sus tomas registradas?`)) return;
    setError(null);
    try {
      await deleteTreatment(treatment.id);
      setTreatments((prev) => prev.filter((t) => t.id !== treatment.id));
      setIntakes((prev) => prev.filter((i) => i.treatmentId !== treatment.id));
    } catch {
      setError('No se pudo eliminar el tratamiento.');
    }
  }

  async function persistTreatment(updated: Treatment) {
    await updateTreatment(updated);
    setTreatments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function addBox(treatment: Treatment) {
    if (!treatment.stock) return;
    setError(null);
    const remaining = remainingPills(treatment, intakes) ?? 0;
    try {
      await persistTreatment({
        ...treatment,
        stock: {
          ...treatment.stock,
          pills: roundPills(remaining + pillsPerBox(treatment.stock)),
          countedAt: Date.now(),
        },
      });
    } catch {
      setError('No se pudieron actualizar las existencias.');
    }
  }

  async function backfillIntakes(treatment: Treatment, fromKey: string, toKey: string): Promise<number> {
    const target = fromKey < treatment.startDate ? { ...treatment, startDate: fromKey } : treatment;
    const created = buildBackfill(target, intakes, fromKey, toKey);
    if (created.length === 0) return 0;
    if (target !== treatment) await persistTreatment(target);
    await putIntakes(created);
    setIntakes((prev) => [...prev, ...created]);
    return created.length;
  }

  async function createAppointment(data: AppointmentInput) {
    const created = await saveAppointment(data);
    setAppointments((prev) => [...prev, created]);
  }

  async function changeAppointment(appointment: Appointment) {
    await updateAppointment(appointment);
    setAppointments((prev) => prev.map((a) => (a.id === appointment.id ? appointment : a)));
  }

  async function toggleAppointmentDone(appointment: Appointment) {
    setError(null);
    try {
      await changeAppointment({ ...appointment, done: !appointment.done });
    } catch {
      setError('No se pudo actualizar la cita.');
    }
  }

  async function removeAppointment(appointment: Appointment) {
    if (!confirm('¿Eliminar esta cita?')) return;
    setError(null);
    try {
      await deleteAppointment(appointment.id);
      setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
    } catch {
      setError('No se pudo eliminar la cita.');
    }
  }

  function selectDay(dateKey: string) {
    setSelectedKey(dateKey);
    setMonthKey(toMonthKey(dateKey));
  }

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <header className="glass-card relative z-10 flex items-start justify-between gap-3 rounded-xl p-5 text-gray-900">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Control de medicación</h1>
            <p className="text-sm text-gray-600">Marca tus tomas y sigue el progreso de cada tratamiento.</p>
          </div>
          <BackgroundColorPicker
            value={bgColor}
            onChange={changeBgColor}
            onPreview={setPreviewColor}
            onPreviewEnd={() => setPreviewColor(null)}
            hasImage={bgImageUrl !== null}
            onImageSelect={changeBgImage}
            onImageRemove={removeBgImage}
            glassTransparency={glassTransparency}
            onGlassTransparencyChange={changeGlassTransparency}
          />
        </header>

        <IosInstallHint />

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {editing ? (
          <TreatmentForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            initialRemaining={editing === 'new' ? null : remainingPills(editing, intakes)}
            todayKey={todayKey}
            onSubmit={submitTreatment}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <AlertsPanel treatments={treatments} intakes={intakes} appointments={appointments} todayKey={todayKey} />

            <TodayPanel todayKey={todayKey} slots={todaySlots} onToggle={(s) => toggleSlot(todayKey, s)} />

            <section className="space-y-4 glass-card rounded-xl p-5 text-gray-900">
              <MonthCalendar
                monthKey={monthKey}
                todayKey={todayKey}
                selectedKey={selectedKey}
                treatments={treatments}
                intakes={intakes}
                appointments={appointments}
                onMonthChange={setMonthKey}
                onSelect={selectDay}
              />
              <DayDetail
                dateKey={selectedKey}
                todayKey={todayKey}
                slots={selectedSlots}
                appointments={appointments}
                onToggle={(s) => toggleSlot(selectedKey, s)}
              />
            </section>

            <TreatmentList
              treatments={treatments}
              intakes={intakes}
              todayKey={todayKey}
              onNew={() => setEditing('new')}
              onEdit={setEditing}
              onToggleArchived={toggleArchived}
              onDelete={removeTreatment}
              onAddBox={addBox}
              onBackfill={backfillIntakes}
            />

            <AppointmentsPanel
              appointments={appointments}
              treatments={treatments}
              todayKey={todayKey}
              onCreate={createAppointment}
              onUpdate={changeAppointment}
              onToggleDone={toggleAppointmentDone}
              onDelete={removeAppointment}
            />
          </>
        )}
      </div>
    </div>
  );
}
