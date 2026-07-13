# Morvedre Core — Propuesta de identidad visual evolucionada

> Documento accionable para implementar a continuación de Fase 2. No es teoría: cada token, cada componente y cada regla está pensado para meter mañana. Mantengo la paleta y tipografías base que ya tienes y las **evoluciono** en vez de tirarlas.

---

## 1. Tesis de diseño

### Idea-fuerza

**"Marcador de piscina en el bolsillo."**

Morvedre Core se ve como lo que es: la app del Club Waterpolo Morvedre. El lenguaje visual de referencia es el **marcador electrónico de una piscina de waterpolo** — esos paneles con números enormes en mono, franjas laterales de color por equipo, reloj de período abajo, exclusión parpadeando en rojo. Ese mundo existe solo en este deporte, y es exactamente la huella que la app debe dejar.

Lo que se traduce en tres compromisos visuales:

1. **El dorsal es un objeto, no un número.** El gorro de waterpolo con su número es el fetiche central. Se trata como una ficha — cuadrada, grande, con color de equipo — no como texto auxiliar.
2. **El marcador es el scoreboard.** Cuando hay resultado, se ve como un marcador físico, no como un "12 - 8" suelto entre dos frases. Franjas, números tabulares gigantes, período, exclusión.
3. **El agua está siempre debajo.** Un patrón de carriles de piscina aparece como fondo sutil en zonas de equipo, cabecera del acta y dashboard del equipo. No se nota conscientemente, pero el ojo lo registra como "esto es waterpolo".

### Lo que huimos (anti-defaults explícitos)

- ❌ **No "AI-default"**: ni cream + terracota, ni near-black + acid-green, ni broadsheet periodístico.
- ❌ **No "sports app genérica"**: nada de "azul corporativo + acentos verdes Material You", nada de dashboards SaaS con sidebar gris.
- ❌ **No shadcn/Tailwind UI tal cual**: la card con `border + bg-paper + rounded-md` queda mejor con una variante **"lane"** (con carriles de fondo) o **"stripe"** (con franja de color gruesa).
- ❌ **No emojis**: mantener pictogramas custom 1-stroke.
- ❌ **No Lucide suelto en sitios de identidad**: cuando el icono importa (goles, convocatoría, partido, entreno), va un pictograma, no un glifo de librería.

---

## 2. Paleta evolucionada

### Tesis de color

El azul actual es correcto pero **seguro**. La evoluciono en 3 frentes:

1. **Oscurezco el azul profundo** para que aguante tipografía blanca sin perder contraste y para que se sienta "piscina a 5m de profundidad" (no azul corporativo).
2. **Sustituyo el turquesa "playero"** por un teal piscina más serio. La nueva `--pool-teal` no grita, sostiene.
3. **Asciendo el rojo del logo "WATERPOLO MORVEDRE"** a un token propio `--goggle-red`. Es un color que ya está en la marca, no lo estamos inventando. Lo reservamos para exclusión, derrota, MVP rival y acciones destructivas serias (no para "ver detalle").

### Tokens de color (CSS vars nuevos, conservando los antiguos como alias de compatibilidad)

```css
:root {
  /* === POOL (núcleo) === */
  --pool-deep: #062048; /* azul piscina profunda, header / hero / texto principal */
  --pool-blue: #1657a8; /* azul piscina, primary buttons / links / focus */
  --pool-teal: #0e8c8e; /* teal piscina, info / badges / confirmación suave */
  --pool-foam: #e2eff4; /* espuma, fondo de cards suaves / hover */
  --pool-ice: #f4f8fb; /* hielo, fondo de patrones / separadores muy sutiles */

  /* === ACENTOS DE MARCA === */
  --ball-gold: #f4c430; /* amarillo balón, pichichi #1, highlight hero */
  --goggle-red: #d63b2f; /* rojo del logo, exclusión / derrota / MVP rival */
  --action: #ff6b35; /* naranja acción, CTA primario (sin tocar) */

  /* === INK (texto) === */
  --ink-900: #0f172a; /* texto principal sobre claro */
  --ink-700: #334155; /* texto fuerte secundario */
  --ink-600: #475569; /* texto secundario, metadata */
  --ink-400: #94a3b8; /* placeholder, ayuda */
  --ink-300: #cbd5e1; /* bordes, separadores */
  --ink-200: #e2e8f0; /* divisores muy sutiles */

  /* === PAPER (fondos) === */
  --paper: #fafcfe; /* fondo app */
  --paper-card: #ffffff; /* fondo de cards sobre paper */
  --paper-sunk: #f1f5f9; /* fondo hundido, input deshabilitado */

  /* === SEMÁNTICOS === */
  --success: #10b981; /* confirmado, asistencia, pagado (sin tocar) */
  --warning: #f59e0b; /* pendiente, espera (sin tocar) */
  --danger: #ef4444; /* cancelado, error genérico (sin tocar) */
  /* Goggle-red se usa también como "danger" semántico del waterpolo (exclusión). */

  /* === EQUIPO (color dinámico por equipo, no es var) === */
  /* Las cards lo reciben como prop `teamColor` y se usa directamente. */

  /* === RADIOS === */
  --r-0: 0; /* dorsal number, marcador (rectangular, solidez) */
  --r-xs: 4px; /* badges minúsculos */
  --r-sm: 6px; /* chips, inputs (era --radius-sm) */
  --r-md: 10px; /* cards (bajamos de 12 a 10, más solidez) */
  --r-lg: 16px; /* hero cards, empty states */
  --r-xl: 24px; /* welcome screen, modal de login */
  --r-pill: 9999px; /* avatares, badges round */

  /* === SOMBRAS === */
  --shadow-1: 0 0 0 1px var(--ink-300);
  --shadow-2: 0 1px 2px rgba(6, 32, 72, 0.04), 0 0 0 1px var(--ink-300);
  --shadow-3: 0 4px 12px rgba(6, 32, 72, 0.08), 0 0 0 1px var(--ink-300);
  --shadow-4: 0 8px 24px rgba(6, 32, 72, 0.12), 0 0 0 1px var(--ink-300);
  --shadow-5: 0 16px 48px rgba(6, 32, 72, 0.16);
  --shadow-pool: inset 0 -2px 0 0 var(--pool-blue); /* detalle acuático, sutil */

  /* === ESPACIADO (escala 4px) === */
  --s-1: 4px;
  --s-2: 8px;
  --s-3: 12px;
  --s-4: 16px;
  --s-5: 20px;
  --s-6: 24px;
  --s-8: 32px;
  --s-10: 40px;
  --s-12: 48px;
  --s-16: 64px;

  /* === TIPOGRAFÍA NUMÉRICA === */
  --tracking-tight: -0.02em;
  --tracking-flat: 0;
  --tracking-wide: 0.04em;
  --tracking-eyebrow: 0.12em; /* para small caps de labels */
}

/* === ALIAS DE COMPATIBILIDAD (no romper nada existente) === */
:root {
  --brand-deep: var(--pool-deep);
  --brand-blue: var(--pool-blue);
  --brand-aqua: var(--pool-teal);
  --brand-foam: var(--pool-foam);
  --brand-ball: var(--ball-gold);
  --radius-sm: var(--r-sm);
  --radius: var(--r-sm);
  --radius-md: var(--r-md);
  --radius-lg: var(--r-lg);
  --radius-full: var(--r-pill);
}

@media (prefers-color-scheme: dark) {
  :root {
    --pool-deep: #021024; /* agua nocturna, casi negro azulado */
    --pool-blue: #2e78d6; /* un poco más claro para que destaque */
    --pool-teal: #2bb3b5;
    --pool-foam: #0e1a30;
    --pool-ice: #0a1426;
    --paper: #0a1426;
    --paper-card: #10203a;
    --paper-sunk: #08111f;
    --ink-900: #f1f5f9;
    --ink-700: #cbd5e1;
    --ink-600: #94a3b8;
    --ink-400: #64748b;
    --ink-300: #334155;
    --ink-200: #1e293b;
    --ball-gold: #f4c430;
    --goggle-red: #e25a4d;
    --shadow-1: 0 0 0 1px var(--ink-300);
    --shadow-2: 0 1px 2px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--ink-300);
    --shadow-3: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--ink-300);
    --shadow-4: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--ink-300);
  }
}
```

