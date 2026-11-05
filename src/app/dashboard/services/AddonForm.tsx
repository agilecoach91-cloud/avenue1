"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveAddon, type FormState } from "@/app/dashboard/actions";
import { IconPicker } from "@/components/dashboard/IconPicker";
import type { Addon } from "@/lib/types";

export function AddonForm({ addon }: { addon?: Addon | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAddon, {});
  return (
    <form action={action} className="panel grid gap-4 p-5">
      {state.error && (
        <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop">
          {state.error}
        </p>
      )}
      {addon && <input type="hidden" name="id" value={addon.id} />}
      <div>
        <label className="label" htmlFor="name">Add-on name</label>
        <input id="name" name="name" required defaultValue={addon?.name} className="field" placeholder="Wasp nest removal" />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Short description <span className="font-normal text-steel">(optional)</span>
        </label>
        <input id="description" name="description" defaultValue={addon?.description ?? ""} className="field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="price">
            Price in dollars <span className="font-normal text-steel">(optional)</span>
          </label>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={addon?.price_cents != null ? (addon.price_cents / 100).toString() : ""}
            className="field"
            placeholder="120"
          />
          <p className="hint mt-1">Enter 0 to show it as free.</p>
        </div>
        <div>
          <label className="label" htmlFor="price_note">
            After the price <span className="font-normal text-steel">(optional)</span>
          </label>
          <input id="price_note" name="price_note" defaultValue={addon?.price_note ?? ""} className="field" placeholder="a day, per unit" />
        </div>
      </div>
      <IconPicker value={addon?.icon ?? null} legend="Icon" />
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save add-on"}
        </button>
        <Link href="/dashboard/services" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
