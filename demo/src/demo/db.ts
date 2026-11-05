// In-memory stand-in for the Supabase database, with the parts of the PostgREST
// query builder the app uses, row level security for signed-in owners, and the
// same unique and no-double-booking rules as the real schema.
import { currentUser } from "./auth";
import { clone, hexToken, nowIso, uuid } from "./util";

type Row = Record<string, unknown>;

export const tables: Record<string, Row[]> = {
  businesses: [],
  locations: [],
  services: [],
  addons: [],
  availability: [],
  time_off: [],
  bookings: [],
  enquiries: [],
  message_log: [],
  page_events: [],
  conversations: [],
  messages: [],
};

let version = 0;
const listeners = new Set<() => void>();
const insertHooks: Record<string, ((row: Row) => void)[]> = {};

export function getVersion() {
  return version;
}
export function subscribeDb(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function changed() {
  version++;
  listeners.forEach((f) => f());
}
export function onInsert(table: string, fn: (row: Row) => void) {
  (insertHooks[table] ??= []).push(fn);
}
export function clearAll() {
  for (const k of Object.keys(tables)) tables[k] = [];
  changed();
}

const DEFAULTS: Record<string, () => Row> = {
  businesses: () => ({
    trade: "general", tagline: null, about: null, phone: null, email: null, service_area: null, address: null,
    licence_number: null, abn: null, timezone: "Australia/Sydney", brand_color: "#F2A900", logo_url: null,
    cover_url: null, google_place_id: null, google_review_url: null, google_rating: null, google_review_count: null,
    instagram_url: null, facebook_url: null, website_url: null, booking_window_days: 28, slot_interval_min: 30,
    auto_confirm: true, review_delay_hours: 2, notify_owner_sms: true, notify_owner_email: true, plan: "free",
    published: true, ics_token: hexToken(), created_at: nowIso(), updated_at: nowIso(),
  }),
  locations: () => ({ address: null, phone: null, lead_time_hours: 12, daily_limits: {}, sort: 0, active: true, created_at: nowIso() }),
  services: () => ({
    description: null, price_type: "fixed", price_cents: null, duration_min: 60, booking_mode: "instant",
    questions: [], repeat_months: null, icon: null, sort: 0, active: true, created_at: nowIso(),
  }),
  addons: () => ({ description: null, price_cents: null, price_note: null, icon: null, sort: 0, active: true, created_at: nowIso() }),
  availability: () => ({}),
  time_off: () => ({ note: null }),
  bookings: () => ({
    location_id: null, service_id: null, price_type: null, price_cents: null, status: "pending", customer_email: null,
    address: null, answers: {}, notes: null, source: null, items: [], addons: [], flexible: false,
    manage_token: hexToken(), confirmed_at: null, completed_at: null, cancelled_at: null, reminder_24h_at: null,
    reminder_1h_at: null, review_requested_at: null, created_at: nowIso(),
  }),
  enquiries: () => ({
    location_id: null, service_id: null, service_name: null, customer_email: null, address: null, message: null,
    answers: {}, items: [], addons: [], photo_paths: [], status: "new", source: null, created_at: nowIso(),
  }),
  message_log: () => ({ booking_id: null, enquiry_id: null, provider_id: null, error: null, created_at: nowIso() }),
  page_events: () => ({ source: null, created_at: nowIso() }),
  conversations: () => ({
    location_id: null, customer_name: null, last_message_at: nowIso(), last_message_preview: null, unread_count: 0,
    created_at: nowIso(),
  }),
  messages: () => ({ kind: null, status: "sent", error: null, provider_id: null, created_at: nowIso() }),
};

type DbError = { code: string; message: string; details?: string };
type Result = { data: unknown; error: DbError | null; count: number | null; status: number; statusText: string };

const ACTIVE = ["pending", "confirmed"];
const isIsoDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);

