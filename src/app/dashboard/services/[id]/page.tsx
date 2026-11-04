import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serviceCommand } from "@/app/dashboard/actions";
import { PageTitle } from "@/components/dashboard/ui";
import { requireOwner } from "@/lib/data";
import type { Service } from "@/lib/types";
import { ServiceForm } from "../ServiceForm";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: PageProps<"/dashboard/services/[id]">) {
  const { id } = await params;
  const { supabase, business } = await requireOwner();
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle<Service>();
  if (!service) notFound();

  return (
    <>
      <PageTitle title="Edit service" />
      <ServiceForm service={service} />
      <form action={serviceCommand} className="mt-6">
        <input type="hidden" name="id" value={service.id} />
        <input type="hidden" name="command" value="delete" />
        <button className="btn btn-danger btn-sm">Delete this service</button>
        <p className="hint mt-2">Past bookings keep the service name. To hide it for a while, use Hide instead.</p>
      </form>
    </>
  );
}