### Tailwind config extendido (añadir al final de `theme.extend`)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nuevos tokens, no rompen los alias `brand.*` ni `ink.*` que ya usas
        pool: {
          deep: "var(--pool-deep)",
          blue: "var(--pool-blue)",
          teal: "var(--pool-teal)",
          foam: "var(--pool-foam)",
          ice: "var(--pool-ice)",
        },
        ball: { gold: "var(--ball-gold)" },
        goggle: { red: "var(--goggle-red)" },
        paper: {
          DEFAULT: "var(--paper)",
          card: "var(--paper-card)",
          sunk: "var(--paper-sunk)",
        },
        ink: {
          200: "var(--ink-200)",
          300: "var(--ink-300)",
          400: "var(--ink-400)",
          600: "var(--ink-600)",
          700: "var(--ink-700)",
          900: "var(--ink-900)",
        },
      },
      borderRadius: {
        none: "var(--r-0)",
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        DEFAULT: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        full: "var(--r-pill)",
      },
      boxShadow: {
        "elev-1": "var(--shadow-1)",
        "elev-2": "var(--shadow-2)",
        "elev-3": "var(--shadow-3)",
        "elev-4": "var(--shadow-4)",
        "elev-5": "var(--shadow-5)",
        pool: "var(--shadow-pool)",
      },
      letterSpacing: {
        eyebrow: "var(--tracking-eyebrow)",
      },
      fontFamily: {
        display: "var(--font-manrope)",
        sans: "var(--font-inter)",
        mono: "var(--font-jetbrains-mono)",
      },
    },
  },
  plugins: [],
};

export default config;
```

### Hex cheat-sheet

| Token        | Hex       | Nombre humano    | Cuándo NO usarlo                                      |
| ------------ | --------- | ---------------- | ----------------------------------------------------- |
| `pool-deep`  | `#062048` | Piscina profunda | Sobre `pool-deep` (nunca texto blanco sobre sí mismo) |
| `pool-blue`  | `#1657A8` | Piscina          | Texto body, solo títulos, links y CTAs                |
| `pool-teal`  | `#0E8C8E` | Teal piscina     | Botones primarios, solo info/badges                   |
| `pool-foam`  | `#E2EFF4` | Espuma           | Texto sobre él (queda lavado), solo fondos            |
| `pool-ice`   | `#F4F8FB` | Hielo            | Cards grandes, solo separadores muy sutiles           |
| `ball-gold`  | `#F4C430` | Balón            | Texto small (no legible), solo highlights grandes     |
| `goggle-red` | `#D63B2F` | Gafas de bucear  | "Ver más" o info, reservado a exclusión/derrota       |
| `action`     | `#FF6B35` | Acción           | Decoración, solo CTA principal                        |
| `success`    | `#10B981` | -                | Texto deshabilitado                                   |
| `danger`     | `#EF4444` | -                | Cuando hay un matiz emocional waterpolo (→ goggle)    |

---

## 3. Tipografía y jerarquía

### Mantengo: Manrope (display) + Inter (body) + JetBrains Mono (números)

Decisión consciente: no introduzco una 4ª fuente. Manrope weight 800 ya tiene el carácter deportivo que necesito; meter Bebas / Oswald sería sumar complejidad sin sumar personalidad (esos tipos ya están quemadísimos en el mundo sports).

Lo que sí formalizo es la **escala tipográfica con intención**, no solo tamaños sueltos.

