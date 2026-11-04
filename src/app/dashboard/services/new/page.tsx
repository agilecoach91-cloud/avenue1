import type { Metadata } from "next";
import { PageTitle } from "@/components/dashboard/ui";
import { ServiceForm } from "../ServiceForm";

export const metadata: Metadata = { title: "Add a service" };

export default function NewServicePage() {
  return (
    <>
      <PageTitle title="Add a service" />
      <ServiceForm />
    </>
  );
}
