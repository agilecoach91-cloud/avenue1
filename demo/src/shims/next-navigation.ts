import { useContext } from "react";
import { NotFoundSignal, RedirectSignal } from "../demo/signals";
import { navigate, requestRefresh, RouterContext } from "../demo/router-core";

export function redirect(url: string): never {
  throw new RedirectSignal(url);
}
export const permanentRedirect = redirect;

export function notFound(): never {
  throw new NotFoundSignal();
}

export function useRouter() {
  return {
    push: (href: string) => void navigate(href),
    replace: (href: string) => void navigate(href),
    refresh: () => requestRefresh(),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    prefetch: () => {},
  };
}

export function usePathname(): string {
  const route = useContext(RouterContext);
  return new URL(route.path, "https://demo.local").pathname;
}

export function useSearchParams(): URLSearchParams {
  const route = useContext(RouterContext);
  return new URL(route.path, "https://demo.local").searchParams;
}
