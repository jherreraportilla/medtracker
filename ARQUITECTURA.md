# Arquitectura de LectorHorarios (y plantilla para replicar)

Documento de referencia para reutilizar este stack en una webapp nueva.
Parte 1: cómo está montado este proyecto. Parte 2: cómo aplicarlo a la app de
control de toma de pastillas.

---

## 1. Visión general

SPA 100% cliente, sin backend. Todo el procesamiento y la persistencia ocurren
en el navegador; se despliega como estáticos y funciona offline como PWA
instalable (caso de uso principal: iPhone / Safari → «Añadir a pantalla de inicio»).

```
Vite + React 18 + TypeScript (strict)
        │
        ├── Tailwind CSS 3 (utilidades, sin componentes de librería)
        ├── vite-plugin-pwa (manifest + Workbox service worker)
        ├── idb (wrapper tipado de IndexedDB) ──► persistencia local
        └── build estático ──► Cloudflare Workers assets (wrangler.jsonc)
```

### Principios que rigen el proyecto

1. **Sin servidor, sin cuentas, sin red.** Si un dato se puede calcular o
   guardar en el dispositivo, no sale del dispositivo.
2. **Estado en el componente raíz.** `App.tsx` es el único dueño del estado;
   los componentes son presentacionales y reciben `props` + callbacks. No hay
   Zustand, Context ni TanStack Query porque no hay servidor.
3. **Lógica fuera de los componentes.** Todo lo que no es render vive en
   `src/utils/` como funciones puras o módulos de almacenamiento.
4. **Tipos primero.** `src/types/` define el dominio; los módulos de
   persistencia importan esos tipos, nunca los redefinen.
5. **UI minimalista.** Paleta emerald/gray, tarjetas `rounded-xl border bg-white
   shadow-sm`, sin emojis ni iconografía externa (SVG inline de Heroicons
   copiado a mano).

---

## 2. Estructura de ficheros

```
index.html                  Entrada Vite + metas PWA/iOS
vite.config.ts              Plugins react + VitePWA (manifest y Workbox)
tailwind.config.js          content: index.html + src/**/*.{ts,tsx}
postcss.config.js           tailwindcss + autoprefixer
tsconfig.json               strict, noUnusedLocals/Parameters, jsx: react-jsx
wrangler.jsonc              Despliegue: assets ./dist, SPA fallback
public/
  icon.svg                  Icono PWA (any + maskable)
  apple-touch-icon.svg      Icono iOS
src/
  main.tsx                  createRoot + registerSW({ immediate: true })
  index.css                 @tailwind + .app-shell con variables CSS de tema
  App.tsx                   Estado global, orquestación, layout
  types/
    schedule.ts             Tipos del dominio
  components/               Presentacionales, un fichero por componente
  utils/                    Parsers, stores, helpers puros
```

Convenciones:

- Componentes: `PascalCase.tsx`, export nombrado (`export function DayCard`).
  Interfaz de props local llamada `Props`.
- Utils: `camelCase.ts`, exports nombrados de funciones.
- `App.tsx` es el único `export default`.
- Nombres de código en inglés; textos de UI en español.

---

## 3. Capa de estado (`App.tsx`)

Un `useState` por preocupación, sin reducers:

```tsx
const [query, setQuery] = useState('');
const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
const [history, setHistory] = useState<HistoryEntry[]>([]);
```

Patrones que conviene copiar:

**Carga inicial desde IndexedDB con fallo silencioso** (`App.tsx:46-48`):

```tsx
useEffect(() => {
  listHistory().then(setHistory).catch(() => setHistory([]));
}, []);
```

**Estado derivado del DOM vía variables CSS** (`App.tsx:63-79`): en vez de pasar
colores por props a 10 componentes, se escriben custom properties en
`document.documentElement` y `.app-shell` las consume. Un solo `useEffect`
reacciona a los cambios de tema.

**Blob URLs con limpieza** (`App.tsx:50-61`): el `useEffect` que crea una
`URL.createObjectURL` devuelve siempre un cleanup que hace `revokeObjectURL`,
y los setters la revocan antes de reemplazarla.

**Operación larga con mensaje de progreso**: `loading` + `loadingMsg` separados,
el callback de progreso actualiza el texto (`OCR: recognizing (42%)`).

**Import dinámico para dependencias pesadas** (`App.tsx:119`): `tesseract.js`
solo se descarga si el usuario sube una imagen.

```tsx
const { extractPositionedTextFromImage } = await import('./utils/imageOcr');
```

---

## 4. Persistencia

Tres niveles según el tipo de dato:

| Dato | Mecanismo | Módulo |
|---|---|---|
| Preferencia simple (color de fondo) | `localStorage` | `utils/themeStore.ts` |
| Flag de UI descartable | `localStorage` directo | `components/IosInstallHint.tsx` |
| Registros estructurados (historial) | IndexedDB vía `idb` | `utils/historyStore.ts` |
| Binarios (imagen de fondo) | IndexedDB, store aparte | `utils/bgImageStore.ts` |

### Plantilla de store IndexedDB

`utils/historyStore.ts` es la plantilla a copiar. Esqueleto:

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface HistoryDB extends DBSchema {
  entries: {
    key: string;
    value: HistoryEntry;
    indexes: { 'by-createdAt': number };
  };
}

const DB_NAME = 'lector-horarios';
const DB_VERSION = 1;
const STORE = 'entries';

let dbPromise: Promise<IDBPDatabase<HistoryDB>> | null = null;

function getDb(): Promise<IDBPDatabase<HistoryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HistoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('by-createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}
```

Claves del patrón:

- **Promesa de DB memoizada** a nivel de módulo: `openDB` se llama una sola vez.
- **`DBSchema` tipado**: `db.put`/`db.get` quedan type-safe, sin `as`.
- **API del store = funciones async planas** (`saveX`, `listX`, `deleteX`,
  `clearX`) que devuelven tipos del dominio. El componente nunca ve `IDBPDatabase`.
- **IDs generados en cliente**: `` `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` ``.
- **Orden por índice**: `getAllFromIndex(STORE, 'by-createdAt')` + `.reverse()`
  para tener el más reciente primero (equivalente al «ordenación explícita»
  que se usa en paginación de backend).
- **Bases de datos separadas por dominio**: el historial y el tema no comparten
  DB, así una migración de una no afecta a la otra.

`localStorage` siempre envuelto en `try/catch`: Safari en modo privado lanza al
escribir (`utils/themeStore.ts:14-20`).

---

## 5. Tema con contraste automático

Pieza reutilizable tal cual. `utils/contrast.ts` implementa luminancia relativa
y ratio de contraste WCAG para decidir si el texto debe ser claro
(`#f9fafb`) u oscuro (`#111827`) sobre el fondo elegido:

```ts
export function getTextColorForBackground(hex: string): 'light' | 'dark'
export function getBackgroundContrast(hex: string): BackgroundContrast // incluye ratio e isLow (< 4.5)
```

El flujo completo:

1. `BackgroundColorPicker` ofrece paleta + `<input type="color">` + subida de imagen.
2. `onPreview` / `onPreviewEnd` permiten previsualizar sin persistir.
3. `App.tsx` calcula el color de texto y escribe `--app-bg`, `--app-text`,
   `--app-bg-image` en `:root`.
4. Con imagen de fondo se superpone un *scrim* (`linear-gradient` semiopaco) en
   el sentido contrario al texto para garantizar legibilidad.
5. Las imágenes se reescalan a 2048 px de lado largo y se guardan como JPEG 0.82
   antes de ir a IndexedDB (`utils/bgImageStore.ts:31-56`).

---

## 6. PWA

`vite.config.ts` con `VitePWA`:

- `registerType: 'autoUpdate'` + `registerSW({ immediate: true })` en `main.tsx`.
- `manifest`: `display: 'standalone'`, `lang: 'es'`, `theme_color` emerald-600
  (`#059669`), icono SVG con `purpose: 'any'` y `'maskable'`.
- `workbox.globPatterns` precachea js/css/html/svg/png/ico/woff2.
- `runtimeCaching` con `CacheFirst` para assets grandes de terceros.

`index.html` añade las metas específicas de iOS, que el manifest no cubre:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Horarios" />
<link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
```

`IosInstallHint` detecta iOS Safari no instalado y sugiere añadir a pantalla de
inicio (importante: Safari purga IndexedDB de webs no instaladas tras ~7 días de
inactividad). Se descarta con un flag en `localStorage`.

---

## 7. Patrones de UI reutilizables

- **Contenedor**: `<div className="mx-auto max-w-6xl px-4 py-8 space-y-6">`.
- **Tarjeta/panel**: `rounded-xl border border-gray-100 bg-white p-5 text-gray-900 shadow-sm`.
  Nota: los paneles fijan `text-gray-900` propio para no heredar `--app-text`
  cuando el fondo de la app es oscuro.
- **Mapas de estilo por estado** en lugar de condicionales en el JSX
  (`DayCard.tsx:3-25`):

  ```ts
  const CARD_STYLES: Record<DayStatus, string> = {
    work: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    off: 'bg-gray-100 border-gray-200 text-gray-700',
    …
  };
  const STATUS_LABELS: Record<DayStatus, string> = { work: 'Trabajo', … };
  ```

- **Variante `compact`** por prop booleana con dos `return` distintos, en vez de
  dos componentes.
- **Secciones colapsables**: `useState(false)` + `aria-expanded` + chevron SVG
  con `transition-transform rotate-90` (`HistoryList.tsx:106-121`).
- **Error inline**: `rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700`.
- **Grid responsive sin media queries**:
  `style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))' }}`.
