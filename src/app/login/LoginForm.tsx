"use client";

import { useActionState } from "react";
import { sendSignInLink, type LoginState } from "./actions";

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendSignInLink, {
    status: error ? "error" : "idle",
    message: error,
  });

  if (state.status === "sent") {
    return (
      <div role="status" className="panel p-6">
        <h2 className="type-heading text-xl">Check your email</h2>
        <p className="mt-2">
          We sent a sign-in link to <strong>{state.email}</strong>. Open it on this device to continue.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="panel grid gap-4 p-6">
      {state.status === "error" && (
        <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop">
          {state.message}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          className="field"
        />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p className="hint">New here? The same link creates your account.</p>
    </form>
  );
}
