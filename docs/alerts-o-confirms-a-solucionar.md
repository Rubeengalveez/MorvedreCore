# Auditoría y Plan de Acción: Eliminación de Alerts y Confirms Nativos

> **Estado**: Planificado  
> **Fecha**: 15 de septiembre de 2026  
> **Objetivo**: Erradicar cualquier diálogo modal nativo del navegador (`window.confirm`, `confirm`, `alert`) y sustituirlos por paneles inferiores controlados (*bottom sheets*) integrados en la identidad visual y adaptados al uso móvil PWA.

---

## 1. Por qué no pueden estar en Morvedre Core

Morvedre Core es una **Progressive Web App (PWA)** orientada a teléfonos móviles (jugadores en la piscina, entrenadores a pie de campo, familias en las gradas). El uso de cuadros de diálogo nativos del motor del navegador (`alert()`, `confirm()`, `prompt()`) es inaceptable por las siguientes razones:

1. **Ruptura de la experiencia de aplicación nativa**:
   - Muestran ventanas emergentes grises genéricas del sistema operativo con títulos del tipo *"localhost:3000 dice:"* o el dominio web, delatando que es una web embebida y rompiendo el aspecto visual del club (`#0A2E5C`, `#FF6B35`, tipografías y bordes redondeados).
2. **Bloqueo síncrono del hilo de JavaScript**:
   - `window.confirm()` y `window.alert()` detienen por completo el hilo principal del navegador. Si hay animaciones, transiciones de vista (View Transitions) o sincronización en segundo plano con IndexedDB/Supabase, se congelan en seco.
3. **Ergonomía táctil deficiente (antipatrón móvil)**:
   - En pantallas móviles (iOS y Android), los botones de aceptar/cancelar de un `confirm` nativo aparecen pequeños y centrados o en la parte superior, lejos de la zona natural del pulgar. La regla del proyecto exige áreas de contacto táctiles de al menos 48×48px (`min-h-12 touch-manipulation`) en la zona inferior.
4. **Falta de control de estado y accesibilidad**:
   - Un `confirm` nativo no permite estados de carga (*spinners* mientras se procesa la acción destructiva en el servidor), no informa de errores en contexto y no respeta las directrices de accesibilidad ARIA con animaciones de entrada y salida controladas.
5. **Riesgo de bloqueo en PWA**:
   - Navegadores como Safari o Chrome en Android pueden suprimir automáticamente los diálogos si se activan de forma consecutiva o si el usuario marca "impedir que esta página cree diálogos adicionales".

---

## 2. Estándar de sustitución: Bottom Sheets Controlados

