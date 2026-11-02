import { useEffect, useMemo, useState } from 'react';
import { BackgroundColorPicker } from './components/BackgroundColorPicker';
import { DayDetail } from './components/DayDetail';
import { IosInstallHint } from './components/IosInstallHint';
import { MonthCalendar } from './components/MonthCalendar';
import { TodayPanel } from './components/TodayPanel';
import { TreatmentForm } from './components/TreatmentForm';
import { TreatmentList } from './components/TreatmentList';
import type { DaySlot, Intake, Treatment, TreatmentInput } from './types/treatment';
import { clearBgImage, loadBgImage, saveBgImage } from './utils/bgImageStore';
import { getTextColorForBackground, TEXT_DARK, TEXT_LIGHT } from './utils/contrast';
import { toLocalDateKey, toMonthKey } from './utils/dates';
import { listIntakes, markIntake, unmarkIntake } from './utils/intakeStore';
import { buildDaySlots } from './utils/schedule';
import {
  getStoredBgColor,
  getStoredGlassTransparency,
  setStoredBgColor,
  setStoredGlassTransparency,
} from './utils/themeStore';
import { deleteTreatment, listTreatments, saveTreatment, updateTreatment } from './utils/treatmentStore';

function currentDateKey(): string {
  return toLocalDateKey(new Date());
}

export default function App() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [todayKey, setTodayKey] = useState(currentDateKey);
  const [monthKey, setMonthKey] = useState(() => toMonthKey(currentDateKey()));
  const [selectedKey, setSelectedKey] = useState(currentDateKey);
  const [editing, setEditing] = useState<Treatment | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState(getStoredBgColor);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [glassTransparency, setGlassTransparency] = useState(getStoredGlassTransparency);

  useEffect(() => {
    function loadData() {
      Promise.all([listTreatments(), listIntakes()])
        .then(([loadedTreatments, loadedIntakes]) => {
          setTreatments(loadedTreatments);
          setIntakes(loadedIntakes);
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
    const effective = previewColor ?? bgColor;
    const mode = getTextColorForBackground(effective);
    const textColor = mode === 'light' ? TEXT_LIGHT : TEXT_DARK;
    const root = document.documentElement;
    root.style.setProperty('--app-bg', effective);
    root.style.setProperty('--app-text', textColor);
    if (bgImageUrl) {
      const scrim = mode === 'light' ? 'rgba(17, 24, 39, 0.12)' : 'rgba(249, 250, 251, 0.12)';
      const shadow = mode === 'light' ? 'rgba(17, 24, 39, 0.6)' : 'rgba(249, 250, 251, 0.7)';
      root.style.setProperty('--app-bg-image', `linear-gradient(${scrim}, ${scrim}), url("${bgImageUrl}")`);
      root.style.setProperty('--app-text-shadow', `0 1px 3px ${shadow}`);
    } else {
      root.style.setProperty('--app-bg-image', 'none');
      root.style.setProperty('--app-text-shadow', 'none');
    }
  }, [bgColor, previewColor, bgImageUrl]);

  useEffect(() => {
    document.documentElement.style.setProperty('--glass-alpha', String(1 - glassTransparency / 100));
  }, [glassTransparency]);

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

  function selectDay(dateKey: string) {
    setSelectedKey(dateKey);
    setMonthKey(toMonthKey(dateKey));
  }

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Control de medicación</h1>
            <p className="text-sm opacity-70">Marca tus tomas y sigue el progreso de cada tratamiento.</p>
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
            todayKey={todayKey}
            onSubmit={submitTreatment}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <TodayPanel todayKey={todayKey} slots={todaySlots} onToggle={(s) => toggleSlot(todayKey, s)} />

            <section className="space-y-4 glass-card rounded-xl p-5 text-gray-900">
              <MonthCalendar
                monthKey={monthKey}
                todayKey={todayKey}
                selectedKey={selectedKey}
                treatments={treatments}
                intakes={intakes}
                onMonthChange={setMonthKey}
                onSelect={selectDay}
              />
              <DayDetail
                dateKey={selectedKey}
                todayKey={todayKey}
                slots={selectedSlots}
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
            />
          </>
        )}
      </div>
    </div>
  );
}
