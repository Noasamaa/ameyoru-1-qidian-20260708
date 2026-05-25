import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { StaffClient } from "./staff-client";

export default async function StaffPage() {
  await requireSession({ role: ["BOSS", "STAFF"] });

  const staff = await db
    .select({
      id: user.id,
      username: user.username,
      displayName: user.name,
      active: user.active,
      mustChangePwd: user.mustChangePwd,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.role, "STAFF"))
    .orderBy(desc(user.createdAt));

  return (
    <>
      <PageHeader
        title="员工"
        description="管理店长账号 · 店长与店主同权限,可派单、看订单、管理陪玩和员工"
      />
      <StaffClient
        staff={staff.map((s) => ({
          id: s.id,
          username: s.username ?? "",
          displayName: s.displayName,
          active: s.active,
          mustChangePwd: s.mustChangePwd,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
