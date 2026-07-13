import { admin, loadBatch, mergeBatch, rand, randInt, resetRng } from "./base.mjs";
import { randomUUID } from "node:crypto";

const PRODUCTS = [
  {
    name: "Bañador masculino Waterpolo",
    desc: "Bañador oficial del club, tejido resistente al cloro.",
    price_cents: 2200,
    sizes: ["S", "M", "L", "XL"],
    category: "Bañadores",
    stock: 25,
    image_emoji: "🩳",
  },
  {
    name: "Bañador femenino Waterpolo",
    desc: "Bañador femenino de una pieza, edición especial 25-26.",
    price_cents: 2400,
    sizes: ["S", "M", "L"],
    category: "Bañadores",
    stock: 18,
    image_emoji: "🩱",
  },
  {
    name: "Camiseta de entrenamiento",
    desc: "Camiseta técnica transpirable para entrenos.",
    price_cents: 1800,
    sizes: ["S", "M", "L", "XL", "XXL"],
    category: "Camisetas",
    stock: 30,
    image_emoji: "👕",
  },
  {
    name: "Sudadera oficial del club",
    desc: "Sudadera con capucha y logo bordado.",
    price_cents: 3500,
    sizes: ["S", "M", "L", "XL"],
    category: "Sudaderas",
    stock: 20,
    image_emoji: "🧥",
  },
  {
    name: "Pantalón corto de entrenamiento",
    desc: "Pantalón corto para entrenos de piscina y seco.",
    price_cents: 1600,
    sizes: ["S", "M", "L", "XL"],
    category: "Pantalones",
    stock: 22,
    image_emoji: "🩳",
  },
  {
    name: "Mochila del club",
    desc: "Mochila oficial con bolsillo para bañador mojado.",
    price_cents: 2800,
    sizes: null,
    category: "Accesorios",
    stock: 15,
    image_emoji: "🎒",
  },
  {
    name: "Toalla grande del club",
    desc: "Toalla 100% algodón con escudo bordado.",
    price_cents: 1500,
    sizes: null,
    category: "Accesorios",
    stock: 30,
    image_emoji: "🧖",
  },
  {
    name: "Gorra de waterpolo",
    desc: "Gorra con el escudo del Morvedre, ideal para el verano.",
    price_cents: 1200,
    sizes: null,
    category: "Accesorios",
    stock: 25,
    image_emoji: "🧢",
  },
  {
    name: "Camiseta de aficionado",
    desc: "Camiseta de algodón con la equipación de juego.",
    price_cents: 2000,
    sizes: ["S", "M", "L", "XL", "XXL"],
    category: "Camisetas",
    stock: 40,
    image_emoji: "👕",
  },
  {
    name: "Botella térmica del club",
    desc: "Botella de acero inoxidable, 750ml.",
    price_cents: 1800,
    sizes: null,
    category: "Accesorios",
    stock: 20,
    image_emoji: "🍶",
  },
  {
    name: "Gafas de piscina",
    desc: "Gafas de piscina para entrenamientos.",
    price_cents: 1000,
    sizes: null,
    category: "Accesorios",
    stock: 35,
    image_emoji: "🥽",
  },
  {
    name: "Chanclas del club",
    desc: "Chanclas de ducha con logo del club.",
    price_cents: 900,
    sizes: ["36", "38", "40", "42", "44", "46"],
    category: "Accesorios",
    stock: 30,
    image_emoji: "🩴",
  },
];

