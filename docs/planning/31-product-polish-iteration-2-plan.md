# Iteración 2 de pulido de producto

Fecha: 2026-07-14

## Objetivo

Llevar Morvedre Core a un estado cercano al 90 % de producto final, priorizando los flujos cotidianos de tienda, perfiles, personal, jugadores, tesorería, notificaciones y rankings.

## Principios

- Los permisos son capacidades explícitas y acumulables. Ser personal del club no concede acceso administrativo por sí solo.
- Las mutaciones siguen pasando por Server Actions validadas con Zod; RLS mantiene la defensa en profundidad.
- Un jugador desactivado conserva su histórico y sus rankings, pero desaparece de operativa, plantillas activas, convocatorias y búsquedas normales.
- La tienda es bajo demanda. El carrito debe dejar claro que añadir productos no equivale a enviar un pedido.
- Los avatares admiten únicamente JPEG o PNG de entrada, se recortan a cuadrado y se normalizan en servidor.
- Tesorería trabaja por excepción: cuota mensual heredada, exenciones y ajustes, con agrupación por responsable familiar.
- La interfaz se valida primero a 320–430 px, con objetivos táctiles de 48 px, foco visible y movimiento reducido.

## Entregables

1. Permisos modulares, perfiles activos y Storage seguro para avatares.
2. Carrito rediseñado, advertencia de salida, teléfono de contacto y acceso flotante contextual.
3. Editor de avatar con encuadre, zoom y previsualización circular por categoría.
4. Personal y panel administrativo por capacidades, sin selector horizontal.
5. Gestión de jugadores, equipos y plantillas coherente con categorías y ascensos.
6. Tienda operable por una persona poco tecnológica, email y exportación Excel de pedidos.
7. Tesorería automática por jugador/familia, búsqueda, excepciones y cierre mensual exportable.
8. Rachas y rankings corregidos y menos densos.
9. Notificaciones como pantalla completa, enlaces seguros y lectura consistente.
10. Auditoría de accesibilidad, rendimiento, seguridad, pruebas, build y comprobación visual móvil.

## Validación mínima

- Tests unitarios y de componentes para reglas nuevas.
- ESLint, TypeScript strict y build de producción.
- Auditoría de dependencias y migraciones Supabase sincronizadas.
- Revisión visual autenticada en móvil de los flujos principales.
- Comprobación de permisos positivos y negativos para admin, gestor de tienda, entrenador y miembro sin privilegios.
