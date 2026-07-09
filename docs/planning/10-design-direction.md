# Dirección de diseño — Morvedre Core

> Decisión tras discovery. Esta es la **estética** y los **patrones de uso** con los que voy a entrar a Fase 0. Si algo te chirría, lo cambiamos antes de tocar código.

## Tesis emocional

**Orgullo de pertenencia.** Cuando un cadete abra la app, lo primero que ve le tiene que decir "esto es TU club, TU gente, TU equipo". No es una herramienta, es el sitio donde vive el equipo.

Esto se traduce en 3 compromisos:

1. **El equipo está presente, no ausente.** En el dashboard no hay un feed genérico: hay "tu próximo partido con el Cadete B". La foto de grupo, el escudo, el color del equipo son protagonistas, no decoración.
2. **El jugador está presente, no diluido.** Foto grande, nombre real, dorsal visible. No es "usuario 47", es "Carlos, dorsal 7, Cadete B".
3. **El agua y el deporte están presentes.** Pictogramas de waterpolo (gorro, balón, ola, silbato) como motivo visual recurrente. No emojis.

## Lo que SÍ (estilo de la casa)

### Tipografía con carácter

- **Display y headings**: **Manrope** (geométrica moderna con peso fuerte). NO Inter, NO Roboto, NO la sans de sistema. Manrope tiene personalidad sin ser gritona.
- **Body**: **Inter** (legibilidad probada en móvil).
- **Numérico**: **JetBrains Mono** (goles, dorsales, %, rankings). Cifras tabulares, alineadas, con peso.

Pesos: 600-800 en headings, 400-500 en body, 500 en mono.

### Tamaño y respiración

- **Body mínimo 16px**. Solo 14px en metadata. NUNCA 12px en contenido importante.
- **Headings 24-40px** según jerarquía.
- **Touch targets ≥ 48×48px**, idealmente 56×56 en CTAs primarias.
- **Padding generoso** pero no excesivo. Cards con 16-20px de padding interno, 12-16px entre cards. NO "mucho espacio en blanco vacío" (eso es minimalismo, lo que no quieres), pero tampoco apretado.

### Color con propósito

Paleta extendida (basada en el logo + la decisión de identidad):

| Token          | Hex       | Uso                                                             |
| -------------- | --------- | --------------------------------------------------------------- |
| `--brand-deep` | `#0A2E5C` | Cabecera, topbar, texto principal                               |
| `--brand-blue` | `#1E5AA8` | Botones primarios, links, foco                                  |
| `--brand-aqua` | `#3FBAC2` | Acento secundario, info, badges                                 |
| `--brand-foam` | `#E8F4F8` | Fondo de tarjetas suaves, hover                                 |
| `--brand-ball` | `#F4C430` | Amarillo balón — highlights, top 1                              |
| `--ink-900`    | `#0F172A` | Texto sobre fondo claro                                         |
| `--ink-600`    | `#475569` | Texto secundario                                                |
| `--ink-300`    | `#CBD5E1` | Bordes, separadores                                             |
| `--paper`      | `#FAFCFE` | Fondo de la app                                                 |
| `--action`     | `#FF6B35` | CTA, "gol", "confirmar"                                         |
| `--success`    | `#10B981` | Confirmado, asistencia, pagado                                  |
| `--warning`    | `#F59E0B` | Pendiente, espera                                               |
| `--danger`     | `#EF4444` | Cancelado, exclusión, error                                     |
| `--team-color` | dinámico  | Color del equipo del jugador actual (chip pequeño en la topbar) |

**Cada equipo tendrá un color identificativo** que el admin elige al crearlo. Se usa como acento en la cabecera de la tarjeta de partido, en el avatar del jugador, en las stats de su equipo. Pequeño, constante, identificativo.

### Componentes signature

1. **Tarjeta de partido** (`MatchCard`)
   - Cabecera con franja de color del equipo rival (8px de alto)
   - Hora grande en mono (32-40px)
   - "vs [rival]" en display 24px
   - Lugar y piscina en ink-600
   - Si el usuario está convocado: bloque grande con "Tu gorro: **#7**" en mono
   - 2 CTAs grandes: "Confirmo" (success) y "No puedo" (ghost)
   - Si NO está convocado: texto gris "No convocado este partido"

2. **Tarjeta de ranking** (`RankingRow`)
   - Posición grande (32-40px, mono)
   - Top 3 con badge dorado/plata/bronce (esquina superior)
   - Avatar del jugador (48px) + nombre
   - Valor de la stat en mono grande
   - Highlight del usuario actual con fondo `--brand-foam`

3. **Tarjeta de jugador** (`PlayerCard`)
   - Avatar grande (64-80px)
   - Nombre + dorsal en mono
   - Categoría como badge pequeño
   - Una línea de "Última: 2 goles contra X" (gamificación implícita)

4. **Bottom nav móvil** (4 destinos)
   - **Inicio** (icon casa)
   - **Calendario** (icon calendario)
   - **Equipo** (icon silbato) — muestra el equipo del perfil activo
   - **Yo** (icon persona)
   - Seleccionado con color del equipo + texto bold

5. **Top bar** (siempre visible)
   - Izquierda: escudo del club (24px) + "Morvedre"
   - Centro: vacío (espacio para título contextual)
   - Derecha: campana notificaciones (con badge) + avatar pequeño del perfil activo

6. **Sheet selector de perfil** (al pulsar avatar)
   - Arrastra desde arriba
   - Lista de hijos con foto + nombre + categoría
   - Botón "Mi perfil" al final
   - El switch se hace con un toque, sin confirmar