async function main() {
  resetRng();
  console.log("[shop] Generando productos y pedidos en todos los estados...\n");

  const batch = loadBatch() ?? {};
  const playerIds = batch.playerIds ?? [];
  const dirIds = batch.dirIds ?? [];

  if (playerIds.length === 0) {
    console.log("[shop] No hay jugadores. Ejecuta primero: node scripts/seed/players.mjs");
    return;
  }

  const productIds = [];
  console.log("[shop] Creando 12 productos...");
  for (const p of PRODUCTS) {
    const id = randomUUID();
    const { error } = await admin.from("shop_products").upsert(
      {
        id,
        title: p.name,
        description: p.desc,
        category: p.category,
        price_cents: p.price_cents,
        currency: "EUR",
        image_url: null,
        sizes: p.sizes ?? [],
        available: true,
        stock: p.stock,
        max_per_order: 3,
        personalization_enabled: /Camiseta|Sudadera|Mochila|Toalla/.test(p.name),
        personalization_label: "Nombre o iniciales",
        personalization_max_length: 18,
        created_by: dirIds[0] ?? playerIds[0],
      },
      { onConflict: "id" },
    );
    if (error) {
      console.error(`  ! Producto ${p.name}: ${error.message}`);
    } else {
      productIds.push(id);
    }
  }
  console.log(`[shop] ${productIds.length} productos OK`);

  const galleryRows = productIds.slice(0, 4).map((productId, index) => ({
    id: randomUUID(),
    product_id: productId,
    url: "/brand/logo.webp",
    storage_path: null,
    alt: `Vista de muestra del producto ${PRODUCTS[index].name}`,
    sort_order: 0,
    is_cover: true,
  }));
  const { error: galleryError } = await admin.from("shop_product_images").insert(galleryRows);
  if (galleryError) throw galleryError;

  console.log("\n[shop] Creando 18 pedidos en todos los estados del Kanban...");
  const stateDistribution = {
    pending_parent: 4,
    pending_admin: 3,
    ordered: 2,
    received: 2,
    delivered: 4,
    rejected: 2,
    cancelled: 1,
  };

  const orderIds = [];
  for (const [state, count] of Object.entries(stateDistribution)) {
    for (let i = 0; i < count; i++) {
      const orderId = randomUUID();
      const playerId = playerIds[Math.floor(rand() * playerIds.length)];

      const numItems = randInt(1, 3);
      const items = [];
      let totalCents = 0;
      for (let it = 0; it < numItems; it++) {
        const productIdx = Math.floor(rand() * productIds.length);
        const productId = productIds[productIdx];
        const product = PRODUCTS[productIdx];
        const size = product.sizes
          ? product.sizes[Math.floor(rand() * product.sizes.length)]
          : null;
        const qty = randInt(1, 2);
        items.push({
          id: randomUUID(),
          order_id: orderId,
          product_id: productId,
          size: size,
          personalization:
            /Camiseta|Sudadera|Mochila|Toalla/.test(product.name) && rand() < 0.35
              ? "MORVEDRE"
              : null,
          quantity: qty,
          unit_price_cents: product.price_cents,
          subtotal_cents: product.price_cents * qty,
        });
        totalCents += product.price_cents * qty;
      }

      const now = new Date();
      const createdAt = new Date(now.getTime() - randInt(1, 60) * 24 * 3600 * 1000);
      let approvedAt = null,
        orderedAt = null,
        receivedAt = null,
        deliveredAt = null,
        cancelledAt = null;
      let notes = null,
        parentNotes = null,
        adminNotes = null;

      if (
        ["pending_admin", "ordered", "received", "delivered", "rejected", "cancelled"].includes(
          state,
        )
      ) {
        approvedAt = new Date(createdAt.getTime() + 2 * 3600 * 1000).toISOString();
      }
      if (["ordered", "received", "delivered", "cancelled"].includes(state)) {
        orderedAt = new Date(createdAt.getTime() + 4 * 3600 * 1000).toISOString();
      }
      if (["received", "delivered"].includes(state)) {
        receivedAt = new Date(createdAt.getTime() + 5 * 24 * 3600 * 1000).toISOString();
      }
      if (state === "delivered") {
        deliveredAt = new Date(createdAt.getTime() + 7 * 24 * 3600 * 1000).toISOString();
        adminNotes = "Entregado en el entrenamiento del sábado.";
      }
      if (state === "rejected") {
        parentNotes = "Ya tiene esa equipación";
      }
      if (state === "cancelled") {
        cancelledAt = new Date(createdAt.getTime() + 6 * 3600 * 1000).toISOString();
      }
      if (state === "pending_parent") {
        notes = "Por favor, revisa y aprueba el pedido antes del viernes.";
      }

      const { error: oErr } = await admin.from("shop_orders").upsert(
        {
          id: orderId,
          requested_by: playerId,
          status: state,
          total_cents: totalCents,
          currency: "EUR",
          notes,
          parent_notes: parentNotes,
          admin_notes: adminNotes,
          requested_at: createdAt.toISOString(),
          approved_at: approvedAt,
          ordered_at: orderedAt,
          received_at: receivedAt,
          delivered_at: deliveredAt,
          cancelled_at: cancelledAt,
        },
        { onConflict: "id" },
      );
      if (oErr) {
        console.error(`  ! Order ${state}: ${oErr.message}`);
        continue;
      }
      orderIds.push(orderId);

      const { error: iErr } = await admin
        .from("shop_order_items")
        .upsert(items, { onConflict: "id" });
      if (iErr) console.error(`  ! Items ${orderId}: ${iErr.message}`);
    }
    console.log(`  - ${state}: ${count} pedidos`);
  }

  mergeBatch({ shopProductIds: productIds, shopOrderIds: orderIds });
  console.log(`\n[shop] OK! ${productIds.length} productos, ${orderIds.length} pedidos.`);
  console.log("  Siguiente paso: node scripts/seed/notifications.mjs");
}

main().catch((err) => {
  console.error("[shop] FATAL:", err);
  process.exit(1);
});
