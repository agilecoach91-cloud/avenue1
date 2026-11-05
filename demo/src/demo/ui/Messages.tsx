// "Texts & emails": everything the app sent during this demo, as the customer
// or the owner would see it, with a way to reply to a text as the customer.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import { formatPhone, formatWhen } from "@/lib/format";
import { receiveInboundSms } from "@/lib/inbox";
import { notifyInboundMessage, sendReminder } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Booking, Business } from "@/lib/types";
import { authStore, signInWithEmail } from "../auth";
import { getVersion, subscribeDb, tables } from "../db";
import { APP_ORIGIN, navigate, toPath } from "../router-core";
import { currentBusiness, signInAsOwnerOf } from "../state";
import { dismissAll, toast } from "../toasts";
import { createStore } from "../util";

export const sessionStart = new Date(Date.now() - 1000).toISOString();
export const drawer = createStore<{ open: boolean; seen: number }>({ open: false, seen: 0 });

const KIND_LABELS: Record<string, string> = {
  booking_received: "Request received",
  booking_confirmed: "Booking confirmed",
  booking_cancelled: "Booking cancelled",
  reminder_24h: "Day-before reminder",
  reminder_1h: "Hour-before reminder",
  review_request: "Google review request",
  enquiry_received: "Quote request received",
  owner_new_booking: "New booking alert",
  owner_new_enquiry: "New quote request alert",
  owner_booking_cancelled: "Cancellation alert",
  owner_new_message: "New text alert",
  inbox_reply: "Reply from the business",
};

type Item = {
  id: string;
  at: string;
  channel: "sms" | "email";
  to: string;
  who: string;
  audience: "customer" | "owner" | "you";
  kind: string;
  subject?: string;
  body: string;
  status: string;
  error?: string | null;
  reply?: { phone: string; first: string };
  signIn?: { email: string; next: string };
  fromCustomer?: boolean;
};

export function outboxCount(): number {
  return (
    tables.message_log.filter((m) => (m.created_at as string) >= sessionStart).length +
    tables.messages.filter((m) => m.direction === "in" && (m.created_at as string) >= sessionStart).length +
    authStore.get().signInEmails.length
  );
}

function customerName(m: Record<string, unknown>): string | null {
  const b = m.booking_id ? tables.bookings.find((x) => x.id === m.booking_id) : null;
  if (b) return b.customer_name as string;
  const e = m.enquiry_id ? tables.enquiries.find((x) => x.id === m.enquiry_id) : null;
  if (e) return e.customer_name as string;
  const c = tables.conversations.find((x) => x.customer_phone === m.recipient);
  return (c?.customer_name as string) ?? null;
}

