// Fires after background work (Next's after()) so the demo can run the
// reminder job and refresh the texts-and-emails panel.
const listeners = new Set<() => void>();

export function notifyOutbox() {
  listeners.forEach((f) => f());
}
export function onOutbox(fn: () => void) {
  listeners.add(fn);
}
