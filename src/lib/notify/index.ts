import "server-only";
import { appUrl, APP_NAME } from "@/lib/env";
import { formatPhone, formatPrice, formatWhen } from "@/lib/format";
import { addMessage, findOrCreateConversation } from "@/lib/inbox";
import { formatAddonPrice } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_FEATURES, type Booking, type Business, type Conversation, type Enquiry, type Location } from "@/lib/types";
import { sendEmail, sendSms, type SendResult } from "./providers";

type Kind =
  | "booking_received"
  | "booking_confirmed"
  | "booking_cancelled"
  | "reminder_24h"
  | "reminder_1h"
  | "review_request"
  | "owner_new_booking"
  | "owner_new_enquiry"
  | "owner_booking_cancelled"
  | "owner_new_message"
  | "enquiry_received"
  | "inbox_reply";

type Ctx = {
  bookingId?: string;
  enquiryId?: string;
  /** Used to file customer texts in the inbox. */
  customerName?: string | null;
  locationId?: string | null;
};

async function smsUsedThisMonth(businessId: string): Promise<number> {
  const admin = createAdminClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("message_log")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("channel", "sms")
    .eq("status", "sent")
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

async function log(
  business: Business,
  kind: Kind,
  channel: "sms" | "email",
  recipient: string,
  body: string,
  result: SendResult,
  ctx: Ctx,
) {
  const admin = createAdminClient();
  await admin.from("message_log").insert({
    business_id: business.id,
    booking_id: ctx.bookingId ?? null,
    enquiry_id: ctx.enquiryId ?? null,
    kind,
    channel,
    recipient,
    body,
    status: result.status,
    provider_id: result.providerId ?? null,
    error: result.error ?? null,
  });
}

/** SMS within the plan's monthly allowance; otherwise reports "skipped". */
async function sms(business: Business, kind: Kind, to: string | null, body: string, ctx: Ctx) {
  if (!to) return;
  const plan = PLAN_FEATURES[business.plan];
  let result: SendResult;
  if (!plan.customerSms) {
    result = { status: "skipped", error: `SMS not included on the ${business.plan} plan` };
  } else if ((await smsUsedThisMonth(business.id)) >= plan.smsPerMonth) {
    result = { status: "skipped", error: "Monthly SMS allowance used" };
  } else {
    result = await sendSms(to, body);
  }
  await log(business, kind, "sms", to, body, result, ctx);
  if (!kind.startsWith("owner_")) {
    // Customer texts also go in the inbox thread, so replies have context.
    const admin = createAdminClient();
    const conversation = await findOrCreateConversation(admin, business.id, to, {
      customerName: ctx.customerName,
      locationId: ctx.locationId,
    });
    if (conversation) {
      await addMessage(admin, conversation, {
        direction: "out",
        body,
        kind: kind === "inbox_reply" ? null : kind,
        status: result.status,
        error: result.error,
        providerId: result.providerId,
      });
    }
  }
  return result;
}

async function email(business: Business, kind: Kind, to: string | null, subject: string, body: string, ctx: Ctx) {
  if (!to) return;
  const result = await sendEmail(to, subject, body);
  await log(business, kind, "email", to, `${subject}\n\n${body}`, result, ctx);
  return result;
}

/** Ends a sentence with a name without doubling a full stop ("Harbour Pest Co."). */
function endSentence(name: string) {
  return /[.!?]$/.test(name) ? name : `${name}.`;
}

/** Location name for owner messages, only when the business has more than one. */
async function locationLabel(business: Business, locationId: string | null): Promise<string | null> {
  if (!locationId) return null;
  const { data } = await createAdminClient()
    .from("locations")
    .select("id,name")
    .eq("business_id", business.id)
    .eq("active", true)
    .returns<Pick<Location, "id" | "name">[]>();
  if (!data || data.length < 2) return null;
  return data.find((l) => l.id === locationId)?.name ?? null;
}

function bookingCtx(booking: Booking): Ctx {
  return { bookingId: booking.id, customerName: booking.customer_name, locationId: booking.location_id };
}

function extrasLine(addons: Booking["addons"]): string {
  if (!addons?.length) return "";
  return `Extras: ${addons.map((a) => `${a.name} (${formatAddonPrice(a)})`).join(", ")}`;
}

function manageUrl(booking: Booking) {
  return `${appUrl()}/b/${booking.manage_token}`;
}

function signature(business: Business) {
  return business.phone ? `${business.name}, ${formatPhone(business.phone)}` : business.name;
}

// ---------------------------------------------------------------------------
// Customer messages
// ---------------------------------------------------------------------------

export async function notifyBookingCreated(business: Business, booking: Booking) {
  const when = formatWhen(booking.starts_at, business.timezone);
  const ctx = bookingCtx(booking);
  const confirmed = booking.status === "confirmed";

  const smsBody = confirmed
    ? `${business.name}: you're booked for ${booking.service_name}, ${when}. Change or cancel: ${manageUrl(booking)}`
    : `${business.name}: we've got your request for ${booking.service_name}, ${when}. We'll confirm shortly. Details: ${manageUrl(booking)}`;
  await sms(business, confirmed ? "booking_confirmed" : "booking_received", booking.customer_phone, smsBody, ctx);

  await email(
    business,
    confirmed ? "booking_confirmed" : "booking_received",
    booking.customer_email,
    confirmed ? `Booking confirmed: ${booking.service_name}` : `Booking request received: ${booking.service_name}`,
    [
      `Hi ${booking.customer_name.split(" ")[0]},`,
      "",
      confirmed
        ? `You're booked with ${endSentence(business.name)}`
        : `${business.name} has your request and will confirm it shortly.`,
      "",
      `Service: ${booking.service_name}`,
      `When: ${when}`,
      booking.address ? `Where: ${booking.address}` : "",
      extrasLine(booking.addons),
      booking.price_type ? `Price: ${formatPrice(booking.price_type, booking.price_cents)}` : "",
      booking.flexible ? "You said you're flexible on the time, so we may call to adjust it." : "",
      "",
      `View, change or cancel: ${manageUrl(booking)}`,
      "",
      signature(business),
    ]
      .filter((l) => l !== null)
      .join("\n"),
    ctx,
  );

  const where = await locationLabel(business, booking.location_id);
  const extras = booking.addons?.length ? ` Extras: ${booking.addons.map((a) => a.name).join(", ")}.` : "";
  await notifyOwner(
    business,
    "owner_new_booking",
    `New booking: ${booking.service_name}`,
    `New booking${where ? ` (${where})` : ""}: ${booking.service_name}, ${when}${booking.flexible ? " (flexible on time)" : ""}. ${
      booking.customer_name
    } ${formatPhone(booking.customer_phone)}${booking.address ? `, ${booking.address}` : ""}.${extras}${
      confirmed ? "" : " Confirm it in your dashboard."
    } ${appUrl()}/dashboard/bookings/${booking.id}`,
    ctx,
  );
}

export async function notifyBookingConfirmed(business: Business, booking: Booking) {
  const when = formatWhen(booking.starts_at, business.timezone);
  const ctx = bookingCtx(booking);
  await sms(
    business,
    "booking_confirmed",
    booking.customer_phone,
    `${business.name}: your booking for ${booking.service_name}, ${when} is confirmed. Details: ${manageUrl(booking)}`,
    ctx,
  );
  await email(
    business,
    "booking_confirmed",
    booking.customer_email,
    `Booking confirmed: ${booking.service_name}`,
    `Your booking with ${business.name} for ${booking.service_name}, ${when} is confirmed.\n\nView, change or cancel: ${manageUrl(booking)}\n\n${signature(business)}`,
    ctx,
  );
}

export async function notifyBookingCancelled(business: Business, booking: Booking, byCustomer: boolean) {
  const when = formatWhen(booking.starts_at, business.timezone);
  const ctx = bookingCtx(booking);
  if (byCustomer) {
    await notifyOwner(
      business,
      "owner_booking_cancelled",
      `Booking cancelled: ${booking.service_name}`,
      `${booking.customer_name} cancelled ${booking.service_name}, ${when}. The time is free again.`,
      ctx,
    );
    return;
  }
  await sms(
    business,
    "booking_cancelled",
    booking.customer_phone,
    `${business.name}: your booking for ${booking.service_name}, ${when} has been cancelled. Questions? Call ${formatPhone(business.phone)}`,
    ctx,
  );
  await email(
    business,
    "booking_cancelled",
    booking.customer_email,
    `Booking cancelled: ${booking.service_name}`,
    `Your booking with ${business.name} for ${booking.service_name}, ${when} has been cancelled.\n\n${signature(business)}`,
    ctx,
  );
}

export async function sendReminder(business: Business, booking: Booking, kind: "reminder_24h" | "reminder_1h") {
  const when = formatWhen(booking.starts_at, business.timezone);
  const ctx = bookingCtx(booking);
  const lead = kind === "reminder_24h" ? "Reminder" : "See you soon";
  await sms(
    business,
    kind,
    booking.customer_phone,
    `${lead}: ${business.name}, ${booking.service_name}, ${when}. Need to change it? ${manageUrl(booking)}`,
    ctx,
  );
  if (kind === "reminder_24h") {
    await email(
      business,
      kind,
      booking.customer_email,
      `Reminder: ${booking.service_name} tomorrow`,
      `A reminder of your booking with ${business.name}: ${booking.service_name}, ${when}.\n\nNeed to change it? ${manageUrl(booking)}\n\n${signature(business)}`,
      ctx,
    );
  }
}

export async function sendReviewRequest(business: Business, booking: Booking) {
  if (!business.google_review_url) return;
  const ctx = bookingCtx(booking);
  const first = booking.customer_name.split(" ")[0];
  await sms(
    business,
    "review_request",
    booking.customer_phone,
    `Thanks ${first}! If you were happy with ${business.name}, a quick Google review helps a lot: ${business.google_review_url}`,
    ctx,
  );
  await email(
    business,
    "review_request",
    booking.customer_email,
    `How did we go, ${first}?`,
    `Thanks for choosing ${endSentence(business.name)}\n\nIf you were happy with the job, a quick Google review helps other locals find us:\n${business.google_review_url}\n\n${signature(business)}`,
    ctx,
  );
}

export async function notifyEnquiryCreated(business: Business, enquiry: Enquiry) {
  const ctx: Ctx = { enquiryId: enquiry.id, customerName: enquiry.customer_name, locationId: enquiry.location_id };
  const where = await locationLabel(business, enquiry.location_id);
  // A text starts the inbox thread, so the owner can reply with a price.
  await sms(
    business,
    "enquiry_received",
    enquiry.customer_phone,
    `${business.name}: thanks ${enquiry.customer_name.split(" ")[0]}, we've got your quote request${
      enquiry.service_name ? ` for ${enquiry.service_name}` : ""
    }. We'll text you back soon.`,
    ctx,
  );
  await email(
    business,
    "enquiry_received",
    enquiry.customer_email,
    `We've got your quote request`,
    `Hi ${enquiry.customer_name.split(" ")[0]},\n\n${business.name} has your request${
      enquiry.service_name ? ` for ${enquiry.service_name}` : ""
    } and will be in touch soon.\n\n${signature(business)}`,
    ctx,
  );
  await notifyOwner(
    business,
    "owner_new_enquiry",
    `New quote request${enquiry.service_name ? `: ${enquiry.service_name}` : ""}`,
    `New quote request${where ? ` (${where})` : ""}${enquiry.service_name ? ` for ${enquiry.service_name}` : ""} from ${
      enquiry.customer_name
    } ${formatPhone(enquiry.customer_phone)}${
      enquiry.photo_paths.length ? ` (${enquiry.photo_paths.length} photos)` : ""
    }. ${appUrl()}/dashboard/enquiries/${enquiry.id}`,
    ctx,
  );
}

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

/** A text typed by the owner in the inbox. Counts toward the plan's SMS allowance. */
export async function sendInboxReply(business: Business, conversation: Conversation, body: string) {
  return sms(business, "inbox_reply", conversation.customer_phone, body, {
    customerName: conversation.customer_name,
    locationId: conversation.location_id,
  });
}

/** Emails the owner when a customer texts back (texting the owner would use up their allowance). */
export async function notifyInboundMessage(business: Business, conversation: Conversation, body: string) {
  if (!business.notify_owner_email || !business.email) return;
  const who = conversation.customer_name || formatPhone(conversation.customer_phone);
  await email(
    business,
    "owner_new_message",
    business.email,
    `New text from ${who}`,
    `${who}: "${body}"\n\nReply in your inbox: ${appUrl()}/dashboard/inbox/${conversation.id}\n\n— ${APP_NAME}`,
    {},
  );
}

// ---------------------------------------------------------------------------
// Owner messages
// ---------------------------------------------------------------------------

async function notifyOwner(business: Business, kind: Kind, subject: string, body: string, ctx: Ctx) {
  if (business.notify_owner_sms && business.phone) {
    await sms(business, kind, business.phone, body, ctx);
  }
  if (business.notify_owner_email && business.email) {
    await email(business, kind, business.email, subject, `${body}\n\n— ${APP_NAME}`, ctx);
  }
}