### Type scale con función

| Token           | Mobile / Desktop | Font / Weight / Tracking    | Función                                         |
| --------------- | ---------------- | --------------------------- | ----------------------------------------------- |
| `text-score-xl` | 56 / 64          | JetBrains Mono 800, tight   | Marcador final. Solo el bloque PoolScoreboard.  |
| `text-score-lg` | 40 / 48          | JetBrains Mono 800, tight   | Dorsal grande en CapTile XL, top 1 Pichichi.    |
| `text-display`  | 32 / 40          | Manrope 800, tight          | H1 de página, número de racha destacado.        |
| `text-h1`       | 26 / 32          | Manrope 800, tight          | H1 mobile, header de sección principal.         |
| `text-h2`       | 20 / 22          | Manrope 700, flat           | H2, títulos de card, nombres de jugador.        |
| `text-h3`       | 17 / 18          | Manrope 700, flat           | H3, subtítulos, "Convocatoria", "Acta".         |
| `text-lead`     | 17 / 18          | Inter 500, flat             | Subtítulo debajo de h1, mensaje motivador.      |
| `text-body`     | 16 / 16          | Inter 400, flat             | Body, descripciones, párrafos.                  |
| `text-meta`     | 14 / 14          | Inter 500, flat             | Metadata, fecha, lugar, "12 jugadores".         |
| `text-caption`  | 13 / 13          | Inter 500, flat             | Caption, ayuda, hints.                          |
| `text-eyebrow`  | 11 / 11          | Inter 700, eyebrow (0.12em) | Labels uppercase: "PARTIDO", "TU TEMPORADA".    |
| `text-mono-num` | 14-32 / igual    | JetBrains Mono 600, tabular | Dorsales inline, scores secundarios, %, rachas. |

### Reglas de uso

- **El `eyebrow` (tracking 0.12em) solo con uppercase** y solo en Inter 700. Es nuestro "small caps" sin serlo (Inter no tiene small caps).
- **Mono 800** solo para `score-xl` y `score-lg` (escena hero). El resto de números en mono 600.
- **Manrope 800** reservado a display/h1. Para h2/h3 bajar a 700. No usar 800 en body.
- **Inter 500 en metadata**, no 400. La metadata apagada en 400 no se lee en exteriores.

### Tabla de tamaños en `globals.css` (capas `@utility`)

```css
@utility text-score-xl {
  font-family: var(--font-jetbrains-mono);
  font-weight: 800;
  font-size: 56px;
  line-height: 0.95;
  letter-spacing: var(--tracking-tight);
  font-variant-numeric: tabular-nums;
}
@utility text-score-lg {
  font-family: var(--font-jetbrains-mono);
  font-weight: 800;
  font-size: 40px;
  line-height: 1;
  letter-spacing: var(--tracking-tight);
  font-variant-numeric: tabular-nums;
}
@utility text-eyebrow {
  font-family: var(--font-inter);
  font-weight: 700;
  font-size: 11px;
  line-height: 1.2;
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}
@utility text-mono-num {
  font-family: var(--font-jetbrains-mono);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

### Pesos cargados (optimizar `next/font`)

```
Manrope:        400, 500, 600, 700, 800
Inter:          400, 500, 600, 700
JetBrains Mono: 400, 500, 600, 800
```

---

## 4. Elementos de firma (signature elements)

### 4.1 — `LanePattern` (carriles de piscina)

Patrón de 8 líneas horizontales a 4-6% de opacidad, color `pool-deep`. Se usa como fondo sutil en zonas de identidad deportiva. El usuario no lo "ve" conscientemente, pero el ojo lo lee como "esto es piscina".

```html
<div
  class="lane-pattern pointer-events-none absolute inset-0 -z-10"
  style="
    background-image:
      linear-gradient(to bottom, transparent 0, transparent calc(12.5% - 1px), var(--pool-deep) calc(12.5% - 1px), var(--pool-deep) 12.5%),
      linear-gradient(to bottom, transparent 0, transparent calc(25% - 1px), var(--pool-deep) calc(25% - 1px), var(--pool-deep) 25%),
      linear-gradient(to bottom, transparent 0, transparent calc(37.5% - 1px), var(--pool-deep) calc(37.5% - 1px), var(--pool-deep) 37.5%),
      linear-gradient(to bottom, transparent 0, transparent calc(50% - 1px), var(--pool-deep) calc(50% - 1px), var(--pool-deep) 50%),
      linear-gradient(to bottom, transparent 0, transparent calc(62.5% - 1px), var(--pool-deep) calc(62.5% - 1px), var(--pool-deep) 62.5%),
      linear-gradient(to bottom, transparent 0, transparent calc(75% - 1px), var(--pool-deep) calc(75% - 1px), var(--pool-deep) 75%),
      linear-gradient(to bottom, transparent 0, transparent calc(87.5% - 1px), var(--pool-deep) calc(87.5% - 1px), var(--pool-deep) 87.5%);
    opacity: 0.05;
  "
/>
```

Uso: TeamHero, sección "tu equipo" del dashboard, cabecera del acta, header de partido.

### 4.2 — `WaveSection` (ola direccional)

Evolución del actual `water-divider.tsx`. La ola **tiene dirección**: cuando separa un bloque de otro, apunta hacia el contenido que viene (no decoración neutra). Color de la ola = color de equipo, por defecto `pool-foam`.

```tsx
<svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="block h-12 w-full" fill={color}>
  <path d="M0,0 L1440,0 L1440,32 C1260,8 1080,4 900,24 C720,44 540,44 360,24 C180,4 0,8 0,32 Z" />
