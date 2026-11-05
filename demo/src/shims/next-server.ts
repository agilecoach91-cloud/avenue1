import { notifyOutbox } from "../demo/outbox";

/** Runs work after the response, like Next's after(). */
export function after(fn: () => unknown) {
  setTimeout(() => {
    Promise.resolve()
      .then(fn)
      .catch((e) => console.error(e))
      .finally(() => notifyOutbox());
  }, 0);
}

export type NextRequest = Request & { nextUrl: URL };

export const NextResponse = {
  json: (data: unknown, init?: ResponseInit) => Response.json(data, init),
  next: () => new Response(null),
  redirect: (url: string | URL) => Response.redirect(url),
};
