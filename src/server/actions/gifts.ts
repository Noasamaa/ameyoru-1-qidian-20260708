"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { giftRecord, user, GIFT_TIER_CENTS } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { rangeOf } from "@/lib/date-range";
import { DEFAULT_GIFT_FEE_RATE_BP, GIFT_TIER_LABELS } from "@/lib/constants";
import { nanoid } from "../id";
import { logAudit } from "@/server/audit";

const GIFT_TIER_SET = new Set<number>(GIFT_TIER_CENTS);

const upsertSchema = z.object({
  id: z.string().optional(),
  playerId: z.string().min(1, "请选择陪玩"),
  giftTierCents: z
    .number()
    .int()
    .refine((v) => GIFT_TIER_SET.has(v), "档位不合法"),
  quantity: z.number().int().min(1).max(999),
  senderNickname: z.string().trim().min(1, "请填写打赏人昵称").max(100),
  note: z.string().max(500).optional().nullable(),
});

export type UpsertGiftRecordInput = z.input<typeof upsertSchema>;

const listFilterSchema = z.object({
  playerId: z.string().optional(),
  giftTierCents: z.number().int().optional(),
  settleStatus: z.enum(["UNSETTLED", "SETTLED"]).optional(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

export type ListGiftRecordFilter = z.input<typeof listFilterSchema>;

function computeSplit(totalCents: number, feeRateBp: number) {
  const platformFee = Math.round((totalCents * feeRateBp) / 10000);
  const playerEarn = totalCents - platformFee;
  return { platformFee, playerEarn };
}

function invalidate() {
  revalidatePath("/gifts");
  revalidatePath("/my-gifts");
  revalidatePath("/leaderboard");
  // 路由组 (authed) 会被从 URL 中剥离,必须用真实的根布局路径才能刷新导航徽标
  revalidatePath("/", "layout");
}

/**
 * 新增/编辑礼物报单。
 * 权限:
 *   - BOSS/STAFF: 可为任意陪玩创建,可改任意条记录
 *   - PLAYER: 只能为自己创建,只能改自己提交的且 UNSETTLED 的记录
 */
export async function upsertGiftRecordAction(input: UpsertGiftRecordInput) {
  const { user: me } = await requireSession();
  const isManager = me.role === "BOSS" || me.role === "STAFF" || me.role === "SERVICE";
  if (!isManager && me.role !== "PLAYER") {
    return { ok: false as const, error: "无权限" };
  }

  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "参数错误" };
  }
  const d = parsed.data;

  if (me.role === "PLAYER" && d.playerId !== me.id) {
    return { ok: false as const, error: "陪玩只能给自己报单" };
  }

  const [player] = await db
    .select({ id: user.id, role: user.role, active: user.active, name: user.name })
    .from(user)
    .where(eq(user.id, d.playerId))
    .limit(1);
  if (!player || player.role !== "PLAYER") {
    return { ok: false as const, error: "陪玩不存在" };
  }

  const totalCents = d.giftTierCents * d.quantity;
  const feeRateBp = DEFAULT_GIFT_FEE_RATE_BP;
  const { platformFee, playerEarn } = computeSplit(totalCents, feeRateBp);

  const tierLabel = GIFT_TIER_LABELS[d.giftTierCents] ?? String(d.giftTierCents / 100);

  if (d.id) {
    const [existing] = await db
      .select({
        id: giftRecord.id,
        playerId: giftRecord.playerId,
        feeRateBp: giftRecord.feeRateBp,
        settleStatus: giftRecord.settleStatus,
        submitterId: giftRecord.submitterId,
      })
      .from(giftRecord)
      .where(eq(giftRecord.id, d.id))
      .limit(1);
    if (!existing) return { ok: false as const, error: "记录不存在" };

    if (me.role === "PLAYER") {
      if (existing.submitterId !== me.id) {
        return { ok: false as const, error: "只能编辑自己提交的报单" };
      }
    }
    // 已支付的报单不能修改(管理员也不行),与订单一致:需先撤销支付再改
    if (existing.settleStatus === "SETTLED") {
      return { ok: false as const, error: "已支付的报单不能修改,请先撤销支付" };
    }

    const { platformFee: pf2, playerEarn: pe2 } = computeSplit(totalCents, existing.feeRateBp);
    await db
      .update(giftRecord)
      .set({
        playerId: d.playerId,
        giftTierCents: d.giftTierCents,
        quantity: d.quantity,
        totalCents,
        platformFeeCents: pf2,
        playerEarnCents: pe2,
        senderNickname: d.senderNickname,
        note: d.note?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(giftRecord.id, d.id));

    logAudit({
      actorId: me.id,
      actorName: me.name,
      action: "UPDATE_GIFT_RECORD",
      targetType: "gift_record",
      targetId: d.id,
      detail: {
        playerName: player.name,
        tier: tierLabel,
        quantity: d.quantity,
        sender: d.senderNickname,
      },
    });
  } else {
    const id = nanoid();
    await db.insert(giftRecord).values({
      id,
      playerId: d.playerId,
      giftTierCents: d.giftTierCents,
      quantity: d.quantity,
      totalCents,
      feeRateBp,
      platformFeeCents: platformFee,
      playerEarnCents: playerEarn,
      senderNickname: d.senderNickname,
      note: d.note?.trim() || null,
      operatorId: me.id,
      submitterId: me.id,
      settleStatus: "UNSETTLED",
    });
    logAudit({
      actorId: me.id,
      actorName: me.name,
      action: me.role === "PLAYER" ? "CREATE_GIFT_REPORT" : "CREATE_GIFT_RECORD",
      targetType: "gift_record",
      targetId: id,
      detail: {
        playerName: player.name,
        tier: tierLabel,
        quantity: d.quantity,
        sender: d.senderNickname,
      },
    });
  }

  invalidate();
  return { ok: true as const };
}

export async function deleteGiftRecordAction(input: { id: string }) {
  const { user: me } = await requireSession();
  const isManager = me.role === "BOSS" || me.role === "STAFF" || me.role === "SERVICE";
  if (!isManager && me.role !== "PLAYER") {
    return { ok: false as const, error: "无权限" };
  }

  const [existing] = await db
    .select({
      id: giftRecord.id,
      playerId: giftRecord.playerId,
      giftTierCents: giftRecord.giftTierCents,
      quantity: giftRecord.quantity,
      senderNickname: giftRecord.senderNickname,
      settleStatus: giftRecord.settleStatus,
      submitterId: giftRecord.submitterId,
    })
    .from(giftRecord)
    .where(eq(giftRecord.id, input.id))
    .limit(1);
  if (!existing) return { ok: false as const, error: "记录不存在" };

  if (me.role === "PLAYER") {
    if (existing.submitterId !== me.id) {
      return { ok: false as const, error: "只能删除自己提交的报单" };
    }
    if (existing.settleStatus === "SETTLED") {
      return { ok: false as const, error: "已支付的报单不能删除" };
    }
  }

  await db.delete(giftRecord).where(eq(giftRecord.id, input.id));
  logAudit({
    actorId: me.id,
    actorName: me.name,
    action: "DELETE_GIFT_RECORD",
    targetType: "gift_record",
    targetId: input.id,
    detail: {
      tier: GIFT_TIER_LABELS[existing.giftTierCents] ?? String(existing.giftTierCents / 100),
      quantity: existing.quantity,
      sender: existing.senderNickname,
    },
  });
  invalidate();
  return { ok: true as const };
}

/** 后台:标记礼物报单为已支付 */
export async function settleGiftAction(input: {
  id: string;
  paidMethod?: "WECHAT" | "ALIPAY";
}) {
  const { user: me } = await requireSession({ role: ["BOSS", "STAFF"] });
  const [target] = await db
    .select({
      id: giftRecord.id,
      settleStatus: giftRecord.settleStatus,
      playerId: giftRecord.playerId,
      playerEarnCents: giftRecord.playerEarnCents,
    })
    .from(giftRecord)
    .where(eq(giftRecord.id, input.id))
    .limit(1);
  if (!target) return { ok: false as const, error: "记录不存在" };
  if (target.settleStatus === "SETTLED") {
    return { ok: false as const, error: "已支付,请勿重复操作" };
  }

  await db
    .update(giftRecord)
    .set({
      settleStatus: "SETTLED",
      settledAt: new Date(),
      paidMethod: input.paidMethod ?? null,
      updatedAt: new Date(),
    })
    .where(eq(giftRecord.id, input.id));

  // 支付即"收到打赏",只在支付成功后重置已读标记,触发红点/弹窗。
  await db
    .update(user)
    .set({ lastGiftSeenAt: null })
    .where(eq(user.id, target.playerId));

  logAudit({
    actorId: me.id,
    actorName: me.name,
    action: "SETTLE_GIFT",
    targetType: "gift_record",
    targetId: input.id,
    detail: { amount: target.playerEarnCents, paidMethod: input.paidMethod },
  });

  invalidate();
  return { ok: true as const };
}

export async function unsettleGiftAction(input: { id: string }) {
  const { user: me } = await requireSession({ role: ["BOSS", "STAFF"] });
  const [target] = await db
    .select({ id: giftRecord.id, settleStatus: giftRecord.settleStatus })
    .from(giftRecord)
    .where(eq(giftRecord.id, input.id))
    .limit(1);
  if (!target) return { ok: false as const, error: "记录不存在" };
  if (target.settleStatus !== "SETTLED") {
    return { ok: false as const, error: "该报单未支付,无需撤销" };
  }
  await db
    .update(giftRecord)
    .set({
      settleStatus: "UNSETTLED",
      settledAt: null,
      paidMethod: null,
      updatedAt: new Date(),
    })
    .where(eq(giftRecord.id, input.id));
  logAudit({
    actorId: me.id,
    actorName: me.name,
    action: "UNSETTLE_GIFT",
    targetType: "gift_record",
    targetId: input.id,
  });
  invalidate();
  return { ok: true as const };
}

export async function listGiftRecords(filter: ListGiftRecordFilter) {
  await requireSession({ role: ["BOSS", "STAFF", "SERVICE"] });
  const f = listFilterSchema.parse(filter);

  const conds = [];
  if (f.playerId) conds.push(eq(giftRecord.playerId, f.playerId));
  if (f.giftTierCents) conds.push(eq(giftRecord.giftTierCents, f.giftTierCents));
  if (f.settleStatus) conds.push(eq(giftRecord.settleStatus, f.settleStatus));
  if (f.startAt) conds.push(gte(giftRecord.createdAt, new Date(f.startAt)));
  if (f.endAt) conds.push(lte(giftRecord.createdAt, new Date(f.endAt)));
  const where = conds.length > 0 ? and(...conds) : undefined;

  const offset = (f.page - 1) * f.pageSize;

  const [rows, totalRow, pendingCountRow] = await Promise.all([
    db
      .select({
        id: giftRecord.id,
        playerId: giftRecord.playerId,
        playerName: user.name,
        playerWechatQrPath: user.wechatQrPath,
        playerAlipayQrPath: user.alipayQrPath,
        giftTierCents: giftRecord.giftTierCents,
        quantity: giftRecord.quantity,
        totalCents: giftRecord.totalCents,
        feeRateBp: giftRecord.feeRateBp,
        platformFeeCents: giftRecord.platformFeeCents,
        playerEarnCents: giftRecord.playerEarnCents,
        senderNickname: giftRecord.senderNickname,
        note: giftRecord.note,
        operatorId: giftRecord.operatorId,
        submitterId: giftRecord.submitterId,
        settleStatus: giftRecord.settleStatus,
        settledAt: giftRecord.settledAt,
        paidMethod: giftRecord.paidMethod,
        createdAt: giftRecord.createdAt,
      })
      .from(giftRecord)
      .innerJoin(user, eq(user.id, giftRecord.playerId))
      .where(where)
      .orderBy(desc(giftRecord.createdAt))
      .limit(f.pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(giftRecord)
      .where(where),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(giftRecord)
      .where(eq(giftRecord.settleStatus, "UNSETTLED")),
  ]);

  const idsToLookup = Array.from(
    new Set(rows.flatMap((r) => [r.operatorId, r.submitterId]))
  );
  const operators =
    idsToLookup.length > 0
      ? await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(inArray(user.id, idsToLookup))
      : [];
  const nameMap = new Map(operators.map((o) => [o.id, o.name]));

  return {
    rows: rows.map((r) => ({
      ...r,
      operatorName: nameMap.get(r.operatorId) ?? "(已删除)",
      submitterName: nameMap.get(r.submitterId) ?? "(已删除)",
    })),
    total: totalRow[0]?.count ?? 0,
    pendingCount: pendingCountRow[0]?.count ?? 0,
    page: f.page,
    pageSize: f.pageSize,
  };
}

export async function listPlayersForGift() {
  await requireSession({ role: ["BOSS", "STAFF", "SERVICE"] });
  return db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      active: user.active,
    })
    .from(user)
    .where(eq(user.role, "PLAYER"))
    .orderBy(desc(user.active), user.name);
}

/* ----------------------------- 陪玩端 ----------------------------- */

export async function getMyGiftRecords() {
  const { user: me } = await requireSession({ role: "PLAYER" });
  const rows = await db
    .select({
      id: giftRecord.id,
      giftTierCents: giftRecord.giftTierCents,
      quantity: giftRecord.quantity,
      totalCents: giftRecord.totalCents,
      platformFeeCents: giftRecord.platformFeeCents,
      playerEarnCents: giftRecord.playerEarnCents,
      senderNickname: giftRecord.senderNickname,
      note: giftRecord.note,
      settleStatus: giftRecord.settleStatus,
      settledAt: giftRecord.settledAt,
      paidMethod: giftRecord.paidMethod,
      submitterId: giftRecord.submitterId,
      createdAt: giftRecord.createdAt,
    })
    .from(giftRecord)
    .where(eq(giftRecord.playerId, me.id))
    .orderBy(desc(giftRecord.createdAt))
    .limit(500);
  return rows;
}

/** 陪玩:未读数(只算 SETTLED) */
export async function getMyUnreadGiftCount() {
  const { user: me } = await requireSession();
  if (me.role !== "PLAYER") return { count: 0, since: null as string | null };

  const [u] = await db
    .select({ lastGiftSeenAt: user.lastGiftSeenAt })
    .from(user)
    .where(eq(user.id, me.id))
    .limit(1);
  const since = u?.lastGiftSeenAt ?? null;

  // 未读 = 已支付,且"支付时间"晚于上次查看标记。
  // 必须比对 settledAt(而非 createdAt):报单先创建、后支付,createdAt 不变,
  // 否则 create→settle 的正常流程永远算不出未读。
  const baseConds = [
    eq(giftRecord.playerId, me.id),
    eq(giftRecord.settleStatus, "SETTLED"),
  ];
  if (since) baseConds.push(gt(giftRecord.settledAt, since));
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(giftRecord)
    .where(and(...baseConds));
  return {
    count: row?.count ?? 0,
    since: since ? since.toISOString() : null,
  };
}

/**
 * 陪玩:读取未读(已支付)礼物用于弹窗。**只读,不写**——
 * 不能在 Server Component 渲染期间写库。标记已读由 {@link markGiftsReadAction}
 * 在客户端弹窗展示后单独触发。
 */
export async function getMyUnreadGifts() {
  const { user: me } = await requireSession({ role: "PLAYER" });
  const [u] = await db
    .select({ lastGiftSeenAt: user.lastGiftSeenAt })
    .from(user)
    .where(eq(user.id, me.id))
    .limit(1);
  const since = u?.lastGiftSeenAt ?? null;

  const baseConds = [
    eq(giftRecord.playerId, me.id),
    eq(giftRecord.settleStatus, "SETTLED"),
  ];
  // 比对 settledAt(支付时间),与 getMyUnreadGiftCount / 徽标保持一致
  if (since) baseConds.push(gt(giftRecord.settledAt, since));
  const rows = await db
    .select({
      id: giftRecord.id,
      giftTierCents: giftRecord.giftTierCents,
      quantity: giftRecord.quantity,
      totalCents: giftRecord.totalCents,
      platformFeeCents: giftRecord.platformFeeCents,
      playerEarnCents: giftRecord.playerEarnCents,
      senderNickname: giftRecord.senderNickname,
      createdAt: giftRecord.createdAt,
    })
    .from(giftRecord)
    .where(and(...baseConds))
    .orderBy(desc(giftRecord.settledAt))
    .limit(20);

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * 陪玩:把"礼物收入"标记为已读(推进 lastGiftSeenAt 到当前时间),并刷新导航徽标。
 * 由客户端在弹窗展示/关闭后调用,避免在渲染期间写库。
 * 幂等:重复调用只是把标记继续前推,React StrictMode 双调用安全。
 */
export async function markGiftsReadAction() {
  const { user: me } = await requireSession({ role: "PLAYER" });
  await db
    .update(user)
    .set({ lastGiftSeenAt: new Date() })
    .where(eq(user.id, me.id));
  // 推进已读标记后,刷新根布局以清掉「礼物收入」未读徽标
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/* ----------------------------- 排行榜 ----------------------------- */

const rangeSchema = z.enum(["today", "week", "month", "all"]).default("all");

/**
 * 礼物打赏排行榜:只统计已支付的记录,展示"谁打赏谁"。
 *
 * 隐私:陪玩(PLAYER)只能看到受宠陪玩榜里自己的具体金额,
 * 其他陪玩的金额被清零(对照接单排行榜对非管理者的处理);
 * 打赏大佬榜(暴露打赏人昵称)与"谁打赏谁"配对图(完整的打赏关系网)
 * 仅对 BOSS/STAFF 开放,对陪玩返回空数组。
 */
export async function giftLeaderboard(range: "today" | "week" | "month" | "all" = "all") {
  const { user: me } = await requireSession();
  const isManager = me.role === "BOSS" || me.role === "STAFF" || me.role === "SERVICE";
  const r = rangeSchema.parse(range);

  const baseConds = [eq(giftRecord.settleStatus, "SETTLED")];
  if (r !== "all") {
    const { from, to } = rangeOf(r);
    baseConds.push(gte(giftRecord.createdAt, from), lte(giftRecord.createdAt, to));
  }
  const where = and(...baseConds);

  // 打赏大佬榜与配对图会泄露打赏人昵称及完整打赏关系,仅管理者可见
  const senderRows = isManager
    ? await db
        .select({
          senderNickname: giftRecord.senderNickname,
          totalCents: sql<number>`SUM(${giftRecord.totalCents})`.mapWith(Number),
          giftCount: sql<number>`COUNT(*)`.mapWith(Number),
          quantitySum: sql<number>`SUM(${giftRecord.quantity})`.mapWith(Number),
        })
        .from(giftRecord)
        .where(where)
        .groupBy(giftRecord.senderNickname)
        .orderBy(sql`SUM(${giftRecord.totalCents}) DESC`)
        .limit(50)
    : [];

  const playerRows = await db
    .select({
      playerId: giftRecord.playerId,
      playerName: user.name,
      totalCents: sql<number>`SUM(${giftRecord.totalCents})`.mapWith(Number),
      earnCents: sql<number>`SUM(${giftRecord.playerEarnCents})`.mapWith(Number),
      giftCount: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(giftRecord)
    .innerJoin(user, eq(user.id, giftRecord.playerId))
    .where(where)
    .groupBy(giftRecord.playerId, user.name)
    .orderBy(sql`SUM(${giftRecord.totalCents}) DESC`)
    .limit(50);

  // 陪玩:保留完整排名以便计算名次,但把别人的金额清零(只看自己的到手/总额)
  const players = isManager
    ? playerRows
    : playerRows.map((p) =>
        p.playerId === me.id
          ? p
          : { ...p, totalCents: 0, earnCents: 0 }
      );

  const pairRows = isManager
    ? await db
        .select({
          senderNickname: giftRecord.senderNickname,
          playerId: giftRecord.playerId,
          playerName: user.name,
          totalCents: sql<number>`SUM(${giftRecord.totalCents})`.mapWith(Number),
          giftCount: sql<number>`COUNT(*)`.mapWith(Number),
        })
        .from(giftRecord)
        .innerJoin(user, eq(user.id, giftRecord.playerId))
        .where(where)
        .groupBy(giftRecord.senderNickname, giftRecord.playerId, user.name)
        .orderBy(sql`SUM(${giftRecord.totalCents}) DESC`)
        .limit(100)
    : [];

  return { senders: senderRows, players, pairs: pairRows, isManager };
}