function buildItems(): Item[] {
  const items: Item[] = [];
  for (const m of tables.message_log) {
    if ((m.created_at as string) < sessionStart) continue;
    const kind = m.kind as string;
    const owner = kind.startsWith("owner_");
    const channel = m.channel as "sms" | "email";
    const raw = m.body as string;
    const [subject, ...rest] = channel === "email" ? raw.split("\n\n") : [undefined];
    const name = owner ? null : customerName(m);
    items.push({
      id: m.id as string,
      at: m.created_at as string,
      channel,
      to: channel === "sms" ? formatPhone(m.recipient as string) : (m.recipient as string),
      who: owner ? "the business" : (name ?? "the customer"),
      audience: owner ? "owner" : "customer",
      kind,
      subject: channel === "email" ? subject : undefined,
      body: channel === "email" ? rest.join("\n\n") : raw,
      status: m.status as string,
      error: m.error as string | null,
      reply:
        !owner && channel === "sms" && m.status === "sent"
          ? { phone: m.recipient as string, first: (name ?? "Customer").split(" ")[0] }
          : undefined,
    });
  }
  for (const m of tables.messages) {
    if (m.direction !== "in" || (m.created_at as string) < sessionStart) continue;
    const conv = tables.conversations.find((c) => c.id === m.conversation_id);
    items.push({
      id: m.id as string,
      at: m.created_at as string,
      channel: "sms",
      to: "the business",
      who: (conv?.customer_name as string) ?? "Customer",
      audience: "customer",
      kind: "customer_reply",
      body: m.body as string,
      status: "sent",
      fromCustomer: true,
    });
  }
  for (const s of authStore.get().signInEmails) {
    items.push({
      id: s.id,
      at: s.created_at,
      channel: "email",
      to: s.email,
      who: "you",
      audience: "you",
      kind: "sign_in",
      subject: "Your sign-in link",
      body: "Tap the link to sign in. It works once and expires in an hour.",
      status: "sent",
      signIn: { email: s.email, next: s.next },
    });
  }
  return items.sort((a, b) => (a.at < b.at ? 1 : -1));
}

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} hr ago`;
}

export function openLink(href: string, close: () => void) {
  if (href.startsWith(APP_ORIGIN)) {
    close();
    const path = toPath(href);
    if (path.startsWith("/dashboard")) signInAsOwnerOf(currentBusiness());
    void navigate(path);
    return;
  }
  toast(href.includes("writereview") ? "In the live app this opens the business's Google review form." : "In the live app this opens the link.");
}

function Linkified({ text, close }: { text: string; close: () => void }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (!/^https?:\/\//.test(p)) return <span key={i}>{p}</span>;
        const clean = p.replace(/[.,)]+$/, "");
        const trail = p.slice(clean.length);
        return (
          <span key={i}>
            <button type="button" onClick={() => openLink(clean, close)} className="break-all text-left font-semibold underline underline-offset-2">
              {clean.replace(/^https?:\/\//, "")}
            </button>
            {trail}
          </span>
        );
      })}
    </>
  );
}

function ReplyBox({ phone, first, done }: { phone: string; first: string; done: () => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const conversation = await receiveInboundSms(phone, body.trim());
    if (conversation) {
      const { data: business } = await createAdminClient()
        .from("businesses")
        .select("*")
        .eq("id", conversation.business_id)
        .single<Business>();
      if (business) await notifyInboundMessage(business, conversation, body.trim());
      toast(`${first}'s reply is in the business's inbox.`, {
        action: {
          label: "Open inbox",
          run: () => {
            drawer.set((d) => ({ ...d, open: false }));
            signInAsOwnerOf(tables.businesses.find((b) => b.id === conversation.business_id));
            void navigate(`/dashboard/inbox/${conversation.id}`);
          },
        },
      });
    }
    setBusy(false);
    done();
  }
  return (
    <form onSubmit={send} className="mt-2 flex items-end gap-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Reply as {first}</span>
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder={`Reply as ${first}…`}
          className="field min-h-[44px] resize-none py-2 text-sm"
        />
      </label>
      <button className="btn btn-dark btn-sm shrink-0" disabled={busy || !body.trim()}>
        <Icon name="send" size={16} /> Send
      </button>
    </form>
  );
}

function ComingUp({ close }: { close: () => void }) {
  const biz = currentBusiness();
  const [busy, setBusy] = useState<string | null>(null);
  if (!biz) return null;
  const now = Date.now();
  const due = tables.bookings
    .filter((b) => b.business_id === biz.id && b.status === "confirmed" && new Date(b.starts_at as string).getTime() > now && !b.reminder_24h_at)
    .sort((a, b) => ((a.starts_at as string) < (b.starts_at as string) ? -1 : 1))
    .slice(0, 3);
  if (!due.length) return null;
  async function send(b: Record<string, unknown>) {
    setBusy(b.id as string);
    await sendReminder(biz as unknown as Business, b as unknown as Booking, "reminder_24h");
    await createAdminClient().from("bookings").update({ reminder_24h_at: new Date().toISOString() }).eq("id", b.id);
    setBusy(null);
  }
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-steel">Coming up automatically</h3>
      <ul className="grid gap-2">
        {due.map((b) => (
          <li key={b.id as string} className="flex items-center gap-3 rounded-lg border border-line bg-paper p-3">
            <Icon name="clock" size={20} className="shrink-0 text-steel" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold">Day-before reminder to {(b.customer_name as string).split(" ")[0]}</span>
              <span className="block text-steel">
                Goes out before {formatWhen(b.starts_at as string, biz.timezone as string)}
              </span>
            </span>
            <button type="button" className="btn btn-ghost btn-sm shrink-0" disabled={busy === b.id} onClick={() => void send(b)}>
              Send now
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={close} className="sr-only">
        Close
      </button>
    </section>
  );
}

export function MessagesDrawer() {
  const state = useSyncExternalStore(drawer.subscribe, drawer.get, drawer.get);
  const version = useSyncExternalStore(subscribeDb, getVersion, getVersion);
  const auth = useSyncExternalStore(authStore.subscribe, authStore.get, authStore.get);
  const items = useMemo(() => buildItems(), [version, auth]); // eslint-disable-line react-hooks/exhaustive-deps
  const [replying, setReplying] = useState<string | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const close = () => drawer.set((d) => ({ ...d, open: false }));

  useEffect(() => {
    if (!state.open) return;
    dismissAll();
    closeBtn.current?.focus();
    drawer.set((d) => ({ ...d, seen: outboxCount() }));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.open, items.length]);

  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="outbox-title">
      <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-ink/45" aria-label="Close" onClick={close} tabIndex={-1} />
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-[27rem] flex-col bg-surface shadow-2xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-start gap-3 border-b border-line bg-paper px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 id="outbox-title" className="type-heading text-lg">
              Texts and emails
            </h2>
            <p className="text-sm text-steel">What the app sent in this demo, as the customer or business receives it. Nothing really leaves your browser.</p>
          </div>
          <button ref={closeBtn} type="button" className="btn btn-ghost btn-sm" onClick={close}>
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ComingUp close={close} />
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-steel">
              Nothing sent yet. Book a job on the booking page and the customer&apos;s confirmation text and your new-booking
              alert show up here.
            </div>
          ) : (
            <ol className="grid gap-5">
              {items.map((m) => (
                <li key={m.id}>
                  <p className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-steel">
                    <span className={`rounded px-1.5 py-0.5 font-bold uppercase tracking-wider ${m.channel === "sms" ? "bg-ink text-paper" : "bg-paper text-ink ring-1 ring-line"}`}>
                      {m.channel === "sms" ? "Text" : "Email"}
                    </span>
                    <span className="font-semibold text-ink">
                      {m.fromCustomer ? `${m.who} replied` : m.audience === "owner" ? "To the business" : m.audience === "you" ? "To you" : `To ${m.who}`}
                    </span>
                    {!m.fromCustomer && <span className="tabular-nums">{m.to}</span>}
                    <span>· {ago(m.at)}</span>
                  </p>
                  {m.channel === "sms" ? (
                    <div className={`max-w-[92%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[0.93rem] leading-snug [overflow-wrap:anywhere] ${m.fromCustomer ? "ml-auto rounded-br-md bg-ink text-paper" : "rounded-bl-md bg-[#e6ebee]"} ${m.status !== "sent" ? "opacity-55" : ""}`}>
                      <Linkified text={m.body} close={close} />
                    </div>
                  ) : (
                    <div className={`rounded-lg border border-line bg-paper p-3.5 text-sm ${m.status !== "sent" ? "opacity-55" : ""}`}>
                      <p className="font-semibold">{m.subject}</p>
                      <p className="mt-1.5 whitespace-pre-line text-ink/90 [overflow-wrap:anywhere]">
                        <Linkified text={m.body} close={close} />
                      </p>
                      {m.signIn && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm mt-3"
                          onClick={() => {
                            close();
                            signInWithEmail(m.signIn!.email);
                            void navigate(m.signIn!.next);
                          }}
                        >
                          Open sign-in link
                        </button>
                      )}
                    </div>
                  )}
                  {m.status !== "sent" && (
                    <p className="mt-1 text-xs font-semibold text-wait">Not sent{m.error ? `: ${m.error}` : ""}</p>
                  )}
                  {m.reply && !m.fromCustomer && (
                    replying === m.id ? (
                      <ReplyBox phone={m.reply.phone} first={m.reply.first} done={() => setReplying(null)} />
                    ) : (
                      <button type="button" onClick={() => setReplying(m.id)} className="mt-1.5 text-sm font-semibold underline underline-offset-2">
                        Reply as {m.reply.first}
                      </button>
                    )
                  )}
                  {KIND_LABELS[m.kind] && <span className="sr-only">{KIND_LABELS[m.kind]}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}