</svg>
```

Variantes: `default` (ola hacia abajo, abre sección), `flip` (ola hacia arriba, cierra sección), `podium` (sube-baja, para celebrar MVP).

### 4.3 — `PoolScoreboard` (marcador)

El componente identitario central. Reemplaza al actual score 72px inline. Ver detalle en §6.

### 4.4 — `CapTile` (dorsal)

El dorsal como objeto. Ver detalle en §6.

### 4.5 — `PictogramBadge`

Círculo de 28-40px con pictograma 1-stroke dentro, fondo de color de equipo, foreground blanco. Es el sustituto de los iconos Lucide en cualquier sitio donde el icono tiene peso identitario (goles, convocatoria, partido, entreno, MVP, exclusión).

```tsx
<span
  className="inline-flex h-9 w-9 items-center justify-center rounded-full"
  style={{ backgroundColor: teamColor, color: "#fff" }}
>
  <Balon className="h-5 w-5" accent="none" />
</span>
```

Uso: en lugar de `<Trophy />` Lucide en la activity feed, en lugar del icono suelto en headers de partido, en el dot del bottom nav, en las tarjetas de sección del admin.

### 4.6 — `Eyebrow` + `Index`

Combinación de **eyebrow label** (eyebrow 0.12em, uppercase) + **número de índice** (mono 600) cuando listamos cosas: "01 PLANTILLA", "02 RESULTADOS", "03 ESTADÍSTICAS". Da aspecto de "ficha técnica" sin caer en broadsheet.

```
01  PLANTILLA
02  RESULTADOS
03  ESTADÍSTICAS
```

---

## 5. Componentes existentes que evolucionamos

### `Button` — añadir variantes

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-semibold transition-[color,background-color,border-color,box-shadow,transform] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper " +
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] " +
    "rounded-[var(--r-sm)]",
  {
    variants: {
      variant: {
        primary:
          "bg-pool-blue text-paper hover:bg-pool-deep active:bg-pool-deep focus-visible:ring-pool-blue",
        deep: "bg-pool-deep text-paper hover:bg-ink-900 focus-visible:ring-pool-deep",
        secondary: "border border-ink-300 bg-paper-card text-pool-deep hover:bg-pool-foam",
        ghost: "text-pool-deep hover:bg-pool-foam",
        danger: "bg-goggle-red text-paper hover:opacity-90 focus-visible:ring-goggle-red",
        success: "bg-success text-paper hover:opacity-90 focus-visible:ring-success",
        gold: "bg-ball-gold text-pool-deep hover:opacity-90 focus-visible:ring-ball-gold", // CTA celebración
      },
      size: {
        sm: "h-11 min-h-11 px-4 text-sm",
        md: "h-12 min-h-12 px-5 text-base",
        lg: "h-14 min-h-14 px-6 text-base",
        xl: "h-16 min-h-16 px-7 text-lg", // para "Confirmo" / "No puedo" del RSVP
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
```

Cambios clave: `gold` para "Confirmo" (en RSVP y convocatoria — el botón celebración, no el verde genérico) y `xl` size para RSVP.

### `Card` — añadir variantes

```tsx
const cardVariants = cva("rounded-md border bg-paper-card text-ink-900", {
  variants: {
    variant: {
      default: "border-ink-300",
      sunk: "border-ink-300 bg-pool-foam/40",
      stripe: "border-ink-300", // usa <CardStripe teamColor /> hijo
      lane: "border-ink-300 relative overflow-hidden", // usa <LanePattern /> hijo
      elev: "border-ink-300 shadow-elev-2 hover:shadow-elev-3",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-5",
    },
  },
  defaultVariants: { variant: "default", padding: "md" },
});
```

### `Avatar` — color dinámico

Añadir prop `teamColor?: string`. Si se pasa, el fondo del avatar con iniciales es ese color (no siempre `pool-blue`). Mantener fallback.

```tsx
export function Avatar({ src, name, size = 40, teamColor, className, style }: AvatarProps) {
  if (src) return; /* image */
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-paper"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.4)),
        backgroundColor: teamColor ?? "var(--pool-blue)",
        ...style,
      }}
    >
      {initials}
    </span>
  );
}
```

### `Alert` — usar `pool-teal` como info (no `pool-foam`)

`bg-pool-foam` para info queda lavado. Usar `bg-pool-teal/10 text-pool-deep border-pool-teal/30`.

### Top bar — barra de color de equipo más prominente

Cambiar el `h-6 w-1` por un **ribbon de 3px de ancho y 28px de alto** en la esquina superior derecha (pequeño detalle, pero más visible). O mejor: un **dot de 8px** junto al logo, del color del equipo activo. Más sutil, más limpio.

```tsx
<span className="ml-1 h-2 w-2 rounded-full" style={{ backgroundColor: teamColor }} />
```

---

## 6. Componentes NUEVOS a inventar

Invento estos porque responden a huecos reales de la app (rankings, alineación, acta, convocatoria) y porque la estética del marcador de piscina los pide.

### 6.1 — `CapTile` (dorsal visual) — **EL COMPONENTE IDENTITARIO**

**Qué resuelve:** el dorsal aparece como texto auxiliar en listas (`#{cap}`), sin presencia. El waterpolo se juega con un número en la espalda: el dorsal merece ser un objeto, no un detalle tipográfico.

**Esqueleto visual:**

```
┌─────────┐
│         │
│    7    │   <- JetBrains Mono 800, color de equipo de fondo, foreground papel
│         │
└─────────┘
  ╲    ╱     <- mini pictograma gorro (opcional, en hover o XL)
```

Tres tamaños:

- `sm` (28×32): en listas, junto a avatar
- `md` (48×56): en convocatoria, en roster
- `xl` (96×112): en "Tu gorro: #7" del RSVP, en top 1 Pichichi

```tsx
export type CapTileSize = "sm" | "md" | "xl";
export interface CapTileProps {
  cap: number;
  teamColor: string;
  size?: CapTileSize;
  variant?: "default" | "goalkeeper" | "captain";
  className?: string;
}
```

