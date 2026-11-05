import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addonCommand } from "@/app/dashboard/actions";
import { PageTitle } from "@/components/dashboard/ui";
import { requireOwner } from "@/lib/data";
import type { Addon } from "@/lib/types";
import { AddonForm } from "../../AddonForm";

export const metadata: Metadata = { title: "Edit add-on" };

export default async function EditAddonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business } = await requireOwner();
  const { data: addon } = await supabase
    .from("addons")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle<Addon>();
  if (!addon) notFound();
  return (
    <>
      <PageTitle title="Edit add-on" />
      <AddonForm addon={addon} />
      <form action={addonCommand} className="mt-6">
        <input type="hidden" name="id" value={addon.id} />
        <input type="hidden" name="command" value="delete" />
        <button className="btn btn-danger btn-sm">Delete this add-on</button>
      </form>
    </>
  );
}
