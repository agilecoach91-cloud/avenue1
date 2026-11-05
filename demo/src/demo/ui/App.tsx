import { Component, Suspense, use, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import NotFound from "@/app/not-found";
import { bindSetter, consumeScroll, load, navigate, RouterContext, type RouteState } from "../router-core";
import { NotFoundSignal, RedirectSignal } from "../signals";
import { DemoBar } from "./DemoBar";
import { MessagesDrawer } from "./Messages";
import { Toasts } from "./Toasts";

class Boundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown) {
    if (error instanceof RedirectSignal) void navigate(error.url);
    else if (!(error instanceof NotFoundSignal)) console.error(error);
  }
  render() {
    const e = this.state.error;
    if (!e) return this.props.children;
    if (e instanceof NotFoundSignal) return <NotFound />;
    if (e instanceof RedirectSignal) return null;
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="type-heading text-xl">This screen hit a problem.</p>
        <p className="mt-2 text-steel">{e instanceof Error ? e.message : String(e)}</p>
        <button type="button" className="btn btn-ghost mt-6" onClick={() => void navigate("/")}>
          Back to the start
        </button>
      </div>
    );
  }
}

function Resolved({ route }: { route: RouteState }) {
  return <>{use(load(route.path, route.version))}</>;
}

export function App({ initial, onReset }: { initial: RouteState; onReset: () => void }) {
  const [route, setRoute] = useState(initial);
  const prev = useRef(route.path);
  useLayoutEffect(() => {
    bindSetter(setRoute);
  }, []);
  useLayoutEffect(() => {
    if (prev.current !== route.path) {
      prev.current = route.path;
      if (consumeScroll()) window.scrollTo(0, 0);
    }
  }, [route.path]);

  return (
    <RouterContext.Provider value={route}>
      <DemoBar path={route.path} onReset={onReset} />
      <div className="demo-shell">
        <Boundary key={route.path}>
          <Suspense fallback={<p className="p-8 text-center text-steel">Loading…</p>}>
            <Resolved route={route} />
          </Suspense>
        </Boundary>
      </div>
      <MessagesDrawer />
      <Toasts />
    </RouterContext.Provider>
  );
}
