import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { InboxList } from "@/components/dashboard/InboxList";
import { ownerConversations, ownerLocations, requireOwner } from "@/lib/data";
import { formatPhone, formatRelative } from "@/lib/format";
import type { Booking, Conversation, Enquiry, Message } from "@/lib/types";
import { ReplyForm } from "../ReplyForm";
import { ThreadEnd } from "../ThreadEnd";

export const metadata: Metadata = { title: "Inbox" };

const AUTO_LABELS: Record<string, string> = {
  booking_received: "Request received",
  booking_confirmed: "Booking confirmation",
  booking_cancelled: "Cancellation",
  reminder_24h: "Day-before reminder",
  reminder_1h: "Hour-before reminder",
  review_request: "Review request",
  enquiry_received: "Quote request received",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ loc?: string }> };

export default async function ConversationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, business } = await requireOwner();
  const tz = business.timezone;
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle<Conversation>();
  if (!conversation) notFound();

  // Opening the thread marks it read.
  if (conversation.unread_count > 0) {
    await supabase.from("conversations").update({ unread_count: 0 }).eq("id", conversation.id);
    conversation.unread_count = 0;
  }

  const locations = await ownerLocations(supabase, business.id);
  const loc = locations.length > 1 && locations.some((l) => l.id === sp.loc) ? sp.loc! : "";
  const [conversations, { data: messages }, { data: lastBooking }, { data: lastQuote }] = await Promise.all([
    ownerConversations(supabase, business.id, loc),
    supabase.from("messages").select("*").eq("conversation_id", conversation.id).order("created_at").returns<Message[]>(),
    supabase
      .from("bookings")
      .select("*")
      .eq("business_id", business.id)
      .eq("customer_phone", conversation.customer_phone)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle<Booking>(),
    supabase
      .from("enquiries")
      .select("*")
      .eq("business_id", business.id)
      .eq("customer_phone", conversation.customer_phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Enquiry>(),
  ]);
  const list = conversations.map((c) => (c.id === conversation.id ? conversation : c));
  const name = conversation.customer_name || formatPhone(conversation.customer_phone);
  const location = locations.length > 1 ? locations.find((l) => l.id === conversation.location_id) : null;

  return (
    <>
      <h1 className="type-display mb-4 hidden text-[2rem] md:block">Inbox</h1>
      <div className="panel overflow-hidden md:grid md:h-[calc(100dvh-10rem)] md:min-h-[30rem] md:grid-cols-[21rem_1fr]">
        <div className="hidden min-h-0 flex-col border-r border-line md:flex">
          <InboxList conversations={list} activeId={conversation.id} timezone={tz} locations={locations} filter="all" loc={loc} />
        </div>

        <section className="flex min-h-[70dvh] min-w-0 flex-col md:min-h-0">
          <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3">
            <Link href="/dashboard/inbox" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface md:hidden" aria-label="All conversations">
              <Icon name="left" size={20} />
            </Link>
            <div className="min-w-0">
              <h2 className="type-heading truncate">{name}</h2>
              <p className="text-sm text-steel">
                <a href={`tel:${conversation.customer_phone}`} className="underline">
                  {formatPhone(conversation.customer_phone)}
                </a>
                {location ? ` · ${location.name}` : ""}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {lastBooking && (
                <Link href={`/dashboard/bookings/${lastBooking.id}`} className="btn btn-ghost btn-sm">
                  <Icon name="calendar" size={16} /> {formatRelative(lastBooking.starts_at, tz)}
                </Link>
              )}
              {lastQuote && (
                <Link href={`/dashboard/enquiries/${lastQuote.id}`} className="btn btn-ghost btn-sm">
                  <Icon name="clipboard" size={16} /> Quote request
                </Link>
              )}
            </div>
          </header>

          <ol className="flex flex-1 flex-col gap-3 overflow-y-auto bg-surface/60 px-4 py-4" aria-label="Messages">
            {(messages ?? []).map((m) => {
              const mine = m.direction === "out";
              const auto = mine && m.kind;
              return (
                <li key={m.id} className={`flex max-w-[85%] flex-col ${mine ? "items-end self-end" : "items-start self-start"}`}>
                  {auto && (
                    <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-steel">
                      <Icon name="clock" size={13} /> Automatic: {AUTO_LABELS[m.kind!] ?? m.kind}
                    </span>
                  )}
                  <p
                    className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[0.95rem] [overflow-wrap:anywhere] ${
                      mine
                        ? auto
                          ? "rounded-br-md border border-line bg-paper"
                          : "rounded-br-md bg-ink text-paper"
                        : "rounded-bl-md border border-line bg-paper"
                    } ${m.status === "skipped" || m.status === "failed" ? "opacity-60" : ""}`}
                  >
                    {m.body}
                  </p>
                  <span className="mt-1 text-xs text-steel">
                    {m.status === "skipped" || m.status === "failed"
                      ? `Not sent${m.error ? `: ${m.error}` : ""}`
                      : formatRelative(m.created_at, tz)}
                  </span>
                </li>
              );
            })}
            <ThreadEnd count={messages?.length ?? 0} />
          </ol>

          <ReplyForm conversationId={conversation.id} firstName={(conversation.customer_name ?? "them").split(" ")[0]} />
        </section>
      </div>
    </>
  );
}