Estados: `default` (color equipo), `goalkeeper` (con pictograma Porteria mini), `captain` (con estrella en la esquina), `cancelled` (opaco, line-through), `mine` (anillo de 2px en `ball-gold`).

```tsx
const sizeMap = {
  sm: { w: 28, h: 32, font: 14 },
  md: { w: 48, h: 56, font: 24 },
  xl: { w: 96, h: 112, font: 56 },
};

export function CapTile({
  cap,
  teamColor,
  size = "md",
  variant = "default",
  className,
}: CapTileProps) {
  const s = sizeMap[size];
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center font-mono text-paper shadow-elev-2",
        className,
      )}
      style={{
        width: s.w,
        height: s.h,
        backgroundColor: teamColor,
        fontSize: s.font,
        fontWeight: 800,
        borderRadius: size === "sm" ? "var(--r-xs)" : "var(--r-sm)",
        opacity: variant === "cancelled" ? 0.45 : 1,
        textDecoration: variant === "cancelled" ? "line-through" : undefined,
      }}
    >
      {cap}
      {variant === "goalkeeper" ? (
        <Porteria className="absolute -right-1 -top-1 h-3 w-3" style={{ color: "white" }} />
      ) : null}
      {variant === "captain" ? (
        <span className="absolute -right-1 -top-1 text-[10px]">★</span>
      ) : null}
    </div>
  );
}
```

Donde se usa:

- `match/[id]` — convocatoria, "Tu gorro: #7" (XL con `mine`)
- `team/[id]` — roster (SM, con `goalkeeper` si cap es 1 o el indicado)
- `admin/matches/[id]` — acta y convocatoria (MD, con drag handle)
- Futuros rankings — top 1 Pichichi (XL con `mine`)

---

### 6.2 — `PoolScoreboard` (marcador de partido)

**Qué resuelve:** el score 72px inline queda "festival de números" y no se diferencia de cualquier `12 - 8` de una web de fútbol. El marcador de waterpolo es único: tiene período, franjas laterales, exclusión.

**Esqueleto visual (modo "preview", partido no jugado):**

```
┌──────┬──────────────┬──────┐
│      │              │      │
│  AZ  │    18:30     │  VS  │   <- "VS" en mono 800 ink-600 (rival)
│      │   sábado 14  │      │
├──────┴──────────────┴──────┤
│  Liga · Local · Piscina 25m│   <- eyebrow
└────────────────────────────┘
```

**Esqueleto visual (modo "final", partido jugado):**

```
┌──────┬──────────────┬──────┐
│  AZ  │              │  ROJ │
│ 12   │  VS (icono)  │  8   │
│ Morv │              │ Turia│
├──────┴──────────────┴──────┤
│ 3.º periodo · 04:32 · MVP:│
└────────────────────────────┘
```

```tsx
export interface PoolScoreboardProps {
  mode: "preview" | "final" | "live";
  homeTeam: { label: string; color: string; score?: number };
  awayTeam: { label: string; color: string; score?: number };
  scheduledAt: string; // ISO
  competitionLabel: string; // "Liga", "Copa", "Torneo"
  isHome: boolean; // si nuestro equipo juega en casa
  period?: number; // 1-4
  clock?: string; // "04:32"
  mvp?: { name: string; cap?: number } | null;
  exclusion?: { player: string; secondsLeft: number } | null; // live only
  className?: string;
}
```

**Variantes:**

- `preview`: hora grande en mono, "VS" central, sin scores, franjas con color tenue.
- `final`: scores 56px mono 800, franjas opacas, "FIN" en eyebrow.
- `live`: scores con parpadeo sutil, período en mono, exclusion timer en la franja lateral del equipo rival con `goggle-red`.

```tsx
// Estructura base
<div className="relative overflow-hidden rounded-md border-2 border-ink-300 bg-paper-card shadow-elev-2">
  {/* Stripe superior con color de equipo (4px) */}
  <div className="h-1" style={{ backgroundColor: ourColor }} />

  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-0">
    {/* HOME */}
    <div className="flex flex-col items-center gap-1 p-4">
      <span className="text-eyebrow" style={{ color: homeColor }}>
        {homeShortLabel}
      </span>
      {mode === "final" || mode === "live" ? (
        <span className="text-score-xl text-pool-deep">{homeScore}</span>
      ) : (
        <span className="font-display text-2xl font-extrabold text-pool-deep">{homeLabel}</span>
      )}
    </div>

    {/* CENTER */}
    <div className="flex flex-col items-center justify-center gap-1 border-x-2 border-ink-300 px-4 py-4">
      {mode === "preview" ? (
        <>
          <span className="text-mono-num text-2xl text-ink-900">{formatTime(scheduledAt)}</span>
          <span className="text-eyebrow text-ink-600">{formatDate(scheduledAt)}</span>
        </>
      ) : mode === "live" ? (
        <>
          <span className="text-eyebrow text-goggle-red">EN VIVO</span>
          <span className="text-mono-num text-2xl text-pool-deep">{clock}</span>
          <span className="text-eyebrow text-ink-600">{period}º P</span>
        </>
      ) : (
        <span className="text-eyebrow text-success">FINAL</span>
      )}
    </div>

    {/* AWAY */}
    {/* simétrico */}
  </div>

  {/* Footer con MVP / exclusión / sede */}
  <div className="bg-pool-foam/40 flex items-center gap-2 border-t border-ink-300 px-4 py-2">
    <span className="text-eyebrow text-ink-600">{competitionLabel}</span>
    {mvp ? <span className="text-meta ml-auto text-pool-deep">MVP: {mvp.name}</span> : null}
  </div>

  {/* Franjas laterales */}
  <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: homeColor }} />
  <div className="absolute inset-y-0 right-0 w-1.5" style={{ backgroundColor: awayColor }} />
</div>
```

Donde se usa:

