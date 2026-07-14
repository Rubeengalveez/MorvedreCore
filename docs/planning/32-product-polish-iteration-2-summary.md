# Iteración 2 de pulido de producto — cierre

Fecha: 2026-07-14

## Resultado

La iteración deja operativos y cohesionados los flujos de carrito, perfil, personal, jugadores, tienda, equipos, tesorería, rankings, rachas y notificaciones. El panel administrativo ya no depende de una navegación horizontal redundante y muestra únicamente las áreas concedidas al perfil activo.

## Cambios principales

- Carrito reorganizado, aviso al salir sin confirmar, acceso sticky, productos retirados eliminables y teléfono obligatorio en el pedido.
- Galería ampliable con cierre táctil visible y navegación entre imágenes.
- Avatar propio con recorte cuadrado, zoom, validación doble y borde de categoría.
- Edición de perfil simplificada, confirmación y retorno automático al perfil.
- Permisos modulares para personal y acceso específico a tienda, tesorería, equipos, jugadores y el resto de áreas administrativas.
- Pedidos accesibles para una persona poco tecnológica, correo con detalle y exportación Excel completa.
- Jugadores editables y desactivables sin perder históricos ni rankings.
- Plantillas separadas entre categoría propia y refuerzos válidos de la inmediatamente inferior.
- Tesorería por excepción con cuota base, exención, pagador familiar y cierre mensual agrupado.
- Perfil de jugador con foto destacada y estadísticas derivadas por partido.
- Rachas limitadas a partidos realmente jugados por el convocado y entrenamientos de su equipo de origen.
- Rankings menos densos, contexto secundario ordenado y acceso visible a rachas.
- Notificaciones como pantalla completa con filtros, lectura coherente y destinos seguros.
- Skeleton global, cabecera superior sticky, transiciones con reducción de movimiento y consultas superiores más ligeras.

## Base de datos y seguridad

- Las tres migraciones de esta iteración están aplicadas en el proyecto cloud y sincronizadas con los tipos TypeScript.
- Todas las tablas nuevas tienen RLS y las políticas de tienda y tesorería se consolidaron para evitar evaluaciones duplicadas.
- El bucket de avatares permite mostrar las fotos mediante URL pública, pero no listar sus objetos.
- El asesor de rendimiento de Supabase termina sin avisos; solo informa de índices todavía no usados, esperable en datos demo.
- El asesor de seguridad conserva dos avisos aceptados: `archive_season`, protegida por comprobación interna de administrador, y la protección de contraseñas filtradas, no disponible en el plan gratuito.
- `pnpm audit --prod` no encuentra vulnerabilidades conocidas.

## Validación

- TypeScript strict: correcto.
- ESLint: correcto, sin avisos.
- Vitest: 523 pruebas correctas y 22 omitidas por diseño.
- Playwright: 10 pruebas correctas y 2 omitidas por no existir credenciales E2E configuradas.
- Build de producción Next.js: correcto para todas las rutas.
- Asesores Supabase: cero avisos de rendimiento y cero vulnerabilidades críticas.

## Pendiente externo

La revisión visual autenticada automatizada requiere definir `TEST_ADMIN_EMAIL` y `TEST_PASSWORD` para una cuenta E2E dedicada. No se reutilizó ni se forzó el acceso a la cuenta personal del administrador. Las vistas públicas y la redirección de seguridad sí quedaron comprobadas en navegador.
