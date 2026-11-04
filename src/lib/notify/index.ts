import "server-only";
import { appUrl, APP_NAME } from "@/lib/env";
import { formatPhone, formatPrice, formatWhen } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_FEATURES, type Booking, type Business, type Enquiry } from "@/lib/types";
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
  | "enquiry_received";

type Ctx = { bookingId?: string; enquiryId?: string };

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
  return result;
}

async function email(business: Business, kind: Kind, to: string | null, subject: string, body: string, ctx: Ctx) {
  if (!to) return;
  const result = await sendEmail(to, subject, body);
  await log(business, kind, "email", to, `${subject}\n\n${body}`, result, ctx);
  return result;
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
  const ctx = { bookingId: booking.id };
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
        ? `You're booked with ${business.name}.`
        : `${business.name} has your request and will confirm it shortly.`,
      "",
      `Service: ${booking.service_name}`,
      `When: ${when}`,
      booking.address ? `Where: ${booking.address}` : "",
      booking.price_type ? `Price: ${formatPrice(booking.price_type, booking.price_cents)}` : "",
      "",
      `View, change or cancel: ${manageUrl(booking)}`,
      "",
      signature(business),
    ]
      .filter((l) => l !== null)
      .join("\n"),
    ctx,
  );

  await notifyOwner(
    business,
    "owner_new_booking",
    `New booking: ${booking.service_name}`,
    `New booking: ${booking.service_name}, ${when}. ${booking.customer_name} ${formatPhone(booking.customer_phone)}${
      booking.address ? `, ${booking.address}` : ""
    }.${confirmed ? "" : " Confirm it in your dashboard."} ${appUrl()}/dashboard/bookings`,
    ctx,
  );
}

export async function notifyBookingConfirmed(business: Business, booking: Booking) {
  const when = formatWhen(booking.starts_at, business.timezone);
  const ctx = { bookingId: booking.id };
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
  const ctx = { bookingId: booking.id };
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
  const ctx = { bookingId: booking.id };
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
  const ctx = { bookingId: booking.id };
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
    `Thanks for choosing ${business.name}.\n\nIf you were happy with the job, a quick Google review helps other locals find us:\n${business.google_review_url}\n\n${signature(business)}`,
    ctx,
  );
}

export async function notifyEnquiryCreated(business: Business, enquiry: Enquiry) {
  const ctx = { enquiryId: enquiry.id };
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
    `New quote request${enquiry.service_name ? ` for ${enquiry.service_name}` : ""} from ${enquiry.customer_name} ${formatPhone(
      enquiry.customer_phone,
    )}${enquiry.photo_paths.length ? ` (${enquiry.photo_paths.length} photos)` : ""}. ${appUrl()}/dashboard/enquiries`,
    ctx,
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
