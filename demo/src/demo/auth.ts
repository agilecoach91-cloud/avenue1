// Demo sign-in: magic-link emails land in the demo outbox and open instantly.
import { createStore, nowIso, uuid } from "./util";

export type DemoUser = { id: string; email: string };
export type SignInEmail = { id: string; email: string; next: string; created_at: string };

const users = new Map<string, DemoUser>();
export const authStore = createStore<{ user: DemoUser | null; signInEmails: SignInEmail[] }>({
  user: null,
  signInEmails: [],
});

const signInListeners = new Set<(user: DemoUser) => void>();
const linkListeners = new Set<(item: SignInEmail) => void>();

export function registerUser(id: string, email: string): DemoUser {
  const user = { id, email };
  users.set(email.toLowerCase(), user);
  return user;
}

export function userById(id: string): DemoUser | null {
  for (const u of users.values()) if (u.id === id) return u;
  return null;
}

export function currentUser(): DemoUser | null {
  return authStore.get().user;
}

function setUser(user: DemoUser | null) {
  authStore.set((s) => ({ ...s, user }));
  if (user) signInListeners.forEach((f) => f(user));
}

export function signInWithEmail(email: string): DemoUser {
  const user = users.get(email.toLowerCase()) ?? registerUser(uuid(), email);
  setUser(user);
  return user;
}

export function signInAsId(id: string) {
  const user = userById(id);
  if (user) setUser(user);
}

export function signOutDemo() {
  setUser(null);
}

export function onSignIn(fn: (user: DemoUser) => void) {
  signInListeners.add(fn);
}

export function onSignInLink(fn: (item: SignInEmail) => void) {
  linkListeners.add(fn);
}

/** What supabase.auth.signInWithOtp does here: "email" the link to the demo outbox. */
export function requestSignInLink(email: string, redirectTo?: string) {
  let next = "/dashboard";
  try {
    next = new URL(redirectTo ?? "").searchParams.get("next") || "/dashboard";
  } catch {
    // No redirect given: go to the dashboard.
  }
  const item: SignInEmail = { id: uuid(), email, next, created_at: nowIso() };
  authStore.set((s) => ({ ...s, signInEmails: [...s.signInEmails, item] }));
  linkListeners.forEach((f) => f(item));
}

export function clearSignInEmails() {
  authStore.set((s) => ({ ...s, signInEmails: [] }));
}
