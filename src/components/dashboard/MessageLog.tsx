import { formatRelative } from "@/lib/format";

const KIND_LABELS: Record<string, string> = {
  booking_received: "Request received",
  booking_confirmed: "Booking confirmed",
  booking_cancelled: "Booking cancelled",
  reminder_24h: "Day-before reminder",
  reminder_1h: "Hour-before reminder",
  review_request: "Google review request",
  enquiry_received: "Quote request received",
  owner_new_booking: "Alert to you: new booking",
  owner_new_enquiry: "Alert to you: new quote request",
  owner_booking_cancelled: "Alert to you: cancellation",
  inbox_reply: "Your text",
};

export type LogRow = { id: string; kind: string; channel: string; status: string; error: string | null; created_at: string };

/** The automatic texts and emails sent for one booking or quote request. */
export function MessageLog({ rows, timezone }: { rows: LogRow[]; timezone: string }) {
  return (
    <div className="panel p-4">
      <p className="type-heading mb-2">Messages sent</p>
      {rows.length === 0 ? (
        <p className="text-sm text-steel">None yet.</p>
      ) : (
        <ol className="grid gap-2 text-sm">
          {rows.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3">
              <span>
                {KIND_LABELS[m.kind] ?? m.kind}{" "}
                <span className="text-steel">({m.channel === "sms" ? "text" : "email"})</span>
              </span>
              <span className={`shrink-0 text-right text-xs ${m.status === "sent" ? "text-steel" : "text-wait"}`}>
                {m.status === "sent" ? formatRelative(m.created_at, timezone) : m.error ? `Not sent: ${m.error}` : "Not sent"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
