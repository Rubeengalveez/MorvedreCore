# Plan de cierre operativo antes de Fase 8

> Objetivo: no empezar Fase 8 hasta cerrar o clasificar explicitamente los pendientes operativos que quedaron repartidos entre fases anteriores.

## Estado por pendiente

| Pendiente | Estado actual | Criterio de cerrado |
| --- | --- | --- |
| Notificaciones push reales | No implementado. Existe service worker base e in-app notifications. | Suscripcion push por perfil, guardado seguro en DB, envio desde eventos clave, permiso UI, prueba en movil/desktop. |
| Envio automatico del cierre de tesoreria por email | Parcial. Existe Resend para solicitudes de acceso y export Excel de cierre. | Boton/accion para enviar cierre, adjuntar Excel, marcar `sent_at/status`, y prueba real con Resend. |
| Recordatorio mensual de pagos mediante cron | No implementado. | Cron real que detecta lineas pendientes y envia email/notificacion a familias antes del cierre mensual. |
| Exportacion de pedidos de tienda agrupados por producto | No implementado. | Ruta admin `.xlsx` agrupada por producto/talla/personalizacion, enlazada desde `/admin/shop`. |
| Cron real para caducidad de noticias | Parcial. Existe `archive_expired_news()`, pero no schedule real. | Migracion con schedule real o endpoint cron protegido; validacion remota. |
| Proteccion contra contrasenas filtradas en Supabase | Bloqueado por plan. La documentacion oficial indica que requiere Pro o superior. | Activado si se sube a Pro, o riesgo aceptado documentado si se mantiene coste 0. |
| Pruebas manuales completas con distintos roles y datos reales | No cerradas como checklist formal. | Checklist por rol completado: admin, coach, delegate, player, parent, directiva/tesoreria/tienda. |

## Alcance de la Fase 7.5

Esta fase no debe meter features nuevas. Solo cerrar deuda operativa ya prometida.

### 1. Tienda

- Crear export Excel agrupado por producto.
- Incluir:
  - producto
  - talla
  - cantidad total
  - importe total
  - pedidos afectados
  - comprador/solicitante
  - estado
- Enlazar desde `/admin/shop`.

### 2. Noticias

- Mantener el filtro actual de expiradas en queries.
- Programar limpieza real para desanclar noticias caducadas.
- Validar que el job existe en Supabase.

### 3. Tesoreria

- Reutilizar el generador Excel actual.
- Extraer generacion del workbook a helper reusable.
- Crear accion/ruta de envio por Resend.
- Actualizar `treasury_period_closures` con:
  - `sent_to_email`
  - `sent_at`
  - `status = 'sent'`
- Preparar recordatorio mensual de lineas pendientes.

### 4. Push

- Crear tabla `push_subscriptions`.
- Crear UI de activacion/desactivacion en perfil/notificaciones.
- Guardar suscripcion con RLS por perfil.
- Enviar push cuando se cree una notificacion in-app.
- Mantener fallback in-app si el navegador no soporta push.

### 5. Seguridad Supabase Auth

- No se puede cerrar en plan gratis si se exige leaked password protection.
- Alternativas:
  - aceptar el warning y documentarlo por coste 0
  - subir a Pro y activar la opcion en Auth settings
- Mantener requisitos actuales:
  - minimo 8 caracteres
  - mayusculas, minusculas y digitos
  - cambio obligatorio de contrasena inicial

### 6. QA manual

- Crear checklist ejecutable por rol.
- Probar con datos reales o seed representativo.
- Registrar resultado y bugs encontrados antes de Fase 8.

## Bloqueos externos

Para cerrar todo al 100% hacen falta:

- `RESEND_API_KEY` real.
- `RESEND_FROM_EMAIL` verificado en Resend.
- Email destino real de tesoreria.
- Claves VAPID para Web Push.
- Confirmar si se acepta mantener Supabase Free sin leaked password protection.
- Dispositivo/navegador real para probar push, idealmente Android Chrome y iOS Safari/PWA.

## Orden recomendado

1. Export tienda agrupado por producto.
2. Cron real de noticias.
3. Email de cierre tesoreria.
4. Recordatorio mensual de pagos.
5. Push real.
6. QA manual por roles.
7. Decision final sobre leaked password protection.

## No avanzar a Fase 8 hasta que

- `pnpm run typecheck` pase.
- `pnpm run test:run` pase.
- `pnpm run build` pase.
- Supabase migrations local/remoto esten alineadas.
- Advisors de seguridad no tengan avisos nuevos por cambios propios.
- Cada pendiente de esta lista este en `cerrado`, `bloqueado por credencial` o `riesgo aceptado`.
