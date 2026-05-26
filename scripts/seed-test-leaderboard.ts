/**
 * 测试用:批量生成 10 个陪玩 + 每人随机数量已完成订单,用于本周排行榜真实数据测试。
 * 跑 `tsx scripts/seed-test-leaderboard.ts` 即可。重复跑不会重复创建(按用户名 dedupe)。
 *
 * 清理:`tsx scripts/seed-test-leaderboard.ts --clean` 删掉它造的测试数据。
 */
import { config } from "dotenv";
config({ path: ".env" });

import { and, eq, like, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  customer,
  order,
  user,
  type PlayerGender,
} from "../src/db/schema";
import { computeOrder } from "../src/lib/calc";
import { nanoid, generateMemberNo } from "../src/server/id";
import { DEFAULT_COMMISSION_PER_HOUR_CENTS } from "../src/lib/constants";
import { INTERNAL_EMAIL_DOMAIN } from "../src/lib/constants";

const TEST_PREFIX = "ldtest_";
const TEST_CUSTOMER_NAME = "排行榜测试客户";

const HAND_PICKED_PLAYERS: { username: string; name: string; gender: PlayerGender; rate: number }[] = [
  { username: "ldtest_aliya", name: "阿莉雅", gender: "FEMALE", rate: 4500 },
  { username: "ldtest_xiaoyu", name: "小雨", gender: "FEMALE", rate: 4000 },
  { username: "ldtest_yueying", name: "月影", gender: "FEMALE", rate: 5500 },
  { username: "ldtest_jingjing", name: "晶晶", gender: "FEMALE", rate: 4000 },
  { username: "ldtest_xinxin", name: "心心", gender: "FEMALE", rate: 5000 },
  { username: "ldtest_dali", name: "大力", gender: "MALE", rate: 4500 },
  { username: "ldtest_xiaolin", name: "小林", gender: "MALE", rate: 3500 },
  { username: "ldtest_aze", name: "阿泽", gender: "MALE", rate: 5000 },
  { username: "ldtest_qingshan", name: "青山", gender: "MALE", rate: 4000 },
  { username: "ldtest_baihu", name: "白虎", gender: "MALE", rate: 4500 },
];

const NAME_POOL_FEMALE = "雅雪兰梅竹菊月星玉珠瑶琪琴枫雨晴雪兰梦曦颖韵筱芸薇茜蕾莉婷瑶诺琳露蕊霜蝶妍娜萱琪琳婉";
const NAME_POOL_MALE = "强威炎山林海风雷岩松涛烈轩宇昊辰皓辉哲泽锐凯峰晨枫策铭睿翼麟翰宸彦昕逸杰彪刚毅锐冲";
const RATES_FEMALE = [4000, 4500, 5000, 5500];
const RATES_MALE = [3500, 4000, 4500, 5000];

function makeAutoPlayer(index: number) {
  const gender: PlayerGender = index % 2 === 0 ? "FEMALE" : "MALE";
  const pool = gender === "FEMALE" ? NAME_POOL_FEMALE : NAME_POOL_MALE;
  // 双字名,从对应性别字池里挑两个字凑出来,有点像真人花名
  const a = pool[(index * 7) % pool.length];
  const b = pool[(index * 13 + 3) % pool.length];
  const rates = gender === "FEMALE" ? RATES_FEMALE : RATES_MALE;
  return {
    username: `ldtest_auto_${index.toString().padStart(3, "0")}`,
    name: `${a}${b}`,
    gender,
    rate: rates[index % rates.length],
  };
}

async function clean() {
  await db.delete(order).where(like(order.id, "ldtest_%"));
  await db.delete(user).where(like(user.username, `${TEST_PREFIX}%`));
  await db.delete(customer).where(eq(customer.name, TEST_CUSTOMER_NAME));
  console.log("[seed-leaderboard] 已清理测试数据");
}

