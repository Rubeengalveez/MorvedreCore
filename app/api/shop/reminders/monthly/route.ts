import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendMonthlyShopReminder } from "@/server/shop-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.SHOP_REMINDER_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Recordatorio mensual pendiente de configurar." },
      { status: 503 },
    );
  const supplied = request.headers.get("authorization") ?? "";
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(supplied), hash(`Bearer ${secret}`)))
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const result = await sendMonthlyShopReminder();
    return NextResponse.json(result, {
      status: result.orders && !result.sent ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[shop-reminder]", error instanceof Error ? error.message : "Error desconocido");
    return NextResponse.json({ error: "No pudimos enviar el recordatorio." }, { status: 503 });
  }
}
