import Link from "next/link";
import { desc, eq, aliasedTable, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { order, user, customer } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { OrdersList } from "./orders-list";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { user: me } = await requireSession();
  const { id: initialOpenId } = await searchParams;
  const isManager = me.role === "BOSS" || me.role === "STAFF";

  const dispatcherUser = aliasedTable(user, "dispatcher");

  const rows = await db
    .select({
      id: order.id,
      playerId: order.playerId,
      playerName: user.name,
      // 陪玩自己看不到自己订单里的码(去 profile 看),只在管理者端显示
      playerWechatQrPath: isManager
        ? user.wechatQrPath
        : sql<string | null>`NULL`.as("player_wechat_qr"),
      playerAlipayQrPath: isManager
        ? user.alipayQrPath
        : sql<string | null>`NULL`.as("player_alipay_qr"),
      dispatcherId: order.dispatcherId,
      dispatcherName: dispatcherUser.name,
      customerName: customer.name,
      customerMemberNo: customer.memberNo,
      customerWechat: isManager
        ? customer.wechat
        : sql<string | null>`NULL`.as("customer_wechat"),
      startAt: order.startAt,
      durationMin: order.durationMin,
      hourlyRateCents: order.hourlyRateCents,
      originalCents: order.originalCents,
      discountCents: order.discountCents,
      payableCents: order.payableCents,
      prepayUsedCents: order.prepayUsedCents,
      commissionCents: order.commissionCents,
      playerEarnCents: order.playerEarnCents,
      orderStatus: order.orderStatus,
      settleStatus: order.settleStatus,
      completedAt: order.completedAt,
      canceledAt: order.canceledAt,
      settledAt: order.settledAt,
      paidMethod: order.paidMethod,
      note: order.note,
      cancelFault: order.cancelFault,
      cancelNote: order.cancelNote,
      playerCompensationCents: order.playerCompensationCents,
    })
    .from(order)
    .innerJoin(user, eq(user.id, order.playerId))
    .innerJoin(dispatcherUser, eq(dispatcherUser.id, order.dispatcherId))
    .innerJoin(customer, eq(customer.id, order.customerId))
    .where(me.role === "PLAYER" ? eq(order.playerId, me.id) : undefined)
    .orderBy(desc(order.startAt))
    .limit(300);

  return (
    <>
      <PageHeader
        title={me.role === "PLAYER" ? "我的订单" : "订单"}
        action={
          <Button asChild>
            <Link href="/orders/new">
              <Plus /> {isManager ? "派单" : "报单"}
            </Link>
          </Button>
        }
      />
      <OrdersList
        role={me.role}
        myId={me.id}
        initialOpenId={initialOpenId ?? null}
        orders={rows.map((r) => ({
          ...r,
          startAt: r.startAt.toISOString(),
          completedAt: r.completedAt?.toISOString() ?? null,
          canceledAt: r.canceledAt?.toISOString() ?? null,
          settledAt: r.settledAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
