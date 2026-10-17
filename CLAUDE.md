# MedTracker

Webapp para el control de toma de pastillas: calendario para marcar las tomas
diarias, tiempo de tratamiento acumulado, nombre de la pastilla y frecuencia.

Mismo stack y arquitectura que LectorHorarios (`C:\Users\ether\IdeaProjects\LectorHorarios`):
SPA Vite + React 18 + TypeScript strict, Tailwind, persistencia local con `idb`
(IndexedDB), PWA instalable en iPhone, despliegue de estáticos en Cloudflare.
Sin backend.

El documento de arquitectura y el plan de implementación están en
@ARQUITECTURA.md — la sección 9 contiene el dominio propuesto
(`Treatment`/`Intake`), los stores, la lógica pura y el orden de los 10 pasos.

Estado actual: pasos 1–9 implementados (scaffold, dominio, stores, lógica, UI, tema, PWA).
Pendiente: paso 10 (repo en GitHub y despliegue en Cloudflare).
