import { describe, expect, it } from "vitest";
import { expectedTwilioSignature, isValidTwilioSignature } from "./twilio-signature";

const URL_ = "https://example.com/api/sms/inbound";
const params = () =>
  new URLSearchParams({ To: "+61400000000", Body: "Can you come at 9?", From: "+61412555888", MessageSid: "SM123" });

describe("Twilio signature", () => {
  it("matches an HMAC-SHA1 of the URL and sorted parameters", async () => {
    // Reference value computed independently with Python's hmac module.
    expect(await expectedTwilioSignature("secret-token", URL_, params())).toBe("HjYMMxZXH6IkjlVegdNC3CAfKtM=");
  });

  it("rejects a wrong token, a changed body or a different URL", async () => {
    const good = await expectedTwilioSignature("secret-token", URL_, params());
    expect(await isValidTwilioSignature("secret-token", URL_, params(), good)).toBe(true);
    expect(await isValidTwilioSignature("other-token", URL_, params(), good)).toBe(false);
    const changed = params();
    changed.set("Body", "Cancel it");
    expect(await isValidTwilioSignature("secret-token", URL_, changed, good)).toBe(false);
    expect(await isValidTwilioSignature("secret-token", `${URL_}?x=1`, params(), good)).toBe(false);
  });
});
