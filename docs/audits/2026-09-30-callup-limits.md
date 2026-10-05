# Mínimos de convocatoria y portero único — 30 de septiembre de 2026

## Decisiones implementadas

- Core: mínimo 8 convocados por equipo en Benjamín y Alevín; 9 en Infantil.
- Demo: mismo mínimo, excepto Morvedre Benjamín, que puede tener 7 niños por autorización expresa para el torneo no oficial. El rival necesita 8. La excepción figura en `docs/decisions.md` de la demo.
- Siempre debe estar inscrito al menos uno de los gorros 1/13.
- El único portero inscrito queda exento automáticamente del descanso. Se retira la casilla de activación. Con dos porteros inscritos se conserva el control de rotación.
- La edición conserva el estado transitorio sin gorro, pero no permite guardar una convocatoria incompleta. El reemplazo con traslado de estadísticas mantiene el número de convocados.

## Validación

- Core: 70 pruebas superadas de convocatoria, historial, porteros y participación en 5 archivos.
- Core: comprobación completa TypeScript correcta (`tsc --noEmit`, salida 0).
- Demo: 127 pruebas superadas en 8 archivos; compilación y TypeScript correctos. Versión local `morvedre-acta-demo-710a8f2718bd`.
- Pruebas nuevas reproducían los fallos antes de corregirlos: mínimos no aplicados y aviso de descanso al único portero.
- Los controles bloquean quitar un convocado por debajo del mínimo o eliminar el último portero. El aviso usa texto azul oscuro, fondo ámbar y borde oscuro; permanece junto a los controles inferiores.
- Core comprueba la categoría real del partido al guardar la convocatoria, editarla desde el acta y empezar un cuarto. La demo comprueba también las escrituras en su almacenamiento local.

## Pendientes de entorno

La compilación completa de Core se interrumpió por falta de memoria del ordenador. La comprobación visual quedó pendiente porque el navegador integrado dejó de responder a la creación de pestañas y a la navegación. No se reinició el servidor de Core ni se publicaron las aplicaciones. Los datos del partido del usuario no se modificaron.

Registros locales de Core: `tmp/acta-audit/roster-ui-tests.log`, `roster-typecheck.log`, `minimum-core-build.log`. Registros de la demo: `docs/evidence/minimum-rules-tests.log` y `minimum-rules-build.log`.
