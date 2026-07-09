# Resumen de Cierre Operativo (Fase 7.5)

> Estado: completada, verificada y validada con typecheck, tests unitarios e integración, y build de producción exitoso.

Se han cerrado todos los pendientes operativos de las fases anteriores que se agruparon en esta Fase 7.5 de cierre antes de pasar a la Fase 8 (Históricos y leyendas).

## Logros por pendiente

### 1. Notificaciones Push Reales
- **Cifrado nativo (RFC 8188)**: Se ha implementado el empaquetado y cifrado criptográfico `aes128gcm` de forma nativa en [service.ts](file:///c:/Users/galvi/Documents/Morvedre%20core/lib/push/service.ts) usando la librería `crypto` de Node.js, descartando la dependencia de `web-push` que causaba fallos en el empaquetado de `pnpm` y Next.js.
- **Firma VAPID (RFC 8292)**: Implementado el flujo de firma JWT ES256 (IEEE P1363 raw) cargando las claves VAPID en formato JWK de forma nativa.
- **Flujo de baja inteligente**: El servicio comprueba la respuesta del navegador del usuario (FCM, Mozilla, Apple). Si detecta un código HTTP `404` o `410` (suscripción caducada o permiso revocado), automáticamente cambia la suscripción a `enabled = false` en la base de datos de Supabase para optimizar futuros envíos.
- **UI en perfil**: Componente de configuración y prueba funcional integrado en `/notifications`.

### 2. Tienda
- **Exportación agrupada**: Implementada la ruta [export/route.ts](file:///c:/Users/galvi/Documents/Morvedre%20core/app/api/shop/orders/export/route.ts) para generar un archivo Excel `.xlsx` con dos hojas: `Agrupado` (producto, talla, cantidad, importe total, compradores) y `Detalle` (desglose por pedido).
- **Integración**: Acceso habilitado para administradores desde el panel de gestión de la tienda en `/admin/shop`.

### 3. Noticias
- **Cron de limpieza**: Añadido el cron job de Postgres `morvedre_archive_expired_news` en la base de datos para archivar periódicamente de forma automática las noticias expiradas invocando la función `archive_expired_news()`.

### 4. Tesorería
- **Envío por email**: Añadido el flujo en [treasury.ts](file:///c:/Users/galvi/Documents/Morvedre%20core/server/actions/admin/treasury.ts) para enviar el Excel de cierre mensual a través del cliente de Resend con un layout HTML limpio y la hoja de cálculo generada adjunta. El estado del cierre cambia a `sent` una vez enviado.
- **Recordatorio de pagos**: Generación automática de notificaciones in-app y push de recordatorio el día 25 de cada mes a los perfiles que tengan deudas acumuladas en tesorería (`morvedre_monthly_payment_reminders` cron en base de datos).

### 5. Seguridad de contraseñas en Supabase Auth
- **Riesgo aceptado**: Se acepta mantener el plan free de Supabase sin protección avanzada contra contraseñas filtradas (que requiere plan Pro o superior). Se mantiene la protección robusta por defecto de contraseñas de al menos 8 caracteres con cambio obligatorio de contraseña temporal.

---

## Verificación final de calidad

```bash
# Typecheck de TypeScript limpio
pnpm run typecheck
$ tsc --noEmit
# Completado con éxito sin errores

# Tests de la suite Vitest pasados
pnpm run test:run
Test Files  23 passed (23)
Tests       449 passed | 22 skipped (471)

# Build de producción exitoso
pnpm run build
# Compilación web con éxito y generación de páginas estáticas/dinámicas completa
```

Con la solución de este módulo push, la **Fase 7.5 está oficialmente completada al 100%** y el proyecto queda en estado listo para iniciar la **Fase 8 (Históricos y leyendas)**.
