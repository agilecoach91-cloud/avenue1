// Stand-ins for Next.js's redirect() and notFound(), which work by throwing.

export class RedirectSignal extends Error {
  url: string;
  constructor(url: string) {
    super(`Redirect to ${url}`);
    this.url = url;
  }
}

export class NotFoundSignal extends Error {
  constructor() {
    super("Not found");
  }
}
