"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendReply, type FormState } from "@/app/dashboard/actions";
import { Icon } from "@/components/Icon";

export function ReplyForm({ conversationId, firstName }: { conversationId: string; firstName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendReply, {});
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (state.ok) box.current?.focus();
  }, [state]);
  return (
    <form action={action} className="border-t border-line bg-paper p-3">
      {state.error && (
        <p role="alert" className="mb-2 rounded-md bg-stop-soft p-2.5 text-sm text-stop">
          {state.error}
        </p>
      )}
      <input type="hidden" name="conversation" value={conversationId} />
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Text {firstName}</span>
          <textarea
            ref={box}
            name="body"
            required
            maxLength={640}
            rows={2}
            placeholder={`Text ${firstName}…`}
            className="field min-h-[48px] resize-none py-2.5"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
          />
        </label>
        <button className="btn btn-primary shrink-0" disabled={pending} aria-label="Send text">
          <Icon name="send" size={18} />
          <span className="hidden sm:inline">{pending ? "Sending…" : "Send"}</span>
        </button>
      </div>
      <p className="hint mt-1.5">Sent as a text from your business number. Counts toward your monthly texts.</p>
    </form>
  );
}
