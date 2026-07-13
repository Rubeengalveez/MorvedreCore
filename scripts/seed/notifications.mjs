import { admin, loadBatch, mergeBatch, rand, randInt, resetRng } from "./base.mjs";
import { randomUUID } from "node:crypto";

const NOTIFICATION_KINDS = [
  {
    kind: "convocatoria",
    title: "Convocatoria para partido",
    body: "Estás convocado para el partido del {date} a las {time}. ¡Confirma tu asistencia!",
  },
  {
    kind: "match_reminder",
    title: "Recordatorio de partido",
    body: "Mañana tienes partido a las {time}. ¡No faltes!",
  },
  {
    kind: "result_published",
    title: "Resultado del partido",
    body: "El partido terminó {result}.",
  },
  { kind: "news_pinned", title: "Nueva noticia del club", body: "{title}" },
  {
    kind: "training_cancelled",
    title: "Entreno cancelado",
    body: "El entreno de mañana se ha cancelado por {reason}.",
  },
];

const REASONS = ["mantenimiento", "festivo", "tormenta", "competición externa"];
const RESULTS = [
  { result: "victoria", href: "/matches" },
  { result: "derrota", href: "/matches" },
  { result: "empate", href: "/matches" },
];

async function main() {
  resetRng();
  console.log("[notifications] Generando notificaciones variadas...\n");

  const batch = loadBatch() ?? {};
  const playerIds = batch.playerIds ?? [];
  const matchIds = batch.matchIds ?? [];

  if (playerIds.length === 0 || matchIds.length === 0) {
    console.log("[notifications] Faltan jugadores o partidos.");
    return;
  }

  const { data: matches } = await admin
    .from("matches")
    .select("id, opponent, scheduled_at, status, team_id")
    .in("id", matchIds.slice(0, 50));
  const { data: newsPosts } = await admin.from("news_posts").select("id, title").limit(5);
  const newsList = newsPosts ?? [];

  const notifications = [];
  const now = new Date();

  for (const match of matches ?? []) {
    if (match.status !== "played") continue;
    const matchDate = new Date(match.scheduled_at);

    notifications.push(
      ...makeNotif(
        "convocatoria",
        NOTIFICATION_KINDS[0].title,
        NOTIFICATION_KINDS[0].body,
        {
          date: matchDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
          time: matchDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        },
        sampleN(playerIds, Math.floor(playerIds.length * 0.7)),
        new Date(matchDate.getTime() - 4 * 24 * 3600 * 1000),
        { related_match_id: match.id, href: `/matches/${match.id}` },
      ),
    );

    notifications.push(
      ...makeNotif(
        "match_reminder",
        NOTIFICATION_KINDS[1].title,
        NOTIFICATION_KINDS[1].body,
        { time: matchDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) },
        sampleN(playerIds, Math.floor(playerIds.length * 0.6)),
        new Date(matchDate.getTime() - 1 * 24 * 3600 * 1000),
        { related_match_id: match.id, href: `/matches/${match.id}` },
      ),
    );

    const result = RESULTS[Math.floor(rand() * RESULTS.length)];
    notifications.push(
      ...makeNotif(
        "result_published",
        NOTIFICATION_KINDS[2].title,
        NOTIFICATION_KINDS[2].body.replace("{result}", result.result),
        {},
        sampleN(playerIds, Math.floor(playerIds.length * 0.8)),
        new Date(matchDate.getTime() + 2 * 3600 * 1000),
        { related_match_id: match.id, href: result.href },
      ),
    );
  }

  const { data: orders } = await admin
    .from("shop_orders")
    .select("id, requested_by, status")
    .eq("status", "pending_parent")
    .limit(5);
  for (const order of orders ?? []) {
    notifications.push({
      id: randomUUID(),
      recipient_id: order.requested_by,
      kind: "convocatoria",
      title: "Tu pedido espera aprobación",
      body: "Has solicitado un pedido en la tienda. Recuerda que tu padre/madre debe aprobarlo.",
      related_match_id: null,
      related_training_session_id: null,
      href: `/shop/orders/${order.id}`,
      read_at: rand() < 0.5 ? now.toISOString() : null,
      created_at: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
    });
  }

  for (const n of newsList.slice(0, 3)) {
    notifications.push(
      ...makeNotif(
        "news_pinned",
        NOTIFICATION_KINDS[3].title,
        NOTIFICATION_KINDS[3].body.replace("{title}", n.title.slice(0, 50)),
        {},
        sampleN(playerIds, 25),
        new Date(now.getTime() - randInt(1, 14) * 24 * 3600 * 1000),
        { href: `/news/${n.id}` },
      ),
    );
  }

  for (const m of sampleN(matches ?? [], 5)) {
    notifications.push(
      ...makeNotif(
        "training_cancelled",
        NOTIFICATION_KINDS[4].title,
        NOTIFICATION_KINDS[4].body.replace(
          "{reason}",
          REASONS[Math.floor(rand() * REASONS.length)],
        ),
        {},
        sampleN(playerIds, Math.floor(playerIds.length * 0.5)),
        new Date(new Date(m.scheduled_at).getTime() - 2 * 24 * 3600 * 1000),
        { related_match_id: null, href: null },
      ),
    );
  }

  console.log(`[notifications] ${notifications.length} notificaciones a crear`);
  for (let i = 0; i < notifications.length; i += 200) {
    const chunk = notifications.slice(i, i + 200);
    const { error } = await admin.from("notifications").upsert(chunk, { onConflict: "id" });
    if (error) console.error(`  ! Bloque ${i / 200 + 1}: ${error.message}`);
  }

  mergeBatch({ notificationCount: notifications.length });
  console.log(`\n[notifications] OK! ${notifications.length} notificaciones.`);
  console.log("  Siguiente paso: node scripts/seed/availability.mjs");
}

function makeNotif(kind, title, body, replacements, recipients, createdAt, extras = {}) {
  let finalTitle = title;
  let finalBody = body;
  for (const [k, v] of Object.entries(replacements)) {
    finalTitle = finalTitle.replace(`{${k}}`, String(v));
    finalBody = finalBody.replace(`{${k}}`, String(v));
  }
  return recipients.map((rid) => ({
    id: randomUUID(),
    recipient_id: rid,
    kind,
    title: finalTitle,
    body: finalBody,
    related_match_id: extras.related_match_id ?? null,
    related_training_session_id: extras.related_training_session_id ?? null,
    href: extras.href ?? null,
    read_at: rand() < 0.4 ? createdAt.toISOString() : null,
    created_at: createdAt.toISOString(),
  }));
}

function sampleN(arr, n) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

main().catch((err) => {
  console.error("[notifications] FATAL:", err);
  process.exit(1);
});
