# Cierre de UX operativa, PWA y acceso

Fecha: 2026-07-14

## Resultado

- Carrito: salida explícita sin envío, conservación de artículos y margen seguro inferior.
- Notificaciones: cabecera adaptable sin solapamiento y acción de lectura completa accesible.
- Cabeceras: patrón compacto compartido en Equipos, Tienda, Carrito, Rankings, Leyendas, Calendario, Noticias, Asistencia y pantallas que ya usaban `AppPageHero`.
- Avatar superior: un único borde con el color derivado de la categoría.
- Equipos: lectura autenticada de `profiles.is_active` corregida para recuperar los recuentos de plantilla.
- Google: origen OAuth corregido para evitar callbacks a `0.0.0.0`; cuenta y proveedor verificados en Supabase.
- Entrenamientos: creación de horario semanal completo por categoría, varios grupos de días/horas, periodos especiales y edición con regeneración segura de sesiones futuras.
- Partidos: formulario guiado con campos obligatorios primero y logística/notas como bloque opcional.
- Calendario: intervalos exactos de inicio y fin en tarjetas y detalle del día.
- PWA: manifiesto con `id`, tres iconos y `display: standalone`; service worker de producción generado y servido correctamente.

## Verificación

- TypeScript estricto: correcto.
- ESLint: correcto.
- Vitest: 40 archivos, 528 pruebas superadas y 22 omitidas por diseño.
- Build de producción Next.js: correcto.
- `manifest.webmanifest`: HTTP 200, `application/manifest+json`, identidad y modo standalone válidos.
- `sw.js`: HTTP 200, JavaScript, 63 089 bytes.

## Nota de instalación móvil

Chrome exige un contexto seguro para instalar una PWA. `localhost` es una excepción solo en el mismo dispositivo; `http://192.168.x.x` desde un móvil no lo es. La validación real debe hacerse en el despliegue HTTPS o en un túnel HTTPS de desarrollo. En modo `next dev` el service worker se desactiva intencionadamente para evitar cachés antiguas durante el desarrollo.
