# Cierre de limpieza, calidad y rendimiento

Fecha: 2026-07-21

## Alcance

Esta revisión cierra la iteración de Rankings y audita estructura, código muerto, archivos temporales, dependencias, vulnerabilidades, secretos, rendimiento y compilación de producción.

## Rankings

- `Rachas` y `Leyendas` mantienen su identidad visual en accesos horizontales más compactos.
- El ranking muestra la posición de la persona conectada y, para un tutor, las posiciones de sus hijos presentes en el filtro actual.
- Cada acceso calcula su página real en bloques de diez y lleva al puesto exacto, incluido el podio, con un resaltado temporal accesible.
- El desplazamiento respeta `prefers-reduced-motion` y el diseño se comprobó sin desbordamiento a 320 px.

## Limpieza aplicada

- Se eliminaron once componentes y utilidades huérfanos de rediseños anteriores.
- Se retiraron doce capturas temporales de la raíz, una copia local de un adjunto, logs, resultados regenerables y el service worker ficticio de desarrollo.
- Se eliminó un esquema de importación antiguo que duplicaba la implementación activa.
- `public/sw-dev.js` queda ignorado; el service worker de producción sigue generándose desde `app/sw.ts` mediante Serwist.
- Se conserva el material de prueba que sí documenta asistencia, autenticación y experiencia familiar.

## Rendimiento y estructura

- Las consultas independientes de actividad reciente y estadísticas del dashboard empiezan en paralelo con la agenda semanal.
- Las funciones largas de partidos, asistencia, acceso y tienda se revisaron por responsabilidades. Permanecen agrupadas por dominio porque dividirlas sin una frontera transaccional clara aumentaría el acoplamiento; no se aplicaron refactorizaciones mecánicas de riesgo.
- El análisis de código muerto se contrastó con las convenciones de Next.js, Vitest, Serwist y el cargador dinámico de seeds para evitar falsos positivos.

## Dependencias

Actualizaciones compatibles aplicadas:

- `@supabase/ssr` 0.12.0 → 0.12.3
- `@supabase/supabase-js` 2.110.2 → 2.110.7
- `@hookform/resolvers` 5.2.2 → 5.4.0
- `react-hook-form` 7.81.0 → 7.82.0
- `zod` 4.1.12 → 4.4.3
- Tailwind y su plugin PostCSS 4.3.2 → 4.3.3
- `prettier-plugin-tailwindcss` 0.8.0 → 0.8.1

Se retiró `@tanstack/react-table`, que no tenía consumidores. Se mantienen en su versión mayor actual `@types/node`, ESLint, TypeScript y Lucide; actualizarlos implica migraciones independientes y no corrige ningún fallo o vulnerabilidad de este cierre.

## Seguridad

- `pnpm audit`: 0 vulnerabilidades informativas, bajas, moderadas, altas o críticas en 762 dependencias.
- Escaneo de archivos versionados: ninguna clave privada ni token de AWS, GitHub, OpenAI o Stripe.
- Solo `.env.example` está versionado; las credenciales reales permanecen fuera de Git.
- Las referencias a `SUPABASE_SERVICE_ROLE_KEY` son lecturas desde entorno o ejemplos sin valores reales.

## Verificación

- TypeScript estricto: correcto.
- ESLint: correcto.
- Vitest: 46 archivos, 549 pruebas correctas y 22 omisiones intencionales.
- Playwright: 10 pruebas correctas y 5 flujos autenticados omitidos al no inyectar credenciales de prueba.
- Build de producción de Next.js 16.2.10: correcto, incluidas todas las rutas y el bundle de `sw.js`.
- `git diff --check`: sin errores de espacios ni marcadores de conflicto.
