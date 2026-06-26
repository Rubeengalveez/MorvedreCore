# Identidad visual — propuesta inicial

> Estado: logo real recibido, paleta confirmada, identidad de marca validada con el club.
>
> **Dirección de diseño detallada**: ver `10-design-direction.md`. Ahí está la estética final, componentes signature, anti-defaults y arquitectura de información que se usarán en Fase 0.

## Logo real

Archivo `public/brand/logo-original.png` (2.2MB, optimizado pendiente en Fase 0). Composición: tiburón azul con balón amarillo de waterpolo, texto "WATERPOLO MORVEDRE" debajo. Colores dominantes que se alinean con la paleta clásica:

- Azul profundo del tiburón ≈ `#1B6BBA` → coincide con nuestro `--brand-blue`
- Amarillo del balón ≈ `#F4C430` → **nuevo token a añadir**: `--brand-ball: #F4C430` para uso puntual en CTA deportiva
- Rojo del texto de "WATERPOLO" ≈ `#D63B2F` → coincide con nuestro `--danger`

## Variantes de logo necesarias (pendiente Fase 0)

Para PWA y diferentes superficies:

1. `public/brand/logo-square.png` — 1024×1024 sin texto "WATERPOLO MORVEDRE", solo isotipo (tiburón + balón). Para icono PWA.
2. `public/brand/icon-192.png`, `icon-512.png`, `icon-maskable.png` — generados desde el cuadrado.
3. `public/brand/logo-horizontal.svg` — versión vectorial con texto, para headers. Pendiente de recibir SVG del club.
4. `public/brand/logo-mono.svg` — versión monocroma para fondos oscuros.

Si no llega SVG en Fase 0, se entrega PNG optimizado con `sharp` desde el original.

---

A continuación, la **propuesta de dirección estética** que complementa al logo.

## Tesis

"Una app de club de barrio con el rigor visual de un club serio. Limpia, deportiva, muy legible bajo el sol de la piscina, con un punto de calor para que los chavales la sientan suya."

Rechazamos los tres defaults genéricos que detecta `frontend-design`:
- (1) crema + terracota: demasiado "cafetería de barrio"
- (2) negro + verde ácido: demasiado "startup fintech"
- (3) broadsheet periodístico: demasiado "diario local"

El club es **agua**, no tierra, no digital, no papel.

## Paleta (propuesta)

| Token | Hex | Uso |
|-------|-----|-----|
| `--brand-deep` | `#0A2E5C` | Cabecera, topbar, texto principal |
| `--brand-blue` | `#1E5AA8` | Botones primarios, links, foco |
| `--brand-aqua` | `#3FBAC2` | Acento secundario, badges, info |
| `--brand-foam` | `#E8F4F8` | Fondo de tarjetas, hover suave |
| `--ink-900` | `#0F172A` | Texto principal sobre fondo claro |
| `--ink-600` | `#475569` | Texto secundario, metadata |
| `--ink-300` | `#CBD5E1` | Bordes, separadores |
| `--paper` | `#FAFCFE` | Fondo de la app |
| `--action` | `#FF6B35` | CTA principal, "gol", "confirmar" |
| `--success` | `#10B981` | Confirmado, asistencia, pagado |
| `--warning` | `#F59E0B` | Pendiente, espera |
| `--danger` | `#EF4444` | Cancelado, exclusión, error |

Esta paleta está alineada con el SRS ("azules agua, fondos blancos, contrastes en gris oscuro") y añade dos acentos cálidos (naranja de acción, verde de confirmación) para la gamificación.

## Tipografía (propuesta)

- **Display y headings**: `Manrope` (geométrica, moderna, carácter deportivo sin ser genérica). Pesos 600, 700, 800.
- **Body y UI**: `Inter` (legibilidad probada en móvil). Pesos 400, 500, 600.
- **Numérico (rankings, goles, dorsal)**: `JetBrains Mono` o `IBM Plex Mono` para tabular las cifras de partidos, asistencia, etc.

Ambas son open source y se sirven por `next/font` con `display: swap` y `preload`, así que el rendimiento no se resiente.

## Escala tipográfica (mobile-first)

| Token | px | Uso |
|-------|----|----|
| `text-xs` | 12 | Etiquetas, captions |
| `text-sm` | 14 | Metadata |
| `text-base` | 16 | Body |
| `text-lg` | 18 | Lead, subtítulos |
| `text-xl` | 20 | Card title |
| `text-2xl` | 24 | Section title |
| `text-3xl` | 30 | Hero number (goles, ranking) |
| `text-4xl` | 36 | Gorro en acta, número grande |

Tamaños base para touch: 16px mínimo en input para evitar zoom en iOS.

## Layout signature: "gorro + ola"

La **ola horizontal** es el leitmotiv visual. Aparece en:
- Cabecera de tarjetas de partido: una banda inferior ondulada con el color de equipo.
- Separador entre secciones del dashboard.
- Empty states: una ola con texto motivador.

El **gorro de waterpolo** es el segundo leitmotiv, en forma de pictograma plano usado para identificar:
- El dorsal de un jugador en la convocatoria.
- La insignia de equipo en el escudo.
- El icono de "resultado" en el acta.

## Iconografía

- Lucide como base, con overrides en algunos casos:
  - Gorro de waterpolo: SVG custom, 1 stroke
  - Ola: SVG custom, 1 fill
  - Silbato de delegado: emoji + outline
- Tamaño base: 24px, 20px en lista, 16px en inline.

## Componentes signature

1. **Tarjeta de partido**: borde superior con color del equipo rival, hora grande, "gorro" visual para la convocatoria del jugador, CTA verde "Confirmo" / CTA ghost "No puedo".
2. **Tarjeta de ranking**: tres columnas (posición, jugador, valor), highlight para el usuario actual (fondo `--brand-foam`), top 3 con badge dorado/plata/bronce.
3. **Selector de perfil**: chip en la topbar con foto + nombre; al pulsar, sheet inferior con los hijos y opción de "Mi perfil".
4. **Kanban de tienda**: columnas con cabecera coloreada por estado, tarjetas con foto miniatura del producto y nombre del destinatario.
5. **Fila de jugador**: avatar + nombre + cap_number en mono + categoría como badge + "→" para detalle.

## Reglas de oro visuales

- **Nada de animaciones decorativas**: una sola animación de View Transition en el cambio de pantalla principal, el resto instantáneo.
- **Sombras mínimas**: preferir bordes y separadores a sombras para que se vea bien a pleno sol.
- **Contraste WCAG AA** siempre, AAA en texto principal.
- **Touch target mínimo 48×48px**, preferible 56×56 en acciones primarias.
- **Bottom nav en móvil** (no top), con 4–5 destinos máximo.
- **Top bar** solo con selector de perfil, buscador y campana de notificaciones.
- **Empty states con copy específico**, no "No hay datos". Ej: "Aún no has sido convocado esta temporada. El primer partido está al caer."

## Logo provisional

Si no tienes logo a mano, isotipo provisional:

```
[ Ola estilizada en --brand-blue ]
[ Letras "WM" en --brand-deep dentro de un círculo ]
```

Color único en versión sólida para PWA icon (192, 512, maskable). Se reemplaza cuando llegue el oficial.
