import { getMyGiftRecords, getMyUnreadGifts } from "@/server/actions/gifts";
import { requireSession } from "@/lib/auth-helpers";
import { MyGiftsClient } from "./my-gifts-client";

export default async function MyGiftsPage() {
  const { user: me } = await requireSession({ role: "PLAYER" });
  // 只读取未读记录用于弹窗,不在渲染期间写库;
  // 标记已读由客户端在弹窗展示后调用 markGiftsReadAction()
  const [records, unread] = await Promise.all([
    getMyGiftRecords(),
    getMyUnreadGifts(),
  ]);

  return (
    <MyGiftsClient
      myId={me.id}
      records={records.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        settledAt: r.settledAt ? r.settledAt.toISOString() : null,
      }))}
      unread={unread}
    />
  );
}
