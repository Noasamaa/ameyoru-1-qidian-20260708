import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { PlayersClient } from "./players-client";

export default async function PlayersPage() {
  const { user: me } = await requireSession({ role: ["BOSS", "STAFF"] });

  const players = await db
    .select({
      id: user.id,
      username: user.username,
      displayName: user.name,
      active: user.active,
      playerGender: user.playerGender,
      defaultRateCents: user.defaultRateCents,
      mustChangePwd: user.mustChangePwd,
      wechatQrPath: user.wechatQrPath,
      alipayQrPath: user.alipayQrPath,
      qrSecurityCodeHash: user.qrSecurityCodeHash,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.role, "PLAYER"))
    .orderBy(desc(user.createdAt));

  return (
    <>
      <PageHeader
        title="陪玩"
        description={
          me.role === "BOSS" || me.role === "STAFF"
            ? "管理陪玩账号 · 创建后生成一次性初始密码"
            : "陪玩列表(查看权限)"
        }
      />
      <PlayersClient
        canManage={me.role === "BOSS" || me.role === "STAFF"}
        players={players.map((p) => ({
          id: p.id,
          username: p.username ?? "",
          displayName: p.displayName,
          active: p.active,
          playerGender: p.playerGender,
          defaultRateCents: p.defaultRateCents,
          mustChangePwd: p.mustChangePwd,
          wechatQrPath: p.wechatQrPath,
          alipayQrPath: p.alipayQrPath,
          hasQrSecurityCode: !!p.qrSecurityCodeHash,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
