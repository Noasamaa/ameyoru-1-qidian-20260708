import { requireSession } from "@/lib/auth-helpers";
import { getAnnouncements } from "@/server/actions/announcements";
import { AnnouncementsClient } from "./announcements-client";

export default async function AnnouncementsPage() {
  await requireSession({ role: ["BOSS", "STAFF"] });
  const items = await getAnnouncements();
  return <AnnouncementsClient items={items.map((i) => ({ ...i, startAt: i.startAt?.toISOString() ?? null, endAt: i.endAt?.toISOString() ?? null, createdAt: i.createdAt.toISOString() }))} />;
}