- `match/[id]` (hero) — modo `preview`, `final` o `live` según `status`
- `team/[id]` (último resultado) — modo `final`
- Dashboard `NextEventCard` (top hero) — modo `preview` cuando hay partido
- `admin/matches/[id]` (hero) — mismo

---

### 6.3 — `PichichiPodium` (podio del pichichi)

**Qué resuelve:** los rankings genéricos (fila de tres columnas: posición, jugador, número) no celebran al #1. Un pichichi es un podio: el primero está **arriba**, no es la primera fila.

**Esqueleto visual:**

```
      ┌───┐
      │ 1 │  <- crown dorado, ball-gold
      └─┬─┘
    ╔══╪═╪═╗
    ║  ★  ║  <- foto jugador 96px circular
    ║     ║
    ╚═════╝
    Carlos          <- nombre
    17 goles        <- mono 800 score-lg

  ┌───┐  ┌───┐
  │ 2 │  │ 3 │     <- plata y bronce (gris + ball-gold atenuado)
  └─┬─┘  └─┬─┘
   foto    foto
  Marta    Iker
  12 goles 10 goles
```

```tsx
export interface PichichiPodiumProps {
  top3: Array<{
    profileId: string;
    fullName: string;
    photoUrl: string | null;
    teamColor: string;
    value: number; // goles
    capNumber?: number;
  }>;
  caption?: string; // "Goleadores · Temporada 25-26"
  mineProfileId?: string;
  className?: string;
}
```

Animación: el #1 entra con scale 0.8 → 1 + opacity 0 → 1 (200ms ease-out), 100ms después entra el #2, 100ms después el #3.

```tsx
<div className="grid grid-cols-3 items-end gap-2">
  {top3[1] && <PodiumStep rank={2} entry={top3[1]} delay={100} />}
  {top3[0] && <PodiumStep rank={1} entry={top3[0]} delay={0} medal="gold" />}
  {top3[2] && <PodiumStep rank={3} entry={top3[2]} delay={200} />}
</div>
```

Donde se usa:

- `/rankings` (Fase 3) — pichichi
- `/rankings` (Fase 3) — MVP ranking con misma forma
- Pantalla final de temporada

---

### 6.4 — `LaneCallup` (convocatoria visual estilo waterpolo)

**Qué resuelve:** la convocatoria actual es una lista de filas. Pero en waterpolo, una convocatoria es **una formación en el agua** — 6 jugadores + portero, con posiciones (boya, extremo izquierdo, etc.). Visualizarla como un "campo de waterpolo" estilizado la hace entendible de un vistazo.

**Esqueleto visual (formación inicial, 7 de los 13):**

```
        PORTERO (#1)
            │
   EXT. IZQ. ──┼── EXT. DER.
   (#5)         (#7)
   BOYA         BOYA
   (#4)    ◎    (#2)        <- el balón en el centro
   POS. 1      POS. 2
   (#3)         (#6)
            │
       CENTRAL (#8)
```

(Con pictograma del campo de waterpolo detrás, color `pool-blue` 6%).

```tsx
export interface LaneCallupProps {
  goalkeeper: CallupSlot;
  fieldPlayers: CallupSlot[]; // 6 jugadores en posiciones
  bench: CallupSlot[]; // los 6 suplentes
  teamColor: string;
  onSlotClick?: (playerId: string) => void;
  mineProfileId?: string;
  className?: string;
}

export interface CallupSlot {
  playerId: string;
  fullName: string;
  capNumber: number;
  photoUrl: string | null;
  status: "called" | "confirmed" | "declined" | "no_show";
}
```

Es **opcional** en partidos normales — solo en la pantalla `/admin/matches/[id]?tab=convocatoria` cuando el coach quiere ver la formación. El `CallupList` (lista plana) sigue siendo el default, más rápido de gestionar.

---

### 6.5 — `ExclusionTimer` (cronómetro de exclusión)

**Qué resuelve:** el acta digital debe recoger exclusiones (20s) y estas tienen un código visual claro. Una barra horizontal decreciente con segundos en mono, color `goggle-red`.

**Esqueleto visual:**

```
Carlos · #7          14s          ╠═══════╗
                                    goggle-red, 30% restante
```

```tsx
export interface ExclusionTimerProps {
  playerName: string;
  capNumber?: number;
  totalSeconds?: number; // default 20
  secondsLeft: number;
  teamColor: string;
  size?: "sm" | "md";
}
```

Animación: la barra decrece con `transition: width 1s linear` refrescada cada segundo. Cuando llega a 0, parpadea 1 vez y desaparece.

Usado en:

- Acta (entrada manual de exclusión con timer en vivo en partidos en directo)
- Resultado del partido (línea "Exclusiones: 3 · Carlos (2), Iker (1)")

---

### 6.6 — `PictogramBadge` (sustituto de Lucide en identidad)

Ver §4.5. Es más un patrón que un componente aislado. Lo añado aquí porque quiero que el código exista en `components/ui/`.

```tsx
export function PictogramBadge({
  pictogram: Pictogram,
  color,
  size = "md",
  className,
}: {
  pictogram: React.ComponentType<{ className?: string; accent?: string }>;
  color: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeMap = { xs: "h-6 w-6", sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
  const iconMap = { xs: "h-3 w-3", sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full text-paper",
        sizeMap[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      <Pictogram className={iconMap[size]} />
    </span>
  );
}
```

Donde se usa: en lugar de `<Trophy /> Lucide` en activity feed, en headers de partido, en el dot del bottom nav cuando hay algo activo, en las tarjetas de admin.

---

## 7. Motion (sutil, con función)

