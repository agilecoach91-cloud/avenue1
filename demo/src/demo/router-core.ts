// A small client-side stand-in for the Next.js router. Each route's server
// component tree is resolved to plain React elements before it's shown, so
// navigation never flashes a loading state.
import { createContext, startTransition, type ReactNode } from "react";
import { getVersion } from "./db";
import { RedirectSignal } from "./signals";

export const APP_ORIGIN = "https://yourdomain.com.au";

export type RouteState = { path: string; version: number };
type Tracked = Promise<ReactNode> & { status?: string; value?: ReactNode; reason?: unknown };

let resolver: ((path: string) => Promise<ReactNode>) | null = null;
let current: RouteState = { path: "/", version: -1 };
let setter: ((s: RouteState) => void) | null = null;
const cache = new Map<string, Tracked>();
const pathListeners = new Set<(path: string) => void>();
let navSeq = 0;
let navPending = false;
let refreshQueued = false;
let scrollOnCommit = false;

export const RouterContext = createContext<RouteState>(current);

export function setResolver(fn: (path: string) => Promise<ReactNode>) {
  resolver = fn;
}
export function bindSetter(fn: (s: RouteState) => void) {
  setter = fn;
}
export function getRoute() {
  return current;
}
export function onPathChange(fn: (path: string) => void) {
  pathListeners.add(fn);
  return () => {
    pathListeners.delete(fn);
  };
}
export function consumeScroll() {
  const v = scrollOnCommit;
  scrollOnCommit = false;
  return v;
}

export function load(path: string, version: number): Tracked {
  const key = `${version}|${path}`;
  let t = cache.get(key);
  if (!t) {
    const p = resolver!(path);
    const tracked: Tracked = p.then(
      (v) => {
        tracked.status = "fulfilled";
        tracked.value = v;
        return v;
      },
      (e) => {
        tracked.status = "rejected";
        tracked.reason = e;
        throw e;
      },
    );
    tracked.status = "pending";
    tracked.catch(() => {});
    t = tracked;
    cache.set(key, t);
    if (cache.size > 60) {
      for (const k of cache.keys()) {
        if (cache.size <= 40) break;
        if (k !== `${current.version}|${current.path}`) cache.delete(k);
      }
    }
  }
  return t;
}

/** Turns an app URL (or a full yourdomain.com.au URL) into a path. */
export function toPath(href: string): string {
  let h = href;
  if (h.startsWith(APP_ORIGIN)) h = h.slice(APP_ORIGIN.length) || "/";
  if (!h.startsWith("/")) h = `/${h}`;
  return h;
}

function commit(next: RouteState, scroll: boolean) {
  const pathChanged = next.path !== current.path;
  current = next;
  if (scroll && pathChanged) scrollOnCommit = true;
  startTransition(() => setter?.(next));
  if (pathChanged) pathListeners.forEach((f) => f(next.path));
}

export async function navigate(href: string, opts: { scroll?: boolean } = {}): Promise<void> {
  const path = toPath(href);
  const seq = ++navSeq;
  navPending = true;
  const version = getVersion();
  try {
    await load(path, version);
  } catch (e) {
    if (e instanceof RedirectSignal) {
      if (seq === navSeq) return navigate(e.url, opts);
      return;
    }
    // Not found or a real error: commit and let the error boundary show it.
  }
  if (seq !== navSeq) return;
  navPending = false;
  commit({ path, version: getVersion() === version ? version : version }, opts.scroll !== false);
}

/** Re-runs the current page's data loading after a change (Next's revalidatePath). */
export function requestRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  setTimeout(() => {
    refreshQueued = false;
    void refresh();
  }, 0);
}

async function refresh(): Promise<void> {
  if (navPending) return;
  const seq = navSeq;
  const path = current.path;
  const version = getVersion();
  if (version === current.version) return;
  try {
    await load(path, version);
  } catch (e) {
    if (e instanceof RedirectSignal) {
      if (seq === navSeq && !navPending) return navigate(e.url);
      return;
    }
  }
  if (seq !== navSeq || navPending) return;
  commit({ path, version }, false);
}

/** First render: resolve the start page (following redirects) before mounting. */
export async function bootstrap(path: string): Promise<RouteState> {
  let target = toPath(path);
  for (let i = 0; i < 5; i++) {
    const version = getVersion();
    try {
      await load(target, version);
      current = { path: target, version };
      return current;
    } catch (e) {
      if (e instanceof RedirectSignal) {
        target = toPath(e.url);
        continue;
      }
      current = { path: target, version };
      return current;
    }
  }
  current = { path: target, version: getVersion() };
  return current;
}