- **Tabla ancha en móvil**: contenedor `overflow-x-auto -mx-4 px-4` + hijo con
  `min-w-[44rem]`.
- **Fechas a UI** con `toLocaleString('es-ES', { … })`, nunca formateo manual.
- **Acciones destructivas** con `confirm()` antes de ejecutar.

---

## 8. Despliegue

```
npm run dev       # vite
npm run build     # tsc -b && vite build  →  dist/
npm run preview
```

Repo en GitHub (`jherreraportilla/LectorHorarios`); push a `main` dispara el
despliegue automático en Cloudflare. `wrangler.jsonc` sirve `./dist` con
`not_found_handling: "single-page-application"`.

Residuos a no replicar: `pom.xml`, `.mvn/`, `src/main/java/` y `src/test/` son
restos de un esqueleto Maven anterior. El proyecto nuevo debe nacer solo con
`package.json`.

---

## 9. Replicar en la app de pastillas («Control de medicación»)

### Qué se copia tal cual

| Fichero | Cambios |
|---|---|
| `vite.config.ts` | Nuevo `manifest` (nombre, descripción, colores); fuera `runtimeCaching` de tesseract |
| `index.html` | Nuevos títulos y metas iOS |
| `tailwind.config.js`, `postcss.config.js`, `tsconfig*.json` | Sin cambios |
| `wrangler.jsonc` | Cambiar `name` |
| `src/main.tsx`, `src/index.css` | Sin cambios |
| `utils/contrast.ts`, `utils/themeStore.ts`, `utils/bgImageStore.ts` | Sin cambios (renombrar claves de DB/localStorage) |
| `components/BackgroundColorPicker.tsx`, `components/IosInstallHint.tsx` | Solo textos |
| `utils/historyStore.ts` | Plantilla para los stores nuevos |

### Qué no hace falta

`pdfjs-dist`, `tesseract.js`, `utils/pdfParser.ts`, `utils/imageOcr.ts`,
`utils/imagePreprocess.ts`, `utils/scheduleParser.ts`, `utils/thumbnail.ts`,
`utils/coworkers.ts`, `components/UploadZone.tsx`, `components/DebugDump.tsx`,
`components/EmployeeSearch.tsx`.

Dependencias resultantes: `react`, `react-dom`, `idb`, `vite-plugin-pwa`.

### Dominio propuesto — `src/types/treatment.ts`

```ts
export type FrequencyKind = 'daily' | 'intervalDays' | 'weekdays';

export interface Frequency {
  kind: FrequencyKind;
  timesPerDay: number;      // tomas por día activo
  intervalDays?: number;    // kind === 'intervalDays' (cada N días)
  weekdays?: number[];      // kind === 'weekdays', 0=domingo … 6=sábado
  times?: string[];         // horas orientativas 'HH:mm', length === timesPerDay
}

export interface Treatment {
  id: string;
  name: string;             // nombre de la pastilla
  dose?: string;            // '500 mg', '1 comprimido'
  frequency: Frequency;
  startDate: string;        // 'YYYY-MM-DD' en hora local
  endDate?: string;         // undefined = tratamiento abierto
  notes?: string;
  color: string;            // hex para tarjetas y puntos del calendario
  archived: boolean;
  createdAt: number;
}

export interface Intake {
  id: string;               // `${treatmentId}|${date}|${slot}` → idempotente
  treatmentId: string;
  date: string;             // 'YYYY-MM-DD' del día al que cuenta la toma
  slot: number;             // 0 … timesPerDay-1
  takenAt: number;          // Date.now() del momento de marcarla
}
```

Decisión clave: `Intake.id` es determinista a partir de
`treatmentId + date + slot`. Así marcar/desmarcar es `put`/`delete` sin
consultar antes, y nunca se duplican tomas del mismo hueco.

**Fechas**: aquí no hay backend, y el usuario marca «hoy» en su zona local, así
que las fechas de día se guardan como `'YYYY-MM-DD'` **en hora local** (no UTC
ni `toISOString()`, que desplazaría el día en España). Los instantes
(`takenAt`, `createdAt`) sí son epoch millis. Helper obligatorio en
`utils/dates.ts`:

```ts
export function toLocalDateKey(d: Date): string   // 'YYYY-MM-DD' local
export function fromLocalDateKey(key: string): Date
export function addDays(key: string, n: number): string
export function daysBetween(fromKey: string, toKey: string): number
```

### Stores — `utils/treatmentStore.ts` e `utils/intakeStore.ts`

Una sola base (`'pill-tracker'`, versión 1) con dos object stores, siguiendo la
plantilla de `historyStore.ts`:

```ts
interface PillDB extends DBSchema {
  treatments: {
    key: string;
    value: Treatment;
    indexes: { 'by-createdAt': number };
  };
  intakes: {
    key: string;
    value: Intake;
    indexes: { 'by-date': string; 'by-treatment': string };
  };
}
```

API expuesta:

```ts
// treatments
listTreatments(): Promise<Treatment[]>
saveTreatment(data: Omit<Treatment, 'id' | 'createdAt'>): Promise<Treatment>
updateTreatment(t: Treatment): Promise<void>
deleteTreatment(id: string): Promise<void>   // borra también sus intakes

// intakes
listIntakesBetween(fromKey: string, toKey: string): Promise<Intake[]>  // índice by-date
listIntakesForTreatment(treatmentId: string): Promise<Intake[]>
markIntake(treatmentId: string, date: string, slot: number): Promise<Intake>
unmarkIntake(treatmentId: string, date: string, slot: number): Promise<void>
```

`deleteTreatment` debe borrar tratamiento e intakes en **una sola transacción**
`db.transaction(['treatments', 'intakes'], 'readwrite')`.

### Lógica pura — `utils/schedule.ts` y `utils/stats.ts`

Funciones sin IndexedDB ni React, fáciles de verificar:

```ts
// ¿toca tomar este tratamiento ese día?
isDueOn(treatment: Treatment, dateKey: string): boolean

// huecos esperados de un día, cruzados con lo ya marcado
buildDaySlots(treatments: Treatment[], intakes: Intake[], dateKey: string): DaySlot[]

// progreso del tratamiento
treatmentProgress(treatment: Treatment, intakes: Intake[], todayKey: string): {
  dayNumber: number;        // día de tratamiento en curso (1-based)
  totalDays?: number;       // si hay endDate
  expectedIntakes: number;
  takenIntakes: number;
  adherence: number;        // 0..1
  currentStreak: number;    // días consecutivos completos
  longestStreak: number;
}
```

`dayNumber` sale de `daysBetween(startDate, todayKey) + 1`. La adherencia solo
cuenta días ya pasados o el actual, nunca el futuro.

### Componentes

```
App.tsx                 Estado: treatments, intakes del mes visible, monthKey, bg
components/
  TreatmentForm.tsx     Crear/editar: nombre, dosis, frecuencia, fechas, color
  TreatmentList.tsx     Tarjetas con progreso; colapsable como HistoryList
  TodayPanel.tsx        Tomas de hoy con checkbox grande por hueco
  MonthCalendar.tsx     Rejilla 7 columnas, un punto por tratamiento
  DayDetail.tsx         Día seleccionado: marcar/desmarcar tomas pasadas
  ProgressSummary.tsx   Día N de tratamiento, adherencia, racha
  BackgroundColorPicker.tsx
  IosInstallHint.tsx
```

El `MonthCalendar` reutiliza la estructura de `MonthlyGrid`
(`ScheduleView.tsx:97-134`): cabecera de 7 días, `grid grid-cols-7 gap-2`,
celdas vacías como `border-dashed`, y `overflow-x-auto -mx-4 px-4` si hiciera
falta ancho mínimo. El estado por día se pinta con un `Record` de clases como
`CARD_STYLES`:

```ts
type DayState = 'complete' | 'partial' | 'missed' | 'notDue' | 'future';
```

`complete` → emerald, `partial` → amber, `missed` → rose, `notDue` → gray,
`future` → borde discontinuo.

### Orden de implementación sugerido

1. Scaffold: `package.json`, configs, `index.html`, `main.tsx`, `index.css`,
   iconos SVG en `public/`.
2. `types/treatment.ts` + `utils/dates.ts`.
3. Stores IndexedDB + `utils/schedule.ts` (`isDueOn`, `buildDaySlots`).
4. `App.tsx` mínima + `TreatmentForm` + `TreatmentList`.
5. `TodayPanel` con marcar/desmarcar.
6. `MonthCalendar` + `DayDetail`.
7. `utils/stats.ts` + `ProgressSummary`.
8. Tema (`contrast.ts`, `themeStore.ts`, `BackgroundColorPicker`) e
   `IosInstallHint`.
9. PWA: manifest, verificación de instalación en iPhone.
10. `wrangler.jsonc`, repo nuevo en GitHub y despliegue en Cloudflare.
