import crypto from "crypto";

function generateVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });

  const privJwk = privateKey.export({ format: "jwk" });
  const pubJwk = publicKey.export({ format: "jwk" });

  const xBuf = Buffer.from(pubJwk.x, "base64url");
  const yBuf = Buffer.from(pubJwk.y, "base64url");
  const uncompressedPubKey = Buffer.concat([
    Buffer.from([0x04]),
    xBuf,
    yBuf
  ]);

  const publicKeyB64Url = uncompressedPubKey.toString("base64url");
  const privateKeyB64Url = privJwk.d;

  console.log("=== NUEVAS CLAVES VAPID GENERADAS ===");
  console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + publicKeyB64Url);
  console.log("VAPID_PRIVATE_KEY=" + privateKeyB64Url);
  console.log("=====================================");
}

generateVapidKeys();
