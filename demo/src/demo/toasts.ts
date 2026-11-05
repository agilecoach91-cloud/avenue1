import { useSyncExternalStore } from "react";
import { createStore } from "./util";

export type Toast = { id: number; message: string; action?: { label: string; run: () => void }; sticky?: boolean };

const store = createStore<Toast[]>([]);
let n = 0;

export function toast(message: string, opts: Omit<Toast, "id" | "message"> = {}) {
  const t: Toast = { id: ++n, message, ...opts };
  store.set((list) => [...list.slice(-2), t]);
  if (!t.sticky) setTimeout(() => dismiss(t.id), 6000);
  return t.id;
}

export function dismiss(id: number) {
  store.set((list) => list.filter((t) => t.id !== id));
}

export function useToasts() {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function dismissAll() {
  store.set([]);
}
