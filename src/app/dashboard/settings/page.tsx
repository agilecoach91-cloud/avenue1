import type { Metadata } from "next";
import { PageTitle } from "@/components/dashboard/ui";
import { requireOwner } from "@/lib/data";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { business } = await requireOwner();
  return (
    <>
      <PageTitle title="Settings">Your plan: {business.plan[0].toUpperCase() + business.plan.slice(1)}</PageTitle>
      <SettingsForm business={business} />
    </>
  );
}