async function main() {
  if (process.argv.includes("--clean")) {
    await clean();
    return;
  }

  // 可传一个数字参数指定要造多少个测试陪玩,默认 10(手挑的中文名)
  const countArg = process.argv.find((a) => /^\d+$/.test(a));
  const targetCount = countArg ? parseInt(countArg, 10) : HAND_PICKED_PLAYERS.length;
  const testPlayers = [
    ...HAND_PICKED_PLAYERS.slice(0, Math.min(targetCount, HAND_PICKED_PLAYERS.length)),
    ...Array.from(
      { length: Math.max(0, targetCount - HAND_PICKED_PLAYERS.length) },
      (_, i) => makeAutoPlayer(i + HAND_PICKED_PLAYERS.length)
    ),
  ];

  // boss 作为派单人(dispatcher),拿任意一个 BOSS / STAFF 都行
  const dispatcher = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "BOSS"))
    .get();
  if (!dispatcher) {
    console.error("[seed-leaderboard] 找不到 BOSS 账号,请先 npm run db:seed");
    process.exit(1);
  }

  // 创建测试客户(如果不存在)
  let testCustomer = await db
    .select({ id: customer.id })
    .from(customer)
    .where(eq(customer.name, TEST_CUSTOMER_NAME))
    .get();
  if (!testCustomer) {
    const cid = nanoid();
    await db.insert(customer).values({
      id: cid,
      memberNo: generateMemberNo(),
      name: TEST_CUSTOMER_NAME,
    });
    testCustomer = { id: cid };
  }

  // 创建陪玩
  for (const p of testPlayers) {
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, p.username))
      .get();
    if (!existing) {
      await db.insert(user).values({
        id: nanoid(),
        name: p.name,
        email: `${p.username}@${INTERNAL_EMAIL_DOMAIN}`,
        username: p.username,
        role: "PLAYER",
        active: true,
        playerGender: p.gender,
        defaultRateCents: p.rate,
        mustChangePwd: false,
      });
    }
  }

  // 拿回所有测试陪玩
  const players = await db
    .select({
      id: user.id,
      name: user.name,
      defaultRateCents: user.defaultRateCents,
    })
    .from(user)
    .where(
      and(eq(user.role, "PLAYER"), like(user.username, `${TEST_PREFIX}%`))
    )
    .all();

  // 订单分布:覆盖整个"本月"(本月 1 号 00:00 到现在),这样 本周/本月 两种视图都有真实数据。
  // 大规模模式(>= 50 个陪玩)下,每个陪玩的单量上限更高,模拟"千单/月"。
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthWindowMs = now.getTime() - monthStart.getTime();
  const isLarge = players.length >= 50;
  const maxOrdersPerPlayer = isLarge ? 80 : 15; // 大规模平均 ~40,200 人就是 ~8000 单
  let totalCreated = 0;

  console.log(
    `[seed-leaderboard] 模式 ${isLarge ? "大规模" : "小规模"} — 时间窗口 本月 ${monthStart.toISOString().slice(0, 10)} → 现在`
  );

  // 用事务一次性插全部订单,better-sqlite3 的 fsync 只发生一次,显著加速
  db.transaction((tx) => {
    for (const player of players) {
      // 已有本月订单数,避免重复跑暴涨
      const existingThisMonth = tx
        .select({ c: sql<number>`count(*)`.mapWith(Number) })
        .from(order)
        .where(
          and(
            eq(order.playerId, player.id),
            sql`${order.startAt} >= ${Math.floor(monthStart.getTime() / 1000)}`
          )
        )
        .get();
      if ((existingThisMonth?.c ?? 0) > 0) continue;

      const orderCount = Math.floor(Math.random() * (maxOrdersPerPlayer + 1));
      const rateCents = player.defaultRateCents ?? 4000;

      for (let i = 0; i < orderCount; i++) {
        const startAtMs = monthStart.getTime() + Math.random() * monthWindowMs;
        const durationMin = 60 + Math.floor(Math.random() * 180); // 1~4 小时
        const endAtMs = startAtMs + durationMin * 60000;

        const computed = computeOrder({
          startAt: new Date(startAtMs),
          endAt: new Date(endAtMs),
          hourlyRateCents: rateCents,
          discountCents: 0,
          commissionPerHourCents: DEFAULT_COMMISSION_PER_HOUR_CENTS,
        });

        const completedAt = new Date(endAtMs);
        const settled = Math.random() < 0.5;
        tx.insert(order)
          .values({
            id: `ldtest_${nanoid(20)}`,
            dispatcherId: dispatcher.id,
            playerId: player.id,
            customerId: testCustomer.id,
            startAt: new Date(startAtMs),
            endAt: new Date(endAtMs),
            durationMin: computed.durationMin,
            hourlyRateCents: rateCents,
            commissionPerHourCents: DEFAULT_COMMISSION_PER_HOUR_CENTS,
            originalCents: computed.originalCents,
            discountCents: 0,
            payableCents: computed.payableCents,
            prepayUsedCents: 0,
            commissionCents: computed.commissionCents,
            playerEarnCents: computed.playerEarnCents,
            orderStatus: "COMPLETED",
            settleStatus: settled ? "SETTLED" : "UNSETTLED",
            completedAt,
            settledAt: settled ? completedAt : null,
            paidMethod: settled ? (Math.random() < 0.5 ? "WECHAT" : "ALIPAY") : null,
          })
          .run();
        totalCreated++;
      }
      if (!isLarge) console.log(`  ${player.name}: ${orderCount} 单`);
    }
  });

  console.log(
    `\n[seed-leaderboard] 完成 — ${players.length} 个陪玩,${totalCreated} 单本月订单`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
