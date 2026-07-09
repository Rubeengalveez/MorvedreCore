import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

interface PushPayload {
  title: string;
  body: string;
  href?: string;
}

function hasVapidConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

// Encrypt payload using aes128gcm (RFC 8188)
function encryptPayload(
  clientPublicKeyB64Url: string,
  clientAuthB64Url: string,
  payloadText: string
): Buffer {
  const clientPublicKey = Buffer.from(clientPublicKeyB64Url, "base64url");
  const clientAuth = Buffer.from(clientAuthB64Url, "base64url");

  // 1. Generate local ephemeral P-256 key pair
  const ephemeral = crypto.createECDH("prime256v1");
  ephemeral.generateKeys();
  const ephemeralPublicKey = ephemeral.getPublicKey(); // 65 bytes uncompressed

  // 2. Compute shared secret
  const sharedSecret = ephemeral.computeSecret(clientPublicKey);

  // 3. Derive ikm using HKDF
  // RFC 8291 Section 3.2: PRK = HKDF-Extract(auth, shared_secret)
  // ikm = HKDF-Expand(PRK, key_info, 32)
  const info = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    clientPublicKey,
    ephemeralPublicKey,
  ]);
  const ikm = Buffer.from(
    crypto.hkdfSync(
      "sha256",
      sharedSecret,
      clientAuth,
      info,
      32
    )
  );

  // 4. Generate random 16-byte salt for RFC 8188
  const salt = crypto.randomBytes(16);

  // 5. Derive CEK and Nonce
  const cek = Buffer.from(
    crypto.hkdfSync(
      "sha256",
      ikm,
      salt,
      Buffer.from("Content-Encoding: aes128gcm\0", "utf8"),
      16
    )
  );
  const iv = Buffer.from(
    crypto.hkdfSync(
      "sha256",
      ikm,
      salt,
      Buffer.from("Content-Encoding: nonce\0", "utf8"),
      12
    )
  );

  // 6. Pad payload and encrypt
  // RFC 8188 Section 2: append 0x02 for the last record
  const payloadBuffer = Buffer.from(payloadText, "utf8");
  const paddedPayload = Buffer.concat([
    payloadBuffer,
    Buffer.from([0x02]),
  ]);

  // Encrypt with AES-128-GCM
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, iv);
  const ciphertext = Buffer.concat([
    cipher.update(paddedPayload),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  // 7. Construct header: salt (16 bytes) || record_size (4 bytes) || id_len (1 byte) || key_id (id_len bytes)
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

// Generate VAPID authorization headers
function generateVapidHeader(endpoint: string): Record<string, string> {
  const publicKeyB64Url = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const privateKeyB64Url = process.env.VAPID_PRIVATE_KEY!;
  const subject = process.env.VAPID_SUBJECT!;

  const endpointUrl = new URL(endpoint);
  const audience = endpointUrl.origin;

  // Create JWT Header
  const header = { alg: "ES256", typ: "JWT" };
  const headerB64Url = Buffer.from(JSON.stringify(header)).toString("base64url");

  // Create JWT Payload (short expiration)
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };
  const payloadB64Url = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const tokenInput = `${headerB64Url}.${payloadB64Url}`;

  // Decode the VAPID public key to extract x and y coordinates
  const publicBytes = Buffer.from(publicKeyB64Url, "base64url");
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error("Invalid VAPID public key format");
  }
  const x = publicBytes.slice(1, 33).toString("base64url");
  const y = publicBytes.slice(33, 65).toString("base64url");

  // Load the private key in JWK format
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

  // Sign using ES256 in raw format
  const signature = crypto.sign(
    "SHA256",
    Buffer.from(tokenInput),
    {
      key: privateKey,
      dsaEncoding: "ieee-p1363",
    }
  );

  const jwt = `${tokenInput}.${signature.toString("base64url")}`;

  return {
    Authorization: `vapid t=${jwt}, k=${publicKeyB64Url}`,
  };
}

// Send a push notification to a single subscription
async function sendPushToSubscription(
  subscription: {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const encryptedBody = encryptPayload(
      subscription.p256dh,
      subscription.auth,
      JSON.stringify(payload)
    );

    const vapidHeaders = generateVapidHeader(subscription.endpoint);

    const body = new Uint8Array(new ArrayBuffer(encryptedBody.byteLength));
    body.set(encryptedBody);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "TTL": "2419200", // 4 weeks
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        ...vapidHeaders,
      },
      body,
    });

    const admin = createAdminClient();

    if (response.status === 404 || response.status === 410) {
      // Subscription expired/gone -> disable it
      await admin
        .from("push_subscriptions")
        .update({
          enabled: false,
          last_error: `Push service returned ${response.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);
      return { success: false, error: `Subscription expired (${response.status})` };
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
      return { success: false, error: `HTTP ${response.status}` };
    }

    // Success
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
    return { success: false, error: message };
  }
}

export async function sendPushToProfile(
  profileId: string,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!hasVapidConfig()) {
    return { success: false, error: "Missing VAPID configuration env variables" };
  }

  try {
    const admin = createAdminClient();
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("profile_id", profileId)
      .eq("enabled", true);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return { success: false, error: "No active push subscriptions found" };
    }

    const results = await Promise.all(
      subs.map((sub) => sendPushToSubscription(sub, payload))
    );

    const success = results.some((r) => r.success);
    if (!success) {
      return {
        success: false,
        error: results.map((r) => r.error).filter(Boolean).join("; ") || "All attempts failed",
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function sendPushToProfiles(
  profileIds: string[],
  payload: PushPayload
): Promise<void> {
  if (profileIds.length === 0) return;
  if (!hasVapidConfig()) {
    console.warn("Skipping sendPushToProfiles: VAPID env variables not configured.");
    return;
  }

  try {
    const admin = createAdminClient();
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("profile_id", profileIds)
      .eq("enabled", true);

    if (error) throw error;
    if (!subs || subs.length === 0) return;

    await Promise.all(
      subs.map((sub) => sendPushToSubscription(sub, payload))
    );
  } catch (err) {
    console.error("Failed to send push to profiles:", err);
  }
}
