import { createPublicKey, verify, type KeyObject } from "node:crypto";

/**
 * Checks that a request to `/api/discord` really came from Discord.
 *
 * Discord signs every interaction with the application's Ed25519 key, over the
 * timestamp header followed by the raw body. Discord also tests this when the
 * Interactions Endpoint URL is saved: it sends a request with a bad signature
 * and refuses the URL unless that request gets a 401.
 *
 * Node's own crypto does Ed25519, so there is no dependency for this. The raw
 * 32-byte key Discord shows is wrapped as a JWK, the one format Node accepts
 * for a bare Ed25519 public key.
 */
let cachedKey: { hex: string; key: KeyObject } | null = null;

function publicKey(hex: string): KeyObject {
  if (cachedKey?.hex === hex) return cachedKey.key;
  const key = createPublicKey({
    key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(hex, "hex").toString("base64url") },
    format: "jwk",
  });
  cachedKey = { hex, key };
  return key;
}

export function isValidDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKeyHex: string,
): boolean {
  if (!signature || !timestamp || !/^[0-9a-f]{64}$/i.test(publicKeyHex)) return false;
  if (!/^[0-9a-f]{128}$/i.test(signature)) return false;

  try {
    return verify(
      null,
      Buffer.from(timestamp + rawBody),
      publicKey(publicKeyHex),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}
