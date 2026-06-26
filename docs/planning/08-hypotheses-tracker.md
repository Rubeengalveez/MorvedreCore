# Tracker de hipótesis

Documento vivo. Cada hipótesis tiene un nivel de confianza (Baja/Media/Alta) y se actualiza con la evidencia que vamos recogiendo.

## Customer (a quién servimos)

### H-C1: El club quiere centralizar toda la gestión en una sola app
- **Confianza:** Alta
- **Evidencia:** SRS detallado, identificado el dolor de Cluber.
- **Estado:** ✅ Validada

### H-C2: Las personas clave son jugadores, padres, entrenadores, delegados, directiva y admin
- **Confianza:** Alta
- **Evidencia:** SRS describe los 5 perfiles.
- **Estado:** ✅ Validada
- **A matizar:** ¿Hay algún otro rol que se nos escapa? (árbitros del club, fisioterapeuta, sponsor, ...)

### H-C3: El dolor principal son las comisiones de Cluber
- **Confianza:** Alta
- **Evidencia:** SRS literal: "coste cero de mantenimiento, eliminación absoluta de pasarelas de pago".
- **Estado:** ✅ Validada
- **A cuantificar:** ¿Cuánto paga el club actualmente a Cluber al año? Esto justifica el esfuerzo de construir la app.

### H-C4: El dolor real es la necesidad de centralizar la gestión, no el coste de Cluber
- **Confianza:** Alta
- **Evidencia:** El club nunca llegó a usar Cluber. La decisión es preventiva.
- **Estado:** ✅ Validada
- **Implicación:** el valor de la app es operativo y estratégico, no financiero.

## Value Proposition (qué les aportamos)

### H-V1: El ahorro de comisiones justifica la inversión de construir y mantener
- **Confianza:** Media
- **Evidencia:** A confirmar con cifras reales.
- **Estado:** 🔄 A validar

### H-V2: El modelo "selector de perfil" padre-hijo resuelve el multi-cuenta
- **Confianza:** Alta
- **Evidencia:** Patrón conocido, mejor que múltiples cuentas.
- **Estado:** ✅ Asunción razonable (no requiere validación)

### H-V3: La matriz de ascensos reduce errores administrativos
- **Confianza:** Alta
- **Evidencia:** Lógica explícita en SRS, simple de implementar.
- **Estado:** ✅ Asunción razonable

### H-V4: Los rankings públicos generan motivación sana
- **Confianza:** Media
- **Evidencia:** A confirmar — ¿el club quiere esto o prefiere privacidad?
- **Estado:** 🔄 A validar

### H-V5: La "regla B" (no convocar al A jugadores del B) está clara para todos los entrenadores
- **Confianza:** Media
- **Evidencia:** Está en el SRS pero la regla podría no estar internalizada por todos.
- **Estado:** 🔄 A validar

### H-V6: El cierre mensual en Excel vía email es suficiente, no hace falta pasarela
- **Confianza:** Alta
- **Evidencia:** Decisión consciente del club para evitar comisiones.
- **Estado:** ✅ Validada

### H-V7: La tienda con pedidos a fábrica por volumen es el modelo correcto
- **Confianza:** Alta
- **Evidencia:** Decisión consciente del club.
- **Estado:** ✅ Validada

### H-V8: La gamificación (rankings) es un motivador real y no un distractor
- **Confianza:** Baja
- **Evidencia:** Tesis a validar con adolescentes.
- **Estado:** 🔄 Pendiente (Fase 2 user discovery)

## Revenue (cómo se sostiene)

### H-R1: El club está dispuesto a invertir tiempo de directiva en mantener la app
- **Confianza:** Media
- **Evidencia:** A confirmar — el coste oculto más importante.
- **Estado:** 🔄 A validar

### H-R2: El coste técnico (Vercel + Supabase + Resend) es despreciable
- **Confianza:** Alta
- **Evidencia:** Plan free cubre 200 usuarios sobradamente.
- **Estado:** ✅ Validada

### H-R3: No hay voluntad de cobrar a los usuarios por la app
- **Confianza:** Alta
- **Evidencia:** El club ya paga cuota anual a cada familia. La app es un servicio del club.
- **Estado:** ✅ Validada

## Channel (cómo llegan)

### H-H1: Una PWA accesible desde el navegador móvil es suficiente
- **Confianza:** Alta
- **Evidencia:** Decisión explícita en SRS (evitar Apple/Google fees).
- **Estado:** ✅ Validada

### H-H2: El canal de distribución es enlace directo al primer login
- **Confianza:** Alta
- **Evidencia:** No hay registro público; admin da acceso manual.
- **Estado:** ✅ Validada

### H-H3: La app se promociona con un cartel en la piscina con QR
- **Confianza:** Alta
- **Evidencia:** Estándar de clubs deportivos.
- **Estado:** ✅ Asunción

## Riesgos a vigilar

### H-X1: La persona de 55 años (encargada de tienda, directiva) no adoptará la app
- **Mitigación:** Diseño mobile-first extremo, manual visual, sesión presencial de onboarding.
- **Estado:** 🔄 A validar con un usuario real en Fase 9

### H-X2: Los jugadores no consultarán la app a diario
- **Mitigación:** Notificaciones push, gamificación, valor inmediato (saber su gorro).
- **Estado:** 🔄 A validar

### H-X3: La app se quedará huérfana si el administrador deja el club
- **Mitigación:** Documentación interna mínima, código en repositorio accesible, transición de admin documentada.
- **Estado:** 🔄 Pendiente de discutir

### H-X4: El coste de oportunidad de construir vs. pagar a Cluber podría no compensarse
- **Confianza:** Nula (invalidada como hipótesis económica)
- **Evidencia:** El club no paga Cluber, no hay ahorro directo.
- **Estado:** ❌ Invalidada como hipótesis económica; reformulada como valor operativo y estratégico.

## Próximas validaciones a hacer (con el usuario)

| Hipótesis | Cómo se valida | Cuándo |
|-----------|---------------|--------|
| H-R1 | Pregunta directa sobre quién mantiene la app | Ahora (Bloque B) |
| H-V4 | Pregunta sobre cómo se reacciona a los rankings | Ahora (Bloque B) |
| H-V5 | Pregunta sobre si la regla B se aplica en la realidad | Ahora (Bloque B) |
| H-X4 | Pregunta sobre cifras de Cluber | Ahora (Bloque B) |
| H-C3 cuantificar | Pregunta sobre cuánto paga el club a Cluber | Ahora (Bloque B) |
