import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { InboxList } from "@/components/dashboard/InboxList";
import { ownerConversations, ownerLocations, requireOwner } from "@/lib/data";

export const metadata: Metadata = { title: "Inbox" };

type Props = { searchParams: Promise<{ filter?: string; loc?: string }> };

export default async function InboxPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { supabase, business } = await requireOwner();
  const locations = await ownerLocations(supabase, business.id);
  const loc = locations.length > 1 && locations.some((l) => l.id === sp.loc) ? sp.loc! : "";
  const conversations = await ownerConversations(supabase, business.id, loc);

  return (
    <>
      <h1 className="type-display mb-4 text-[1.75rem] sm:text-[2rem]">Inbox</h1>
      <div className="panel overflow-hidden md:grid md:h-[calc(100dvh-10rem)] md:min-h-[30rem] md:grid-cols-[21rem_1fr]">
        <div className="flex min-h-0 flex-col md:border-r md:border-line">
          <InboxList
            conversations={conversations}
            timezone={business.timezone}
            locations={locations}
            filter={sp.filter === "unread" ? "unread" : "all"}
            loc={loc}
          />
        </div>
        <div className="hidden place-items-center p-8 text-center text-steel md:grid">
          <div>
            <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-surface text-ink">
              <Icon name="message" size={26} />
            </span>
            <p>Pick a conversation to read and reply.</p>
          </div>
        </div>
      </div>
    </>
  );
}
