import { admin, loadBatch, mergeBatch, rand, randInt, pad2, resetRng, slugify } from "./base.mjs";
import { randomUUID } from "node:crypto";

const NEWS_TEMPLATES = [
  { title: "Convocatoria asamblea general ordinaria", body: "Se convoca a todos los socios y socias del Club Waterpolo Morvedre a la **asamblea general ordinaria** que se celebrará el próximo sábado 28 de junio a las 18:00 en el salón de actos del club.\n\n## Orden del día\n1. Lectura y aprobación del acta anterior\n2. Memoria de actividades 2025/2026\n3. Liquidación del ejercicio económico\n4. Presupuesto para la temporada 2026/2027\n5. Ruegos y preguntas\n\nLa asistencia es importante. ¡Os esperamos!", audience: "club", pinned: true },
  { title: "Cena de fin de temporada", body: "Como cada año, cerremos la temporada con una **cena de hermandad** entre jugadores, familias y staff técnico.\n\n📅 Sábado 5 de julio, 21:00\n📍 Restaurante La Cepa\n💶 25€ adultos, 12€ niños\n\nInscripciones en la tienda del club. ¡No faltes!", audience: "club", pinned: true },
  { title: "Victoria del Cadete A en la semifinal autonómica", body: "¡Increíble partido del **Cadete A**! Nuestros chicos se han impuesto por **9-7** al CN Valencia en la semifinal del Campeonato Autonómico.\n\nGoleadores: Carlos (3), Iker (2), Pablo (2), Marc (1), Adrià (1).\n\n¡El domingo a por la final! 🏆", audience: "club", pinned: false },
  { title: "Nuevo horario de entrenos del Infantil", body: "A partir de la semana que viene, los entrenos del **Infantil** pasan a ser:\n\n- Lunes y miércoles: 18:00 - 19:30\n- Viernes: 17:30 - 19:00\n\nCambio motivado por la disponibilidad de la piscina municipal.", audience: "team", team: "Infantil", pinned: false },
  { title: "Torneo de verano - inscripciones abiertas", body: "Abrimos inscripciones para el **Torneo de Verano** que se celebrará del 15 al 20 de julio en la piscina municipal.\n\nCategorías: Benjamín, Alevín, Infantil, Cadete.\nInscripción: 10€ por jugador (incluye camiseta del torneo).\n\nPlazo abierto hasta el 30 de junio.", audience: "club", pinned: false },
  { title: "El Benjamín cierra la liga sin perder", body: "Increíble temporada del **Benjamín**: **10 victorias en 10 partidos**.\n\nEl equipo entrenado por Vega ha dominado la liga de principio a fin, con un juego colectivo excepcional y una gran progresión individual de todos los jugadores.\n\n¡Enhorabuena, campeones! 🥇", audience: "team", team: "Benjamín", pinned: false },
  { title: "Equipación nueva para la temporada 26/27", body: "Ya está disponible en la tienda del club la **nueva equipación** para la temporada 2026/2027:\n\n- Bañador masculino y femenino\n- Camiseta de entrenamiento\n- Sudadera oficial\n- Mochila del club\n\nReserva la tuya con el código MORVEDRE2026.", audience: "club", pinned: false },
  { title: "Resultados del fin de semana", body: "Resumen de los partidos del fin de semana:\n\n- **Cadete A** 12 - 8 CN Elche ✅\n- **Cadete B** 6 - 11 Askartza LE ❌\n- **Juvenil** 9 - 7 CN Valencia ✅\n- **Absoluto** 8 - 10 CE Mediterrani ❌\n\nBuena jornada para los nuestros.", audience: "club", pinned: false },
  { title: "Charla: nutrición deportiva en jóvenes", body: "El próximo viernes organizamos una **charla sobre nutrición deportiva** aplicada a jóvenes, abierta a familias y jugadores.\n\n📅 Viernes 12 de junio, 19:00\n📍 Sala multiusos del club\n👨‍⚕️ Ponente: Dr. Héctor Vidal, nutricionista deportivo\n\nEntrada libre hasta completar aforo.", audience: "club", pinned: false },
  { title: "Suspensión de entrenos por mantenimiento", body: "Os informamos que los entrenos del **miércoles 18 de junio** quedan suspendidos por tareas de mantenimiento en la piscina municipal.\n\nLos entrenos se reanudan con normalidad el jueves 19.\n\nDisculpad las molestias.", audience: "team", team: "Alevín", pinned: false },
  { title: "El Juvenil, campeón de Copa", body: "¡¡CAMPEONES!! 🏆🏆\n\nEl **Juvenil** se proclama campeón de la Copa Autonómica tras vencer por **11-9** al CN Sabadell en una final épica que se decidió en los últimos 30 segundos.\n\nMVP del partido: **Liam Ramos**, con 4 goles y una actuación defensiva brutal.\n\n¡Enhorabuena, campeones!", audience: "club", pinned: true },
  { title: "Inauguración del nuevo campo de tiro", body: "El próximo sábado inauguramos el **nuevo campo de tiro** del club, fruto de las obras de mejora de este verano.\n\n📅 Sábado 28 de junio, 12:00\n📍 Piscina Municipal\n\nHabrá una exhibición a cargo de los equipos infantiles y un picoteo para todos los asistentes.", audience: "club", pinned: false },
  { title: "Inscripción para campus de verano", body: "Recordatorio: sigue abierto el plazo de inscripción para el **Campus de Verano del Morvedre**.\n\nDirigido a niños y niñas de 6 a 14 años. Dos semanas de Waterpolo + juegos + piscina + almuerzo.\n\n- 1ª semana: 1-5 julio\n- 2ª semana: 8-12 julio\n- Precio: 90€ por semana\n\nInscripciones en la tienda.", audience: "club", pinned: false },
  { title: "Comunicado oficial: continuidad del proyecto deportivo", body: "La junta directiva del Club Waterpolo Morvedre comunica a todas las familias que el **proyecto deportivo para la temporada 2026/2027 sigue adelante** con normalidad.\n\nSeguimos trabajando para ofrecer la mejor formación deportiva posible a todos los jugadores y jugadoras del club.\n\nGracias por vuestra confianza.", audience: "club", pinned: true },
  { title: "Cadete B: partido aplazado al sábado", body: "El partido del **Cadete B** previsto para el domingo se aplaza al **sábado** a las 18:00 por motivos logísticos del equipo rival.\n\nConfirmad asistencia en la convocatoria de la app.", audience: "team", team: "Cadete B", pinned: false },
];