| Evento                                  | Motion                                   | Duración / Easing              |
| --------------------------------------- | ---------------------------------------- | ------------------------------ |
| Entrada de página principal (dashboard) | Fade-in + slide-up 8px                   | 240ms, ease-out                |
| Tap en card/botón                       | `active:scale-[0.97]` (ya existe)        | 80ms, ease-out                 |
| Toast / notif guardada                  | Slide-in desde arriba + fade             | 200ms, ease-out                |
| Número en stats (goles, racha)          | Count-up de 0 al valor                   | 600ms, ease-out                |
| CapTile aparece en convocatoria         | Pop-in (scale 0.7 → 1 + opacity 0 → 1)   | 180ms, cubic-bezier(0.34,1.56) |
| Pichichi podio #1                       | Pop-in con corona girando 15° → 0°       | 300ms, ease-out                |
| Exclusion timer                         | Width transition                         | 1000ms linear por segundo      |
| Cambio tab (en `/admin/matches/[id]`)   | View transition (cross-fade)             | 150ms                          |
| RSVP confirmado                         | Check que se dibuja con stroke-dasharray | 220ms, ease-out                |
| Ola separadora                          | Slide-in horizontal desde la izquierda   | 400ms, ease-out                |

**Regla de oro:** si la animación no informa al usuario de algo (qué pasó, qué cambió, dónde está), se quita. La decoración animada envejece mal.

**Respeto a `prefers-reduced-motion`:** ya está en `globals.css`. Solo asegúrate de que los count-ups, pop-ins y view transitions se cancelan allí (Tailwind `motion-safe:` cuando apliquen).

---

## 8. Comparativa con el estado actual

### Lo que se queda (merece conservarse)

| Pieza actual                                       | Por qué se queda                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Pictogramas custom (gorro, balon, ola, silbato...) | Son la base de la identidad. Solo los pulimos (gorro más detallado, ver §6.1).    |
| `water-divider`                                    | La idea es buena. Solo lo mejoramos con dirección, color de equipo y 3 variantes. |
| Tipografía (Manrope + Inter + Mono)                | Decisión correcta. Sin cambios.                                                   |
| Bottom nav de 5 tabs con dot indicator             | Funciona. Solo cambiamos el dot por `ball-gold` (más contraste que el actual).    |
| Color dinámico por equipo en bordes de cards       | La idea es buena. La llevamos más lejos (cards teñidas, franjas de scoreboard).   |
| Tono cercano y segunda persona                     | Se queda. La UI tiene que seguir sonando "Rubén del Puerto".                      |
| Empty states con copy específico                   | Se queda. Solo añadimos un pictograma en lugar de Lucide.                         |
| Estructura `lib/domain/*` como funciones puras     | Ortogonal al visual, se queda.                                                    |
| Alias de compatibilidad (`--brand-deep` = pool)    | Esto permite migrar gradualmente sin tocar todos los call-sites.                  |

### Lo que se tira (sin remordimiento)

