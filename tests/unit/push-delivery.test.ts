import crypto from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ update: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ update: mocks.update }) }),
}));
import { sendPushToSubscription } from "@/lib/push/service";

const client = crypto.createECDH("prime256v1");
client.generateKeys();
const auth = crypto.randomBytes(16);
const subscription = {
  id: "device",
  endpoint: "https://fcm.googleapis.com/fcm/send/test",
  p256dh: client.getPublicKey().toString("base64url"),
  auth: auth.toString("base64url"),
};
beforeEach(() => {
  const vapid = crypto.createECDH("prime256v1");
  vapid.generateKeys();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", vapid.getPublicKey().toString("base64url"));
  vi.stubEnv("VAPID_PRIVATE_KEY", vapid.getPrivateKey().toString("base64url"));
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.test");
  mocks.update.mockReset().mockReturnValue({ eq: async () => ({ error: null }) });
  mocks.fetch.mockReset().mockResolvedValue({ ok: true, status: 201 });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Entrega Web Push", () => {
  it("cifra un mensaje que el dispositivo puede descifrar y firma un VAPID válido", async () => {
    const payload = {
      title: "Convocatoria",
      body: "Morvedre contra Turia",
      href: "/notifications/notice",
      ttl: 60,
    };
    expect((await sendPushToSubscription(subscription, payload)).success).toBe(true);
    const [, options] = mocks.fetch.mock.calls[0];
    expect(options.redirect).toBe("error");
    expect(options.headers.TTL).toBe("60");
    const encoded = Buffer.from(options.body);
    const salt = encoded.subarray(0, 16),
      keyLength = encoded[20];
    const serverKey = encoded.subarray(21, 21 + keyLength);
    const shared = client.computeSecret(serverKey);
    const ikm = Buffer.from(
      crypto.hkdfSync(
        "sha256",
        shared,
        auth,
        Buffer.concat([Buffer.from("WebPush: info\0"), client.getPublicKey(), serverKey]),
        32,
      ),
    );
    const cek = Buffer.from(
      crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16),
    );
    const nonce = Buffer.from(
      crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12),
    );
    const ciphertext = encoded.subarray(21 + keyLength);
    const decipher = crypto.createDecipheriv("aes-128-gcm", cek, nonce);
    decipher.setAuthTag(ciphertext.subarray(-16));
    const plain = Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]);
    expect(plain[plain.length - 1]).toBe(2);
    expect(JSON.parse(plain.subarray(0, -1).toString())).toEqual(payload);
    const jwt = options.headers.Authorization.match(/t=([^,]+)/)[1];
    const [header, body, signature] = jwt.split(".");
    const key = Buffer.from(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, "base64url");
    const publicKey = crypto.createPublicKey({
      key: {
        kty: "EC",
        crv: "P-256",
        x: key.subarray(1, 33).toString("base64url"),
        y: key.subarray(33).toString("base64url"),
      },
      format: "jwk",
    });
    expect(
      crypto.verify(
        "sha256",
        Buffer.from(`${header}.${body}`),
        { key: publicKey, dsaEncoding: "ieee-p1363" },
        Buffer.from(signature, "base64url"),
      ),
    ).toBe(true);
    expect(JSON.parse(Buffer.from(body, "base64url").toString()).aud).toBe(
      "https://fcm.googleapis.com",
    );
  });
  it("desactiva una suscripción caducada sin reintentarlo", async () => {
    mocks.fetch.mockResolvedValue({ status: 410, ok: false });
    expect(
      await sendPushToSubscription(subscription, { title: "Test", body: "Test" }),
    ).toMatchObject({ success: false, retryable: false });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
  it("conserva una entrega para reintentar si el proveedor falla", async () => {
    mocks.fetch.mockResolvedValue({ status: 503, ok: false, text: async () => "Unavailable" });
    expect(
      await sendPushToSubscription(subscription, { title: "Test", body: "Test" }),
    ).toMatchObject({ success: false, retryable: true });
  });
  it("no contacta con un endpoint interno", async () => {
    expect(
      await sendPushToSubscription(
        { ...subscription, endpoint: "https://127.0.0.1/private" },
        { title: "Test", body: "Test" },
      ),
    ).toMatchObject({ success: false, retryable: false });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