7. **Kanban de tienda** (panel de Sol)
   - Columnas con cabecera coloreada por estado
   - Cards con miniatura del producto, nombre, talla, personalización
   - Botón gigante "Exportar a Excel" en la parte superior

### Pictogramas de waterpolo (custom SVG)

Se crearán 6-8 pictogramas custom en 1-stroke para uso recurrente:

- **Gorro de waterpolo** con número (usado en dorsales, convocatorias)
- **Balón amarillo** (usado en "gol", Pichichi, partidos)
- **Ola horizontal** (decorativa en cabeceras y separadores)
- **Silbato** (entrenador, delegado)
- **Portería** (portero)
- **Exclusión** (icono de tarjeta roja estilizada)
- **MVP** (estrella) — si al final lo metemos

Estos iconos son la **firma visual de la app**: si ves un gorro de waterpolo con un 7, sabes que es Morvedre Core. Es lo que la hace **no-genérica**.

### Empty states con voz

Cada pantalla vacía tiene un copy motivador, no "No hay datos":

- Sin partidos: "Tu primer partido está al caer. Vitaliy está preparando la convocatoria."
- Sin goles: "Sé el primero en aparecer en el Pichichi. El sábado tienes tu oportunidad."
- Sin entrenos: "La piscina está tranquila esta semana. Descansa, que luego vuelve el barro."
- Sin noticias: "Sin novedades en el club. Cuando las haya, aparecerán aquí primero."

Tono: segunda persona, cercano, con coletillas del club. NO formal, NO "No hay datos para mostrar".

## Lo que NO (anti-defaults)

❌ **NO paneles admin genéricos** con sidebar gris, tablas densas, breadcrumb. Esto es una app de equipo, no un SaaS.

❌ **NO minimalismo vacío**. Ni "estética Apple" con mucho blanco y poco contenido, ni "estética Notion" con tipografía tímida. La app está viva, con información, color, datos.

❌ **NO sombras pesadas ni glassmorphism**. Bordes claros de 1px en `--ink-300`, separadores finos. Las sombras solo en componentes flotantes (sheet, popover).

❌ **NO emojis como iconos**. Solo Lucide + los pictogramas custom de waterpolo. Los emojis se ven poco serios y no escalan.

❌ **NO gradientes azul-morado AI-default**. El color es plano, decidido, del club.

❌ **NO cards con border-radius de 24px y sombra Tailwind UI**. border-radius 12px en cards, 8px en inputs, 9999px en avatares/badges. Geometría limpia, no blandita.

❌ **NO interacciones confusas**. Cada acción tiene un único camino claro. Si hay confirmación, es obvia. Si hay error, se explica qué pasó y cómo arreglarlo.

## Animación y motion

- **View Transitions nativas** en el cambio entre secciones principales (suave, casi imperceptible)
- **Feedback táctil** en botones: scale 0.97 al pulsar, vuelve a 1 al soltar
- **Números que se animan al cargar** (cuenta de 0 al valor real, 600ms, easing ease-out)
- **Skeleton loaders** en lugar de spinners genéricos (mantiene la estructura)
- **Respeto a `prefers-reduced-motion`**: si el usuario lo tiene activo, todo es instantáneo
- **NADA de animación decorativa**. Una animación tiene que servir a la función o se quita.

## Información architecture (esqueleto)

### Bottom nav (móvil)

1. **Inicio** — Dashboard reactivo (3 niveles: partido/entreno próximo, noticias, stats personales)
2. **Calendario** — Vista mes/semana con entrenos, partidos, eventos
3. **Equipo** — Pantalla específica del equipo del perfil activo (plantilla, próxima convocatoria, último resultado)
4. **Yo** — Mi perfil, mi historial, mis pedidos, configuración, switch de cuenta

### Top bar (siempre)

- Logo + nombre del club (izquierda)
- Título contextual de la pantalla (centro)
- Notificaciones + perfil activo (derecha)

### Acceso rápido desde Inicio

- **Acción inmediata** (top, grande): próximo partido o entreno del perfil activo
- **Tablón** (medio): últimas 3 noticias
- **Stats del perfil** (abajo): goles esta temporada, % asistencia, posición en Pichichi

### Pestañas en Equipo

- Plantilla
- Convocatorias
- Resultados
- Calendario del equipo
- Coches (cuando se active)

## Tamaño tipográfico de cabecera (página principal)

```
# H1 — display 32-40px, weight 800, color brand-deep
## H2 — display 24-28px, weight 700
### H3 — 20px, weight 600
Párrafo — 16-18px, weight 400, line-height 1.5
Caption — 14px, weight 500, color ink-600
Mono destacado — 32-40px, weight 600, para cifras
```

## Resumen ejecutivo

**Morvedre Core se va a ver como el diario del equipo que llevas en el bolsillo**: tipografía con carácter, colores del club, pictogramas de waterpolo, datos grandes y visibles, empty states que te hablan de tú, y un orgullo de pertenencia que se nota en cada pantalla. Nada de plantilla, nada de genérico, nada de "esto lo he visto mil veces".

## Si quieres tocar algo

Estos son los puntos donde, si me dices "esto no", lo cambio antes de empezar:

- **Tipografía** (Manrope + Inter + JetBrains Mono)
- **Paleta** (ya decidida, pero podemos ajustar tonos)
- **Estilo de cards** (bordes vs sombras, radio 12px)
- **Empty states** (tono motivador vs neutro)
- **Bottom nav** (4 destinos)
- **Densidad de información** (más denso vs más respirado)

Si te gusta todo tal cual, paso a **Fase 0** con esta dirección cerrada. Si quieres tocar algo, dime y lo ajusto.