function same(a: unknown, b: unknown) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}
function compare(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (isIsoDate(a) && isIsoDate(b)) return new Date(a as string).getTime() - new Date(b as string).getTime();
  if (typeof a === "number" || typeof b === "number") return Number(a) - Number(b);
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

/** Row level security: which rows an owner may see or change. */
function ownedBusinessIds(): Set<string> {
  const user = currentUser();
  if (!user) return new Set();
  return new Set(tables.businesses.filter((b) => b.owner_id === user.id).map((b) => b.id as string));
}
function visibleTo(table: string, admin: boolean): (r: Row) => boolean {
  if (admin) return () => true;
  const user = currentUser();
  if (!user) return () => false;
  if (table === "businesses") return (r) => r.owner_id === user.id;
  const owned = ownedBusinessIds();
  return (r) => owned.has(r.business_id as string);
}

function overlapError(): DbError {
  return {
    code: "23P01",
    message: 'conflicting key value violates exclusion constraint "bookings_no_overlap"',
  };
}
function clashes(candidate: Row, others: Row[]): boolean {
  if (!candidate.location_id || !ACTIVE.includes(candidate.status as string)) return false;
  const s = new Date(candidate.starts_at as string).getTime();
  const e = new Date(candidate.ends_at as string).getTime();
  return others.some(
    (o) =>
      o !== candidate &&
      o.id !== candidate.id &&
      o.location_id === candidate.location_id &&
      ACTIVE.includes(o.status as string) &&
      new Date(o.starts_at as string).getTime() < e &&
      s < new Date(o.ends_at as string).getTime(),
  );
}
function uniqueError(table: string, row: Row, others: Row[]): DbError | null {
  const dup = (cols: string[], name: string) =>
    others.some((o) => o !== row && o.id !== row.id && cols.every((c) => same(o[c], row[c])))
      ? { code: "23505", message: `duplicate key value violates unique constraint "${name}"` }
      : null;
  if (table === "businesses") return dup(["slug"], "businesses_slug_key") ?? dup(["owner_id"], "businesses_owner_id_key");
  if (table === "conversations") return dup(["business_id", "customer_phone"], "conversations_business_id_customer_phone_key");
  return null;
}

export class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private cols = "*";
  private wantCount = false;
  private head = false;
  private returning = false;
  private payload: unknown = null;
  private filters: ((r: Row) => boolean)[] = [];
  private orders: [string, boolean][] = [];
  private lim: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";

  constructor(
    private table: string,
    private admin: boolean,
  ) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    this.cols = cols;
    if (this.op !== "select") this.returning = true;
    if (opts?.count) this.wantCount = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(rows: unknown) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }
  update(patch: unknown) {
    this.op = "update";
    this.payload = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push((r) => same(r[c], v));
    return this;
  }
  neq(c: string, v: unknown) {
    this.filters.push((r) => !same(r[c], v));
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filters.push((r) => vs.some((v) => same(r[c], v)));
    return this;
  }
  is(c: string, v: unknown) {
    this.filters.push((r) => (v === null ? r[c] == null : r[c] === v));
    return this;
  }
  gt(c: string, v: unknown) {
    this.filters.push((r) => r[c] != null && compare(r[c], v) > 0);
    return this;
  }
  gte(c: string, v: unknown) {
    this.filters.push((r) => r[c] != null && compare(r[c], v) >= 0);
    return this;
  }
  lt(c: string, v: unknown) {
    this.filters.push((r) => r[c] != null && compare(r[c], v) < 0);
    return this;
  }
  lte(c: string, v: unknown) {
    this.filters.push((r) => r[c] != null && compare(r[c], v) <= 0);
    return this;
  }
  order(c: string, opts?: { ascending?: boolean }) {
    this.orders.push([c, opts?.ascending !== false]);
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  returns() {
    return this;
  }
  abortSignal() {
    return this;
  }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve()
      .then(() => this.run())
      .then(ok, fail);
  }

  private project(row: Row): Row {
    if (this.cols === "*" || !this.cols) return clone(row);
    const out: Row = {};
    for (const c of this.cols.split(",").map((s) => s.trim())) out[c] = clone(row[c]);
    return out;
  }

  private sorted(rows: Row[]): Row[] {
    if (!this.orders.length) return rows;
    return [...rows].sort((a, b) => {
      for (const [c, asc] of this.orders) {
        const av = a[c];
        const bv = b[c];
        if (av == null && bv == null) continue;
        if (av == null) return asc ? 1 : -1; // nulls last ascending, first descending
        if (bv == null) return asc ? -1 : 1;
        const d = compare(av, bv);
        if (d !== 0) return asc ? d : -d;
      }
      return 0;
    });
  }

  private finish(rows: Row[] | null, count: number | null, error: DbError | null = null): Result {
    const base = { error, count: this.wantCount ? count : null, status: error ? 400 : 200, statusText: error ? "Error" : "OK" };
    if (error) return { data: null, ...base };
    if (rows === null) return { data: null, ...base };
    if (this.mode === "single") {
      if (rows.length !== 1) {
        return { data: null, ...base, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, status: 406 };
      }
      return { data: rows[0], ...base };
    }
    if (this.mode === "maybe") {
      if (rows.length > 1) {
        return { data: null, ...base, error: { code: "PGRST116", message: "JSON object requested, multiple rows returned" }, status: 406 };
      }
      return { data: rows[0] ?? null, ...base };
    }
    return { data: rows, ...base };
  }

  private run(): Result {
    const all = (tables[this.table] ??= []);
    const visible = visibleTo(this.table, this.admin);

    if (this.op === "select") {
      let rows = all.filter((r) => visible(r) && this.filters.every((f) => f(r)));
      const count = rows.length;
      rows = this.sorted(rows);
      if (this.lim != null) rows = rows.slice(0, this.lim);
      return this.finish(this.head ? null : rows.map((r) => this.project(r)), count);
    }

    if (this.op === "insert") {
      const input = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const fresh = input.map((r) => ({ id: uuid(), ...(DEFAULTS[this.table]?.() ?? {}), ...clone(r) }));
      if (!this.admin) {
        const user = currentUser();
        const owned = ownedBusinessIds();
        const ok = fresh.every((r) =>
          this.table === "businesses" ? user && r.owner_id === user.id : owned.has(r.business_id as string),
        );
        if (!ok) return this.finish(null, null, { code: "42501", message: "new row violates row-level security policy" });
      }
      const pool = [...all];
      for (const r of fresh) {
        const u = uniqueError(this.table, r, pool);
        if (u) return this.finish(null, null, u);
        if (this.table === "bookings" && clashes(r, pool)) return this.finish(null, null, overlapError());
        pool.push(r);
      }
      all.push(...fresh);
      fresh.forEach((r) => insertHooks[this.table]?.forEach((h) => h(r)));
      changed();
      return this.finish(this.returning ? fresh.map((r) => this.project(r)) : null, fresh.length);
    }

    const targets = all.filter((r) => visible(r) && this.filters.every((f) => f(r)));

    if (this.op === "update") {
      const patch = clone(this.payload as Row);
      for (const t of targets) {
        const next = { ...t, ...patch };
        const u = uniqueError(this.table, next, all);
        if (u) return this.finish(null, null, u);
        if (this.table === "bookings" && clashes(next, all)) return this.finish(null, null, overlapError());
      }
      targets.forEach((t) => Object.assign(t, clone(patch)));
      if (targets.length) changed();
      return this.finish(this.returning ? targets.map((r) => this.project(r)) : null, targets.length);
    }

    // delete (with simple cascades for locations)
    tables[this.table] = all.filter((r) => !targets.includes(r));
    if (this.table === "locations") {
      const gone = new Set(targets.map((t) => t.id));
      tables.availability = tables.availability.filter((r) => !gone.has(r.location_id));
      tables.time_off = tables.time_off.filter((r) => !gone.has(r.location_id));
      for (const t of ["bookings", "enquiries", "conversations"]) {
        tables[t].forEach((r) => {
          if (gone.has(r.location_id)) r.location_id = null;
        });
      }
    }
    if (targets.length) changed();
    return this.finish(this.returning ? targets.map((r) => this.project(r)) : null, targets.length);
  }
}
