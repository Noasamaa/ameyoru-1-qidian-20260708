import { and, desc, eq, gt, or } from "drizzle-orm";
import { db } from "@/db";
import { order, customer } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { playerSummary } from "@/server/stats";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { formatYuan } from "@/lib/format";
import { PayoutsList } from "./payouts-list";

export default async function PayoutsPage() {
  const { user: me } = await requireSession({ role: "PLAYER" });

  const [month, rows] = await Promise.all([
    playerSummary(me.id, "month"),
    db
      .select({
        id: order.id,
        startAt: order.startAt,
        customerName: customer.name,
        durationMin: order.durationMin,
        playerEarnCents: order.playerEarnCents,
        playerCompensationCents: order.playerCompensationCents,
        orderStatus: order.orderStatus,
        settleStatus: order.settleStatus,
        paidMethod: order.paidMethod,
        settledAt: order.settledAt,
      })
      .from(order)
      .innerJoin(customer, eq(customer.id, order.customerId))
      .where(
        and(
          eq(order.playerId, me.id),
          or(
            eq(order.orderStatus, "COMPLETED"),
            and(
              eq(order.orderStatus, "CANCELED"),
              gt(order.playerCompensationCents, 0)
            )
          )
        )
      )
      .orderBy(desc(order.startAt))
      .limit(300),
  ]);

  const settledThisMonth = month.playerEarnCents - month.pendingEarnCents;

  return (
    <>
      <PageHeader
        title="打款明细"
        description="已完成订单 + 取消有补偿的单"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="本月已打款"
          value={formatYuan(Math.max(settledThisMonth, 0))}
          hint={`本月共 ${month.orderCount} 单`}
        />
        <KpiCard
          label="本月待打款"
          value={formatYuan(month.pendingEarnCents)}
          emphasis
        />
        <KpiCard
          label="本月应得合计"
          value={formatYuan(month.playerEarnCents)}
        />
      </div>

      <div className="mt-6">
        <PayoutsList
          orders={rows.map((r) => ({
            ...r,
            startAt: r.startAt.toISOString(),
            settledAt: r.settledAt?.toISOString() ?? null,
          }))}
        />
      </div>
    </>
  );
}
