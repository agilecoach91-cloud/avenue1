// Node-isms the app's server code expects, provided for the browser.
const g = globalThis as unknown as Record<string, unknown>;

g.process = {
  env: {
    NODE_ENV: "production",
    CRON_SECRET: "demo",
    GOOGLE_PLACES_API_KEY: "demo",
    TWILIO_AUTH_TOKEN: "",
    NEXT_PUBLIC_APP_NAME: "Bookd",
    NEXT_PUBLIC_DEMO_SLUG: "harbour-pest",
  },
};

g.Buffer = {
  from(input: string | Uint8Array) {
    const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
    return {
      toString(encoding = "utf8") {
        if (encoding === "base64") {
          let s = "";
          bytes.forEach((b) => (s += String.fromCharCode(b)));
          return btoa(s);
        }
        return new TextDecoder().decode(bytes);
      },
    };
  },
};

if (typeof (Response as unknown as { json?: unknown }).json !== "function") {
  (Response as unknown as { json: (d: unknown, i?: ResponseInit) => Response }).json = (data, init = {}) => {
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new Response(JSON.stringify(data), { ...init, headers });
  };
}
