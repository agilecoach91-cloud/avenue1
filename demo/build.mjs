// Builds the clickable demo: the real app's pages, forms and logic bundled for
// the browser, with in-memory stand-ins for Supabase, Twilio and Resend.
// Output: dist/bookd-demo.html (a single self-contained page) and dist/test.html
// (the same page with a full HTML shell, for opening locally).
// Run from this folder: npm install && npm run build (the app's own npm install comes first).
import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const APP = path.resolve(ROOT, "../src");
const DEMO = path.join(ROOT, "src");
const SHIMS = path.join(DEMO, "shims");
const DIST = path.join(ROOT, "dist");
fs.mkdirSync(DIST, { recursive: true });

const exact = {
  "next/link": `${SHIMS}/next-link.tsx`,
  "next/navigation": `${SHIMS}/next-navigation.ts`,
  "next/cache": `${SHIMS}/next-cache.ts`,
  "next/server": `${SHIMS}/next-server.ts`,
  "next/headers": `${SHIMS}/next-headers.ts`,
  "server-only": `${SHIMS}/empty.ts`,
};
const byAbs = {
  [`${APP}/lib/env`]: `${SHIMS}/env.ts`,
  [`${APP}/lib/supabase/server`]: `${SHIMS}/supabase-server.ts`,
  [`${APP}/lib/supabase/admin`]: `${SHIMS}/supabase-admin.ts`,
  [`${APP}/lib/supabase/client`]: `${SHIMS}/supabase-client.ts`,
  [`${APP}/lib/google-places`]: `${SHIMS}/google-places.ts`,
  [`${APP}/lib/notify/providers`]: `${SHIMS}/providers.ts`,
  [`${APP}/lib/notify/providers.ts`]: `${SHIMS}/providers.ts`,
};

function resolveFile(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

const demoPlugin = {
  name: "bookd-demo",
  setup(build) {
    build.onResolve({ filter: /^(next\/(link|navigation|cache|server|headers)|server-only)$/ }, (a) => ({ path: exact[a.path] }));
    build.onResolve({ filter: /^@\// }, (a) => {
      const abs = APP + a.path.slice(1);
      if (byAbs[abs]) return { path: byAbs[abs] };
      const file = resolveFile(abs);
      if (!file) return { errors: [{ text: `Can't find ${a.path}` }] };
      return { path: file };
    });
    build.onResolve({ filter: /^\.\.?\// }, (a) => {
      const abs = path.resolve(a.resolveDir, a.path);
      if (byAbs[abs]) return { path: byAbs[abs] };
      return undefined;
    });
    build.onResolve({ filter: /^actions-impl:/ }, (a) => ({ path: a.path.slice("actions-impl:".length), namespace: "actions-impl" }));

    // "use server" modules: export each action wrapped so redirects become navigation.
    build.onLoad({ filter: /\/actions\.ts$/, namespace: "file" }, async (a) => {
      const src = await fs.promises.readFile(a.path, "utf8");
      if (!/^\s*["']use server["']/.test(src)) return undefined;
      const names = [...src.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
      const code = [
        `import * as impl from ${JSON.stringify(`actions-impl:${a.path}`)};`,
        `import { wrapAction } from ${JSON.stringify(`${DEMO}/demo/actions-wrap.ts`)};`,
        ...names.map((n) => `export const ${n} = wrapAction(impl.${n});`),
      ].join("\n");
      return { contents: code, loader: "ts", resolveDir: path.dirname(a.path) };
    });
    build.onLoad({ filter: /.*/, namespace: "actions-impl" }, async (a) => ({
      contents: await fs.promises.readFile(a.path, "utf8"),
      loader: "ts",
      resolveDir: path.dirname(a.path),
    }));
  },
};

const result = await esbuild.build({
  entryPoints: [`${DEMO}/main.tsx`],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  legalComments: "none",
  jsx: "automatic",
  jsxImportSource: "react",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_DEMO_SLUG": '"harbour-pest"',
    "process.env.NEXT_PUBLIC_APP_NAME": '"Bookd"',
    "process.env.GOOGLE_PLACES_API_KEY": '"demo"',
    "process.env.CRON_SECRET": '"demo"',
    "process.env.TWILIO_AUTH_TOKEN": '""',
  },
  nodePaths: [path.resolve(ROOT, "../node_modules")],
  plugins: [demoPlugin],
  write: false,
  logLevel: "error",
  metafile: true,
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");

// Tailwind: the app's own globals.css, scanning the app and the demo sources.
const globals = fs.readFileSync(`${APP}/app/globals.css`, "utf8");
const input = [
  `@import "tailwindcss" source(none);`,
  `@source "${APP}";`,
  `@source "${DEMO}";`,
  globals.replace(/@import\s+"tailwindcss";/, ""),
  fs.readFileSync(`${DEMO}/styles-demo.css`, "utf8"),
].join("\n");
fs.writeFileSync(path.join(DIST, "input.css"), input);
execFileSync(path.join(ROOT, "node_modules/.bin/tailwindcss"), ["-i", path.join(DIST, "input.css"), "-o", path.join(DIST, "app.css"), "--minify"], {
  cwd: ROOT,
  stdio: "pipe",
});
const css = fs.readFileSync(path.join(DIST, "app.css"), "utf8");

const font = fs.readFileSync(`${APP}/app/fonts/Archivo-Variable.woff2`).toString("base64");
const fontFace = `@font-face{font-family:"Archivo";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900;font-stretch:62% 125%;font-style:normal;font-display:swap}`;

const page = `<title>Bookd Demo</title>
<style>${fontFace}${css}</style>
<div id="app"></div>
<script>${js}</script>
`;
fs.writeFileSync(path.join(DIST, "bookd-demo.html"), page);
fs.writeFileSync(
  path.join(DIST, "test.html"),
  `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${page.replace("<div id=\"app\">", "</head><body><div id=\"app\">")}</body></html>`,
);

const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`js ${kb(js.length)}, css ${kb(css.length)}, font ${kb(font.length)}, page ${kb(page.length)}`);
