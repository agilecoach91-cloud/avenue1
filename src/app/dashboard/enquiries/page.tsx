import { redirect } from "next/navigation";

/** Quote requests now live in the bookings table. */
export default function EnquiriesPage() {
  redirect("/dashboard/bookings?tab=quotes");
}
