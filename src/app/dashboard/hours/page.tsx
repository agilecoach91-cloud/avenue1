import { redirect } from "next/navigation";

/** Hours moved into the per-location calendar. */
export default function HoursPage() {
  redirect("/dashboard/calendar");
}
