import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Conversation } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

/** The business's thread with a customer's phone, created on first contact. */
export async function findOrCreateConversation(
  admin: Admin,
  businessId: string,
  phone: string,
  extra: { customerName?: string | null; locationId?: string | null } = {},
): Promise<Conversation | null> {
  const { data: existing } = await admin
    .from("conversations")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_phone", phone)
    .maybeSingle<Conversation>();
  if (existing) {
    const patch: Partial<Conversation> = {};
    if (extra.customerName && !existing.customer_name) patch.customer_name = extra.customerName;
    if (extra.locationId && existing.location_id !== extra.locationId) patch.location_id = extra.locationId;
    if (Object.keys(patch).length) {
      await admin.from("conversations").update(patch).eq("id", existing.id);
      Object.assign(existing, patch);
    }
    return existing;
  }
  const { data, error } = await admin
    .from("conversations")
    .insert({
      business_id: businessId,
      customer_phone: phone,
      customer_name: extra.customerName ?? null,
      location_id: extra.locationId ?? null,
    })
    .select("*")
    .single<Conversation>();
  if (error || !data) {
    // Two messages at the same moment: the other insert won, so read it back.
    const { data: again } = await admin
      .from("conversations")
      .select("*")
      .eq("business_id", businessId)
      .eq("customer_phone", phone)
      .maybeSingle<Conversation>();
    return again ?? null;
  }
  return data;
}

/** Appends a message to a thread and updates the thread's preview and unread count. */
export async function addMessage(
  admin: Admin,
  conversation: Conversation,
  msg: {
    direction: "in" | "out";
    body: string;
    kind?: string | null;
    status: "sent" | "failed" | "skipped" | "received";
    error?: string | null;
    providerId?: string | null;
  },
) {
  const now = new Date().toISOString();
  await admin.from("messages").insert({
    conversation_id: conversation.id,
    business_id: conversation.business_id,
    direction: msg.direction,
    body: msg.body,
    kind: msg.kind ?? null,
    status: msg.status,
    error: msg.error ?? null,
    provider_id: msg.providerId ?? null,
  });
  // Read-modify-write is fine at MVP volumes; move to an RPC if replies get busy.
  const unread = msg.direction === "in" ? conversation.unread_count + 1 : conversation.unread_count;
  await admin
    .from("conversations")
    .update({ last_message_at: now, last_message_preview: msg.body.slice(0, 140), unread_count: unread })
    .eq("id", conversation.id);
  conversation.unread_count = unread;
  conversation.last_message_at = now;
}

/**
 * A text from a customer. With one shared Twilio number, the reply goes to the
 * business that most recently texted that phone number.
 */
export async function receiveInboundSms(from: string, body: string): Promise<Conversation | null> {
  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("conversations")
    .select("*")
    .eq("customer_phone", from)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle<Conversation>();
  if (!conversation) return null;
  await addMessage(admin, conversation, { direction: "in", body: body.slice(0, 1600), status: "received" });
  return conversation;
}
