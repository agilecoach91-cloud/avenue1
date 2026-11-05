// Which business and view the demo is showing, and the shortcuts behind the
// top bar (sign in as the owner, open the booking page, reset).
import { useSyncExternalStore } from "react";
import { authStore, currentUser, onSignIn, signInAsId, signOutDemo } from "./auth";
import { getVersion, onInsert, subscribeDb, tables } from "./db";
import { getRoute, navigate } from "./router-core";
import { createStore } from "./util";

export type View = "website" | "booking" | "dashboard";

const current = createStore<string | null>(null);

export function setCurrentBusiness(id: string | null) {
  current.set(id);
}

export function currentBusiness(): Record<string, unknown> | undefined {
  return tables.businesses.find((b) => b.id === current.get()) ?? tables.businesses[0];
}

onInsert("businesses", (row) => setCurrentBusiness(row.id as string));
onSignIn((user) => {
  const own = tables.businesses.find((b) => b.owner_id === user.id);
  if (own) setCurrentBusiness(own.id as string);
});

export function viewOf(path: string): View {
  const p = new URL(path, "https://demo.local").pathname;
  if (p === "/" || p.startsWith("/login") || p.startsWith("/onboarding") || p.startsWith("/auth")) return "website";
  if (p.startsWith("/dashboard")) return "dashboard";
  return "booking";
}

export function signInAsOwnerOf(business: Record<string, unknown> | undefined) {
  if (business && currentUser()?.id !== business.owner_id) signInAsId(business.owner_id as string);
}

export function openView(view: View, path?: string) {
  const biz = currentBusiness();
  if (view === "website") {
    signOutDemo();
    return navigate(path ?? "/");
  }
  if (view === "booking") return navigate(path ?? `/${biz?.slug}?src=google`);
  signInAsOwnerOf(biz);
  return navigate(path ?? "/dashboard");
}

export function useDemoState() {
  const v = useSyncExternalStore(subscribeDb, getVersion, getVersion);
  const id = useSyncExternalStore(current.subscribe, current.get, current.get);
  const auth = useSyncExternalStore(authStore.subscribe, authStore.get, authStore.get);
  return { version: v, currentId: id, user: auth.user, businesses: tables.businesses, route: getRoute() };
}
