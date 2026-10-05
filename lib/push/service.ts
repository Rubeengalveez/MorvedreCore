import "server-only";

import crypto from "crypto";
import { isAllowedPushEndpoint } from "@/lib/domain/push-subscription";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PushPayload {
  title: string;
  body: string;
  href?: string;
  tag?: string;
  timestamp?: number;
  ttl?: number;
}

function hasVapidConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
}

function encryptPayload(
  clientPublicKeyB64Url: string,
  clientAuthB64Url: string,
  payloadText: string,
): Buffer {
  const clientPublicKey = Buffer.from(clientPublicKeyB64Url, "base64url");
  const clientAuth = Buffer.from(clientAuthB64Url, "base64url");

  const ephemeral = crypto.createECDH("prime256v1");
  ephemeral.generateKeys();
  const ephemeralPublicKey = ephemeral.getPublicKey();

  const sharedSecret = ephemeral.computeSecret(clientPublicKey);

  const info = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    clientPublicKey,
    ephemeralPublicKey,
  ]);
  const ikm = Buffer.from(crypto.hkdfSync("sha256", sharedSecret, clientAuth, info, 32));

  const salt = crypto.randomBytes(16);

  const cek = Buffer.from(
    crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0", "utf8"), 16),
  );
  const iv = Buffer.from(
    crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0", "utf8"), 12),
  );

  const payloadBuffer = Buffer.from(payloadText, "utf8");
  const paddedPayload = Buffer.concat([payloadBuffer, Buffer.from([0x02])]);

  const cipher = crypto.createCipheriv("aes-128-gcm", cek, iv);
  const ciphertext = Buffer.concat([
    cipher.update(paddedPayload),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  const recordSizeBuf = Buffer.alloc(4);
  recordSizeBuf.writeUInt32BE(4096, 0);

  const header = Buffer.concat([
    salt,
    recordSizeBuf,
    Buffer.from([ephemeralPublicKey.length]),
    ephemeralPublicKey,
  ]);

  return Buffer.concat([header, ciphertext]);
}

function generateVapidHeader(endpoint: string): Record<string, string> {
  const publicKeyB64Url = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const privateKeyB64Url = process.env.VAPID_PRIVATE_KEY!;
  const subject = process.env.VAPID_SUBJECT!;

  const endpointUrl = new URL(endpoint);
  const audience = endpointUrl.origin;

  const header = { alg: "ES256", typ: "JWT" };
  const headerB64Url = Buffer.from(JSON.stringify(header)).toString("base64url");

  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };
  const payloadB64Url = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const tokenInput = `${headerB64Url}.${payloadB64Url}`;

  const publicBytes = Buffer.from(publicKeyB64Url, "base64url");
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error("Invalid VAPID public key format");
  }
  const x = publicBytes.slice(1, 33).toString("base64url");
  const y = publicBytes.slice(33, 65).toString("base64url");

  const privateKey = crypto.createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x,
      y,
      d: privateKeyB64Url,
    },
    format: "jwk",
  });

  const signature = crypto.sign("SHA256", Buffer.from(tokenInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  const jwt = `${tokenInput}.${signature.toString("base64url")}`;

  return {
    Authorization: `vapid t=${jwt}, k=${publicKeyB64Url}`,
  };
}

export async function sendPushToSubscription(
  subscription: {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushPayload,
): Promise<{ success: boolean; error?: string; retryable?: boolean }> {
  try {
    if (!hasVapidConfig())
      return { success: false, error: "Missing VAPID configuration", retryable: true };
    if (!isAllowedPushEndpoint(subscription.endpoint))
      return { success: false, error: "Invalid push endpoint", retryable: false };
    const encryptedBody = encryptPayload(
      subscription.p256dh,
      subscription.auth,
      JSON.stringify(payload),
    );

    const vapidHeaders = generateVapidHeader(subscription.endpoint);

    const body = new Uint8Array(new ArrayBuffer(encryptedBody.byteLength));
    body.set(encryptedBody);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        TTL: String(Math.max(0, Math.min(payload.ttl ?? 86400, 86400))),
        Urgency: "normal",
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        ...vapidHeaders,
      },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });

    const admin = createAdminClient();

    if (response.status === 404 || response.status === 410) {
      await admin
        .from("push_subscriptions")
        .update({
          enabled: false,
          last_error: `Push service returned ${response.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);
      return {
        success: false,
        error: `Subscription expired (${response.status})`,
        retryable: false,
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      await admin
        .from("push_subscriptions")
        .update({
          last_error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);
      return {
        success: false,
        error: `HTTP ${response.status}`,
        retryable: response.status === 429 || response.status >= 500,
      };
    }

    await admin
      .from("push_subscriptions")
      .update({
        last_success_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      const admin = createAdminClient();
      await admin
        .from("push_subscriptions")
        .update({
          last_error: message.substring(0, 200),
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);
    } catch (dbErr) {
      console.error("Failed to update subscription error in DB:", dbErr);
    }
    return { success: false, error: "Push delivery failed", retryable: true };
  }
}

