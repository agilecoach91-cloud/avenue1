"use client";

import { useEffect, useRef } from "react";

/** Keeps the newest message in view when a thread opens or gets a new message. */
export function ThreadEnd({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [count]);
  return <div ref={ref} />;
}
