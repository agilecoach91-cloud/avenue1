import type { Metadata } from "next";
import { PageTitle } from "@/components/dashboard/ui";
import { AddonForm } from "../../AddonForm";

export const metadata: Metadata = { title: "Add an add-on" };

export default function NewAddonPage() {
  return (
    <>
      <PageTitle title="Add an add-on">Offered after the customer picks a time: &quot;Do you need anything else?&quot;</PageTitle>
      <AddonForm />
    </>
  );
}