| Pieza actual                                                              | Por qué se va                                                                                                                                       |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg-brand-blue` en todos los botones primarios                            | Diferenciamos con `gold` para CTAs de celebración, `deep` para "ver detalle", `pool-blue` para primarios.                                           |
| `rounded-md 12px` en cards                                                | Bajamos a 10px (`r--md`). Cards más serias, menos "blanditas".                                                                                      |
| `border-ink-300 bg-paper rounded-md` en TODAS las cards                   | Introducimos 4 variantes (`default`, `sunk`, `stripe`, `lane`, `elev`). La misma card no puede valer para "Resultado del partido" que para "Notas". |
| Score 72px inline en hero de partido                                      | Reemplazado por `PoolScoreboard`. Es el cambio identitario más fuerte.                                                                              |
| `color-mix(in oklab, ${color} 6%, var(--paper))` repetido inline          | Centralizar en variantes de Card (`<Card variant="stripe" teamColor={...}>`).                                                                       |
| Lucide `Trophy` para resultados                                           | Reemplazado por `PictogramBadge` con `Balon` (gol) o `Porteria` (MVP).                                                                              |
| Lucide `Calendar` con `bg-brand-foam` en empty states                     | Reemplazado por pictograma custom en pictogram badge.                                                                                               |
| `borderTopWidth: "4px"` + `borderLeftWidth: "4px"` inline en hero partido | Reemplazado por `PoolScoreboard` que gestiona las franjas internamente.                                                                             |
| `font-bold` en h1 con `text-2xl sm:text-3xl`                              | Subimos a `text-h1` (26/32) o `text-display` (32/40) según contexto.                                                                                |
| `bg-brand-foam/30` para SeasonStatCard                                    | Usar `bg-pool-foam/50` con un `border-l-2` del color del stat (success/blue/action).                                                                |

### Lo que se evoluciona (manteniendo la idea, subiendo el listón)

| Pieza actual                                                       | Evolución                                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `text-[10px] font-bold uppercase tracking-wider` repetido 8+ veces | Centralizar en `text-eyebrow` utility.                                                   |
| `font-mono text-xl font-bold` para dorsales                        | `CapTile` con tamaño y color. El dorsal pasa de texto a objeto.                          |
| Avatar con iniciales en `bg-brand-blue` fijo                       | Avatar con color de equipo del jugador (`teamColor` prop).                               |
| Calendario con chips de color por evento                           | Chip con el pictograma dentro (no solo el color). Más identidad, menos "tabla de Excel". |
| `WeekEventCard` 180px min-width                                    | Cambio a `CapTile` SM + hora + nombre del partido. Más denso y más visual.               |
| Dot indicator del bottom nav en `bg-brand-ball`                    | Se queda, pero le damos contraste: ball-gold sólido, 6px en vez de 4px.                  |

---

## 9. Reglas de oro (do / don't)

### Do

1. **Dorsal = objeto.** Si un dorsal aparece, va en un `CapTile`. Nunca suelto.
2. **Resultado = scoreboard.** Si un partido tiene resultado, va en un `PoolScoreboard`. Nunca dos h2 con un guión entre medias.
3. **Color de equipo = vida.** Cada card de equipo, cada chip de convocatoria, cada avatar de jugador va teñido del color de su equipo.
4. **Mono para números que se comparan.** Dorsales, scores, %, rachas, contadores: siempre `text-mono-num` o mono 800.
5. **Eyebrow para jerarquía.** "PARTIDO", "TU TEMPORADA", "CONVOCATORIA": siempre `text-eyebrow`. Es nuestra forma de "small caps" sin tener small caps.
6. **Empty states con pictograma + copy cercano.** Nunca "No hay datos". Siempre "Tu primer partido está al caer."
7. **Pictograma antes que Lucide en identidad.** Gol, convocatoria, partido, entreno, exclusión, MVP: pictograma. Solo Lucide para flechas, check, cerrar.
8. **Mobile first, 320px.** Si dudas, prueba en 320px. Si funciona ahí, funciona en todos.

### Don't

1. **No más de 2 acentos cálidos a la vez.** Si usas `ball-gold` (celebración), no uses `action` (CTA) en la misma vista. El ojo necesita un foco.
2. **No `color-mix` inline.** Si lo necesitas, crea una variante de Card. Centralizar.
3. **No emojis en la UI.** Solo pictogramas. Los emojis no escalan y se ven poco serios.
4. **No sombras pesadas.** `shadow-elev-2` máximo en cards. `shadow-elev-3` solo en dropdowns. `shadow-elev-4` solo en sheets/modales.
5. **No `rounded-xl` (24px) en cards.** Solo en welcome/login. Las cards son 10px, los inputs 6px, los dorsales 0 (rectangulares) o 4-6px.
6. **No copy en tercera persona.** Nunca "Se convoca al jugador Carlos". Siempre "Estás convocado, Carlos" o "Carlos, el sábado juegas".
7. **No loading spinners genéricos.** Skeleton con la forma del contenido (un `bg-pool-foam animate-pulse` con la altura del bloque que va a aparecer).
8. **No gradientes azul-morado.** El color es plano. Decidido. Del club.
9. **No `font-bold` en body.** Body es 400, metadata 500, headings 700-800. El 600 solo para emphasis inline ("Confirmo" en un párrafo).
10. **No animaciones decorativas.** Si la animación no informa, se quita.

---

## 10. Plan de implementación (orden sugerido)

No todo a la vez. Esto cabe en un sprint de Fase 3.

1. **Migración de tokens (1-2h, no rompe nada)**
   - Sustituir `:root` de `globals.css` con los nuevos valores + alias de compatibilidad.
   - Actualizar `tailwind.config.ts` con `pool.*`, `ball.*`, `goggle.*`, `paper.*`, sombras, radios nuevos.
   - Verificar que el build pasa y que `bg-brand-blue` sigue funcionando (es alias de `pool-blue`).

2. **Componentes identitarios (medio día)**
   - `CapTile` en `components/ui/cap-tile.tsx`.
   - `PictogramBadge` en `components/ui/pictogram-badge.tsx`.
   - `Eyebrow` (utility component) en `components/ui/eyebrow.tsx`.

3. **`PoolScoreboard` (medio día)**
   - Crear `components/ui/pool-scoreboard.tsx`.
   - Reemplazar en `app/(app)/matches/[id]/page.tsx` (líneas 222-316, el `MatchHero`).
   - Reemplazar en `app/(app)/admin/matches/[id]/page.tsx` (líneas 246-326, mismo patrón).
   - Reemplazar en `app/(app)/team/[id]/page.tsx` (líneas 142-202, el `LastMatchCard`).

4. **Pulir dashboard (medio día)**
   - `NextEventCard`: usar `CapTile` SM cuando el usuario está convocado.
   - `ActivityItem`: usar `PictogramBadge` en lugar de `ActivityIcon` Lucide.
   - `WeekEventCard`: añadir pictograma en lugar de solo dot de color.

5. **Card variants + LanePattern (medio día)**
   - Reescribir `card.tsx` con `cardVariants` (default/sunk/stripe/lane/elev).
   - Crear `components/ui/lane-pattern.tsx`.
   - Aplicar `variant="lane"` en `TeamHero`, `MatchHero` (PoolScoreboard) y sección "tu equipo" del dashboard.

6. **Botones RSVP XL + gold variant (10 min)**
   - Añadir variant `gold` y size `xl` al `Button`.
   - En `RsvpButtons`, "Confirmo" usa `variant="gold" size="xl"`.

7. **Fase 3 entra aquí:** `PichichiPodium`, `ExclusionTimer` se construyen sobre los tokens y el lenguaje ya en sitio.

---

## 11. Resumen ejecutivo (la versión para Rubén)

**La idea es:** Morvedre Core pasa de verse como "una app azul con iconos" a verse como **el marcador de piscina que llevas en el bolsillo**. Cambian tres cosas y todo lo demás se queda:

1. **El dorsal pasa a ser un objeto** (cuadrado con número grande y color de equipo), no un texto. Se llama `CapTile` y aparece en convocatoria, roster, RSVP.
2. **El resultado pasa a ser un scoreboard** (con franjas laterales, número mono gigante, período, MVP). Se llama `PoolScoreboard` y aparece en ficha de partido, último resultado, dashboard.
3. **El club tiene un patrón de fondo** (los 8 carriles de la piscina, sutil, en `LanePattern`) en zonas de equipo. No se nota conscientemente, pero el ojo lo lee.

Los tokens (`pool-*`, `ball-gold`, `goggle-red`) están listos para implementar mañana con un copy-paste de `globals.css`. El `tailwind.config.ts` se extiende sin romper nada (los `brand-*` siguen funcionando como alias). Los componentes nuevos tienen esqueleto visual arriba, código de partida, y huecos reales de la app donde encajan.

El día que un cadete abra la app y vea su dorsal 7 en grande con el color del Cadete B, **sabrá que es del Morvedre**. Eso no lo da ninguna otra app de waterpolo.
