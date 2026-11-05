// Server actions run in the browser here. Redirects become client navigation,
// and every action nudges the reminder job, like the real background scheduler.
import { notifyOutbox } from "./outbox";
import { navigate } from "./router-core";
import { NotFoundSignal, RedirectSignal } from "./signals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapAction<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  if (typeof fn !== "function") return fn;
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (e) {
      // useActionState actions take (previousState, formData): keep the state on redirect.
      if (e instanceof RedirectSignal) {
        void navigate(e.url);
        return args.length >= 2 ? args[0] : undefined;
      }
      if (e instanceof NotFoundSignal) return args.length >= 2 ? args[0] : undefined;
      throw e;
    } finally {
      notifyOutbox();
    }
  }) as T;
}
