// Routes the app's fetch("/api/...") calls to its real route handlers, running
// in the browser, and runs the reminder job like a scheduler would.
import * as cron from "@/app/api/cron/reminders/route";
import * as feed from "@/app/api/ics/[token]/route";
import * as bookingIcs from "@/app/api/public/bookings/[token]/ics/route";
import * as bookings from "@/app/api/public/bookings/route";
import * as enquiries from "@/app/api/public/enquiries/route";
import * as slots from "@/app/api/public/slots/route";
import * as track from "@/app/api/public/track/route";

type Ctx = { params: Promise<Record<string, string>> };

async function handle(req: Request, url: URL): Promise<Response> {
  const p = url.pathname;
  let m: RegExpExecArray | null;
  if (p === "/api/public/slots" && req.method === "GET") return slots.GET(req as never);
  if (p === "/api/public/bookings" && req.method === "POST") return bookings.POST(req);
  if (p === "/api/public/enquiries" && req.method === "POST") return enquiries.POST(req);
  if (p === "/api/public/track" && req.method === "POST") return track.POST(req);
  if ((m = /^\/api\/public\/bookings\/([^/]+)\/ics$/.exec(p))) {
    return bookingIcs.GET(req, { params: Promise.resolve({ token: m[1] }) } as Ctx as never);
  }
  if ((m = /^\/api\/ics\/([^/]+)$/.exec(p))) return feed.GET(req, { params: Promise.resolve({ token: m[1] }) } as Ctx as never);
  if (p === "/api/cron/reminders") return cron.GET(req);
  return new Response("Not found", { status: 404 });
}

let cronTimer: ReturnType<typeof setTimeout> | undefined;

export async function runCron() {
  try {
    await cron.GET(new Request("https://demo.local/api/cron/reminders", { headers: { authorization: "Bearer demo" } }));
  } catch (e) {
    console.error("Reminder job failed", e);
  }
}

/** Runs the reminder and review-request job shortly after something changes. */
export function scheduleCron(delay = 1200) {
  clearTimeout(cronTimer);
  cronTimer = setTimeout(() => void runCron(), delay);
}

export function installApi() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!href.startsWith("/api/")) return realFetch(input, init);
    const url = new URL(href, "https://demo.local");
    const req = new Request(url, init);
    Object.defineProperty(req, "nextUrl", { value: url });
    // A short pause so loading states look like the real thing.
    await new Promise((r) => setTimeout(r, req.method === "GET" ? 180 : 420));
    try {
      const res = await handle(req, url);
      if (req.method !== "GET") scheduleCron();
      return res;
    } catch (e) {
      console.error(e);
      return Response.json({ error: "Something went wrong in the demo." }, { status: 500 });
    }
  };
  try {
    const beacon = (href: string | URL, data?: BodyInit | null) => {
      void window.fetch(String(href), { method: "POST", body: data ?? null });
      return true;
    };
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
  } catch {
    // If the browser refuses, page views just aren't counted.
  }
  setInterval(() => void runCron(), 30_000);
}
