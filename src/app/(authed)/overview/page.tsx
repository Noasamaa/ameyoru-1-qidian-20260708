import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  order as orderTable,
  customer as customerTable,
  user as userTable,
} from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { ManagerOverview } from "./manager-overview";
import { PlayerOverview } from "./player-overview";

export default async function OverviewPage() {
  const { user } = await requireSession();
  if (user.role === "PLAYER") {
    const [[profile], [activeOrder]] = await Promise.all([
      db
        .select({ defaultRateCents: userTable.defaultRateCents })
        .from(userTable)
        .where(eq(userTable.id, user.id))
        .limit(1),
      db
        .select({
          id: orderTable.id,
          startAt: orderTable.startAt,
          hourlyRateCents: orderTable.hourlyRateCents,
          customerName: customerTable.name,
        })
        .from(orderTable)
        .innerJoin(
          customerTable,
          eq(customerTable.id, orderTable.customerId)
        )
        .where(
          and(
            eq(orderTable.playerId, user.id),
            eq(orderTable.orderStatus, "IN_PROGRESS")
          )
        )
        .orderBy(desc(orderTable.startAt))
        .limit(1),
    ]);
    return (
      <PlayerOverview
        userId={user.id}
        userName={user.name}
        defaultRateCents={profile?.defaultRateCents ?? null}
        activeOrder={
          activeOrder
            ? {
                id: activeOrder.id,
                startAt: activeOrder.startAt.toISOString(),
                hourlyRateCents: activeOrder.hourlyRateCents,
                customerName: activeOrder.customerName,
              }
            : null
        }
      />
    );
  }
  return <ManagerOverview userName={user.name} />;
}