Todas las confirmaciones de acciones destructivas o de alto impacto se deben resolver mediante **barras/láminas inferiores (*bottom sheets*) controladas**, siguiendo el patrón ya establecido en [`components/ui/sheet.tsx`](file:///c:/Users/galvi/Documents/Morvedre%20core/components/ui/sheet.tsx) y [`components/ui/confirm-submit.tsx`](file:///c:/Users/galvi/Documents/Morvedre%20core/components/ui/confirm-submit.tsx).

### Características del componente de confirmación:
- **Deslizamiento inferior**: Se abre desde la parte baja de la pantalla (`SheetContent size="sm"`), dentro del alcance directo del pulgar.
- **Jerarquía visual clara**:
  - Título en negrita (`font-extrabold`) explicando la acción.
  - Descripción breve del impacto (ej. *"No se podrá deshacer"* o *"Dejará de aparecer en las listas"*).
  - Botón de confirmación prominente (`variant="danger"`, altura `min-h-12`, ancho completo).
  - Botón secundario de cancelación ("Cancelar" o "Mantener"), que cierra la lámina sin alterar nada.
- **Manejo de área segura (*safe area*)**:
  - `pb-[max(1.25rem,env(safe-area-inset-bottom))]` para que los botones nunca queden ocultos tras la barra de inicio de iOS o Android.
- **Estado de carga**:
  - Mientras el Server Action se ejecuta (mediante `isPending` o `useTransition`), el botón de confirmación se desactiva y muestra un indicador de progreso.

---

## 3. Inventario de Casos Detectados (7 Ocurrencias)

Se ha realizado una búsqueda recursiva en todo el árbol de código (`app/`, `components/`, `lib/`, `server/`).  
**Resultado**: 0 `alert()` en código de producción, **7 `confirm()` / `window.confirm()` nativos**.

| # | Archivo y Línea | Contexto y Flujo | Mensaje Nativo Actual | Acción Destructiva |
|---|---|---|---|---|
| **1** | [`components/swim-times/swim-history-list.tsx:113`](file:///c:/Users/galvi/Documents/Morvedre%20core/components/swim-times/swim-history-list.tsx#L113) | **Tiempos de natación**: Entrenador anula una toma de tiempo registrada. | `"¿Anular esta anotación? Dejará de aparecer en el perfil y los rankings."` | Anulación lógica de registro en DB (`annulSwimTimeRecordAction`). |
| **2** | [`app/(app)/admin/shop/_components/shop-editor-form.tsx:125`](file:///c:/Users/galvi/Documents/Morvedre%20core/app/%28app%29/admin/shop/_components/shop-editor-form.tsx#L125) | **Tienda (Admin)**: Directiva elimina un producto del catálogo. | `"¿Eliminar este producto? No se puede deshacer."` | Eliminación de producto en catálogo (`deleteShopProductAction`). |
| **3** | [`app/(app)/admin/matches/[id]/_components/callup-list.tsx:112`](file:///c:/Users/galvi/Documents/Morvedre%20core/app/%28app%29/admin/matches/%5Bid%5D/_components/callup-list.tsx#L112) | **Convocatorias de partido**: Entrenador quita a un jugador convocado. | `"¿Quitar a [Nombre] de la convocatoria?"` | Baja de jugador convocado (`removeFromCallupAction`). |
| **4** | [`app/(app)/admin/trainings/_components/training-block-card.tsx:76`](file:///c:/Users/galvi/Documents/Morvedre%20core/app/%28app%29/admin/trainings/_components/training-block-card.tsx#L76) | **Entrenamientos (Admin)**: Entrenador borra un bloque recurrente de entrenamientos. | `"¿Eliminar el bloque [Nombre]? Se borrarán sus sesiones futuras."` | Borrado de bloque y sesiones asociadas (`deleteTrainingBlockAction`). |
| **5** | [`app/(app)/admin/families/_components/families-manager.tsx:315`](file:///c:/Users/galvi/Documents/Morvedre%20core/app/%28app%29/admin/families/_components/families-manager.tsx#L315) | **Familias (Admin)**: Directiva desvincula a un padre/madre/tutor de un jugador. | `"¿Eliminar el vínculo entre [Padre] y [Hijo]?"` | Ruptura de relación familiar en DB (`unlinkFamilyAction`). |
| **6** | [`app/(app)/admin/teams/[id]/_components/roster-manager.tsx:338`](file:///c:/Users/galvi/Documents/Morvedre%20core/app/%28app%29/admin/teams/%5Bid%5D/_components/roster-manager.tsx#L338) | **Equipos (Admin/Coach)**: Se da de baja a un jugador de la plantilla de un equipo. | `"¿Quitar a [Nombre] de este equipo?"` | Eliminación de asignación a plantilla (`removeRosterPlayerAction`). |
| **7** | [`app/(app)/admin/teams/[id]/_components/staff-manager.tsx:322`](file:///c:/Users/galvi/Documents/Morvedre%20core/app/%28app%29/admin/teams/%5Bid%5D/_components/staff-manager.tsx#L322) | **Equipos (Admin/Coach)**: Se desvincula a un técnico/delegado del cuerpo técnico. | `"¿Quitar a [Nombre] del equipo?"` | Eliminación de asignación de staff (`removeStaffMemberAction`). |

---

## 4. Plan de Acción Técnico

### Paso 1: Componente Universal `ConfirmActionSheet`
En la actualidad existe [`components/ui/confirm-submit.tsx`](file:///c:/Users/galvi/Documents/Morvedre%20core/components/ui/confirm-submit.tsx), pero está ligado a enviar formularios (`<form id="...">`).  
Los 7 casos detectados ejecutan callbacks asíncronos programáticos (`handleRemove(id)`, `handleCancel(id)`, `handleUnlink(row)`).

Se implementará un componente declarativo y táctil en `components/ui/confirm-action-sheet.tsx`:
```tsx
interface ConfirmActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "pool";
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
}
```
**Comportamiento:**
- Renderiza el `Sheet` con animación inferior limpia.
- Muestra el título y la descripción con tipografía institucional.
- Contiene dos botones táctiles grandes:
  - **Confirmar** (Rojo peligro o Azul piscina según la variante, con spinner si `isPending` está activo).
  - **Cancelar** (Gris suave / borde, cierra la lámina).
- Soporta tecla `Escape`, clic fuera del overlay y safe-area del dispositivo móvil.

### Paso 2: Refactorización por Módulos
Sustituir el patrón `if (!window.confirm(...)) return;` en cada una de las 7 vistas por un estado controlado que abre el `ConfirmActionSheet`:

1. **Módulo de Tiempos de Natación (`components/swim-times/swim-history-list.tsx`)**:
   - Mantener estado `pendingAnnulId: string | null`.
   - Al pulsar "Anular", fijar `setPendingAnnulId(id)`.
   - El sheet muestra el nombre y fecha de la toma y solicita la anulación controlada.
2. **Módulo de Equipos y Plantillas (`roster-manager.tsx`, `staff-manager.tsx`)**:
   - Mantener estado del miembro seleccionado para desvincular.
   - Confirmar expulsión o baja del equipo con el sheet inferior.
3. **Módulo de Partidos y Convocatorias (`callup-list.tsx`)**:
   - Confirmar la desconvocatoria del jugador con su dorsal y nombre.
4. **Módulo de Entrenamientos (`training-block-card.tsx`)**:
   - Confirmar el borrado del bloque y alertar de la eliminación de sesiones futuras.
5. **Módulo de Familias (`families-manager.tsx`)**:
   - Confirmar la desvinculación tutor-jugador con nombres explícitos.
6. **Módulo de Tienda (`shop-editor-form.tsx`)**:
   - Reemplazar `confirm()` por el `ConfirmActionSheet` (o conectar con `ConfirmSubmit` ya existente).

### Paso 3: Regla de Linter / Verificación Preventiva
Para evitar que en futuras iteraciones se vuelva a colar un `confirm()` o `alert()`:
- Agregar regla en ESLint (`no-alert`: `"error"`) en la configuración del proyecto, prohibiendo llamadas a `window.alert`, `window.confirm`, `window.prompt`, `alert`, `confirm` y `prompt`.

### Paso 4: Verificación y Pruebas
- Probar cada uno de los 7 flujos en modo emulación móvil (viewport 360x780 y 390x844).
- Verificar que al pulsar "Cancelar" no se produce ninguna llamada al servidor.
- Verificar que al pulsar "Confirmar" se muestra el estado de carga y se cierra la lámina tras completarse con éxito.
- Ejecutar `npm run typecheck`, `npm run lint` y la suite de tests (`npm test:run`).
