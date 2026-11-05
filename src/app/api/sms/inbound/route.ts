import { after } from "next/server";
import { appUrl } from "@/lib/env";
import { receiveInboundSms } from "@/lib/inbox";
import { notifyInboundMessage } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTwilioSignature } from "@/lib/twilio-signature";
import type { Business } from "@/lib/types";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/**
 * Twilio "A message comes in" webhook for the business texting number.
 * Set it to https://YOUR-DOMAIN/api/sms/inbound (HTTP POST) in the Twilio console.
 */
export async function POST(request: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new Response("Two-way texting isn't set up.", { status: 503 });

  const params = new URLSearchParams(await request.text());
  const signature = request.headers.get("x-twilio-signature") ?? "";
  if (!(await isValidTwilioSignature(token, `${appUrl()}/api/sms/inbound`, params, signature))) {
    return new Response("Invalid signature", { status: 403 });
  }

  const from = params.get("From") ?? "";
  const body = (params.get("Body") ?? "").trim();
  if (from && body) {
    const conversation = await receiveInboundSms(from, body);
    if (conversation) {
      const { data: business } = await createAdminClient()
        .from("businesses")
        .select("*")
        .eq("id", conversation.business_id)
        .single<Business>();
      if (business) after(() => notifyInboundMessage(business, conversation, body));
    }
  }
  return new Response(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } });
}
