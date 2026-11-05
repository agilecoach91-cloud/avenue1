// Maps a URL to the app's real page and layout components, resolving their
// async (server) work in the browser.
import type { ReactNode } from "react";
import BusinessPage from "@/app/[slug]/page";
import BookPage from "@/app/[slug]/book/page";
import BookServiceRedirect from "@/app/[slug]/book/[serviceId]/page";
import QuoteRedirect from "@/app/[slug]/quote/page";
import ManageBookingPage from "@/app/b/[token]/page";
import DashboardLayout from "@/app/dashboard/layout";
import DashboardHome from "@/app/dashboard/page";
import AnalyticsPage from "@/app/dashboard/analytics/page";
import BookingsPage from "@/app/dashboard/bookings/page";
import BookingDetailPage from "@/app/dashboard/bookings/[id]/page";
import CalendarPage from "@/app/dashboard/calendar/page";
import LocationCalendarPage from "@/app/dashboard/calendar/[id]/page";
import EnquiriesPage from "@/app/dashboard/enquiries/page";
import EnquiryDetailPage from "@/app/dashboard/enquiries/[id]/page";
import HoursPage from "@/app/dashboard/hours/page";
import InboxPage from "@/app/dashboard/inbox/page";
import ConversationPage from "@/app/dashboard/inbox/[id]/page";
import MorePage from "@/app/dashboard/more/page";
import ServicesPage from "@/app/dashboard/services/page";
import EditServicePage from "@/app/dashboard/services/[id]/page";
import EditAddonPage from "@/app/dashboard/services/addons/[id]/page";
import NewAddonPage from "@/app/dashboard/services/addons/new/page";
import NewServicePage from "@/app/dashboard/services/new/page";
import SettingsPage from "@/app/dashboard/settings/page";
import SharePage from "@/app/dashboard/share/page";
import LoginPage from "@/app/login/page";
import OnboardingPage from "@/app/onboarding/page";
import Home from "@/app/page";
import { NotFoundSignal } from "./signals";

// Pages are called directly, the way the server would, so redirects and data
// loading happen before anything is shown.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPage = (props: any) => ReactNode | Promise<ReactNode>;

export async function resolveRoute(path: string): Promise<ReactNode> {
  const url = new URL(path, "https://demo.local");
  const segs = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const searchParams: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    searchParams[k] = v;
  });
  const call = async (Page: AnyPage, params: Record<string, string> = {}) =>
    Page({ params: Promise.resolve(params), searchParams: Promise.resolve(searchParams) });

  if (segs.length === 0) return call(Home as AnyPage);

  switch (segs[0]) {
    case "login":
      return call(LoginPage as AnyPage);
    case "onboarding":
      return call(OnboardingPage as AnyPage);
    case "b":
      if (segs[1] && segs.length === 2) return call(ManageBookingPage as AnyPage, { token: segs[1] });
      break;
    case "dashboard": {
      const [, a, b, c] = segs;
      let page: AnyPage | null = null;
      let params: Record<string, string> = {};
      if (!a) page = DashboardHome as AnyPage;
      else if (a === "bookings") [page, params] = b ? [BookingDetailPage as AnyPage, { id: b }] : [BookingsPage as AnyPage, {}];
      else if (a === "enquiries") [page, params] = b ? [EnquiryDetailPage as AnyPage, { id: b }] : [EnquiriesPage as AnyPage, {}];
      else if (a === "inbox") [page, params] = b ? [ConversationPage as AnyPage, { id: b }] : [InboxPage as AnyPage, {}];
      else if (a === "analytics") page = AnalyticsPage as AnyPage;
      else if (a === "calendar") [page, params] = b ? [LocationCalendarPage as AnyPage, { id: b }] : [CalendarPage as AnyPage, {}];
      else if (a === "hours") page = HoursPage as AnyPage;
      else if (a === "services") {
        if (!b) page = ServicesPage as AnyPage;
        else if (b === "new") page = NewServicePage as AnyPage;
        else if (b === "addons") [page, params] = c === "new" ? [NewAddonPage as AnyPage, {}] : [EditAddonPage as AnyPage, { id: c ?? "" }];
        else [page, params] = [EditServicePage as AnyPage, { id: b }];
      } else if (a === "share") page = SharePage as AnyPage;
      else if (a === "settings") page = SettingsPage as AnyPage;
      else if (a === "more") page = MorePage as AnyPage;
      if (!page) throw new NotFoundSignal();
      const children = await call(page, params);
      return (DashboardLayout as AnyPage)({ children });
    }
  }

  if (segs.length === 1) return call(BusinessPage as AnyPage, { slug: segs[0] });
  if (segs.length === 2 && segs[1] === "book") return call(BookPage as AnyPage, { slug: segs[0] });
  if (segs.length === 3 && segs[1] === "book") return call(BookServiceRedirect as AnyPage, { slug: segs[0], serviceId: segs[2] });
  if (segs.length === 2 && segs[1] === "quote") return call(QuoteRedirect as AnyPage, { slug: segs[0] });
  throw new NotFoundSignal();
}