const REACTIONS = ["like", "fire", "thanks"];

async function main() {
  resetRng();
  console.log("[news] Generando noticias y reacciones...\n");

  const batch = loadBatch() ?? {};
  const teamIdByLabel = new Map(Object.entries(batch.teamIdByLabel ?? {}));
  const playerIds = batch.playerIds ?? [];
  const dirIds = batch.dirIds ?? [];

  if (playerIds.length === 0) {
    console.log("[news] No hay jugadores. Ejecuta primero: node scripts/seed/players.mjs");
    return;
  }

  // Autor de cada noticia: rotar entre directivos y Rubén
  const authors = [...dirIds];
  if (authors.length === 0) {
    console.log("[news] No hay autores (directiva).");
    return;
  }

  const postIds = [];
  const now = new Date();
  for (let i = 0; i < NEWS_TEMPLATES.length; i++) {
    const t = NEWS_TEMPLATES[i];
    const postId = randomUUID();
    const authorId = authors[i % authors.length];

    // Caducidad: 5 caducadas, 10 futuras
    const expiresAt = i < 5
      ? new Date(now.getTime() - (i + 1) * 7 * 24 * 3600 * 1000).toISOString()
      : new Date(now.getTime() + (NEWS_TEMPLATES.length - i + 5) * 7 * 24 * 3600 * 1000).toISOString();

    // Antigüedad: escalonada en los últimos 60 días
    const createdAt = new Date(now.getTime() - (60 - i * 3) * 24 * 3600 * 1000).toISOString();

    const teamId = t.audience === "team" ? teamIdByLabel.get(t.team) : null;

    const { error: pErr } = await admin.from("news_posts").upsert({
      id: postId,
      author_id: authorId,
      title: t.title,
      body_md: t.body,
      audience: t.audience,
      audience_team_id: teamId,
      pinned: t.pinned,
      published_at: createdAt,
      expires_at: expiresAt,
    }, { onConflict: "id" });
    if (pErr) {
      console.error(`  ! Post ${i}: ${pErr.message}`);
      continue;
    }
    postIds.push(postId);

    const numReactions = randInt(Math.floor(playerIds.length * 0.05), Math.floor(playerIds.length * 0.3));
    const reactors = new Set();
    for (let r = 0; r < numReactions; r++) {
      const reactor = playerIds[Math.floor(rand() * playerIds.length)];
      if (reactors.has(reactor)) continue;
      reactors.add(reactor);
      const reaction = REACTIONS[Math.floor(rand() * REACTIONS.length)];
      await admin.from("news_reactions").upsert({
        post_id: postId, profile_id: reactor, reaction, created_at: createdAt,
      }, { onConflict: "post_id,profile_id,reaction" });
    }
    if (i < 3) console.log(`  - "${t.title.slice(0, 50)}...": ${reactors.size} reacciones`);
  }

  mergeBatch({ newsPostIds: postIds });
  console.log(`\n[news] OK! ${postIds.length} noticias creadas.`);
  console.log("  Siguiente paso: node scripts/seed/shop.mjs");
}

main().catch((err) => {
  console.error("[news] FATAL:", err);
  process.exit(1);
});
