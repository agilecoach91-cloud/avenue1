/**
 * Checks Twilio's X-Twilio-Signature header: base64 HMAC-SHA1 of the full
 * webhook URL followed by each POST parameter's name and value, sorted by name.
 * Uses Web Crypto, so it runs on Node and in the browser alike.
 */
export async function expectedTwilioSignature(authToken: string, url: string, params: URLSearchParams): Promise<string> {
  let data = url;
  for (const key of [...new Set(params.keys())].sort()) {
    for (const value of params.getAll(key)) data += key + value;
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  let binary = "";
  mac.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export async function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: URLSearchParams,
  signature: string,
): Promise<boolean> {
  const expected = await expectedTwilioSignature(authToken, url, params);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
