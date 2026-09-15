# 10 · Partidos, convocatorias, actas y desplazamientos

[Documento general](00-panel-general.md).

## Objetivo

Desde un partido se debe poder programar, convocar, consultar disponibilidad, registrar resultado, validar y organizar viaje. Cada rol ve las tareas que le corresponden y entiende las restricciones.

## Inventario

Alta con rival, equipo, competición, lugar, fecha/hora y logística; filtros de lista; detalle con Convocatoria, Acta, Detalles y Logística. Convocatoria sugerida, modificación y retirada; acta sencilla; integración con acta en directo y viaje. Acciones `createMatch`, `updateMatch`, `setMatchStatus`, `deleteMatch`, `saveMatchSheet`, `validateMatchStats` y acciones de convocados existen.

## Hallazgos y diagnóstico del alta

- **PAR-01, P1 (C/R/H):** `matches/page.tsx` muestra «Nuevo partido» solo con `editableTeams.length > 0`. Si consulta/equipos/permisos no producen opciones, no explica el motivo. La existencia del formulario contradice «función inexistente», pero no invalida la imposibilidad que experimenta Rubén.
- Diagnóstico necesario: misma URL y cuenta reportadas → confirmar versión → inspeccionar equipos cargados → alcance `match_schedule` → permiso de acción y SQL → ensayo sintético de alta. No atribuirlo solo a permisos sin prueba.
- **PAR-02, P2 (C):** equipo inicial es el primero del curso actual, estado Todos y orden ascendente. Puede ocultar otros partidos y priorizar pasados. Creación no hereda filtros gestionados dentro de MatchesList.
- **PAR-03, P2 (C):** `deleteMatch` y desvalidación en rankings tienen capacidad de servidor sin consumidor visible encontrado en app/componentes. Hay que decidir cancelación, borrado de error y corrección validada, no añadir botones indiscriminadamente.
- **PAR-04, P2 (C):** opciones de todas las temporadas y ausencia de filtro explícito para Escuela en la carga de equipos editables.
- **A11Y-02 (C):** detalle usa enlaces con role tab/tablist sin el patrón completo de selección por flechas y panel relacionado.
- Vacío sin temporadas precede al error de carga: puede recomendar crear temporada ante un fallo de consulta.

## Diseño por tareas

**Listado:** Próximos por defecto, equipo «Todos mis equipos», filtro de competición y acceso a Jugados. Cada fila muestra fecha, rival, sede y pendientes: convocatoria, resultado o validación. Crear visible; si no hay equipo editable, explicación contextual y siguiente paso autorizado.

**Detalle:** resumen compacto del partido y tareas. Datos básicos accesibles sin buscar una pestaña al final. Convocatoria, Registro y Viaje con acciones propias. No presentar preparar convocatoria como obligatorio otra vez si ya está hecha.

### Convocatoria

Ver disponibilidad, candidatos elegibles y gorros; selección manual además de propuesta; resumen antes de confirmar; corregir sin duplicar. Mantener límite configurable y reglas de categoría. Distinguir retirado, convocado y disponibilidad familiar.

### Actas

Mantener inversión reciente del acta en directo. La condición actual exige delegación, incluso para admin; no cambiarla como efecto secundario del rediseño. Diferenciar Guardar borrador, Validar y Consultar. Si está bloqueada por validación o acta en directo, explicar por qué y quién puede resolverlo. La corrección excepcional necesita motivo y trazabilidad si se aprueba.

### Viajes

Logística ya enlaza a `/matches/[id]/travel`. Hacer visible activación desde el contexto y conservar vuelta al partido. Auditar allí coches, plazas, salida y compensación con permisos de su flujo. No crear un módulo administrativo de viajes duplicado por defecto.

## Aceptación

Crear partido sintético de equipo actual, editar fecha, convocar, modificar gorro, registrar resultado, validar y volver a lista conservando filtros. Probar admin, entrenador y delegado; Escuela fuera de creación competitiva ordinaria. Cancelación conserva historial; borrado solo para error sin dependencias si se acuerda.

Para acta y viaje: enlaces de ida/vuelta, permiso insuficiente explicado, estado validado y sin conexión. El registro offline conserva su política propia; no extender caché autenticada al resto del panel.

Pendientes: reproducción del caso de Rubén, escrituras sintéticas por rol y regla de reapertura.

## Verificación de entrada de formulario

Se abrió y cerró «Nuevo partido» sin guardar a 320, 390 y 1440 px con demo. La creación no se ha enviado ni se ha reproducido el fallo exacto de Rubén. El selector mostró tres temporadas y 2025/2026 como actual; comprobar datos de temporada antes de atribuir todo el problema a permisos.
