/**
 * `npm run test:calc`
 * 验证三段定价 + plan 里两个样例 + 跨零点。
 */
import { computeOrder } from "../src/lib/calc";

function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    console.error(`✗ ${label}: 期望 ${expected},实际 ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${label}: ${actual}`);
  }
}

console.log("\n样例 1: 40 元/h × 10:29-12:49 (140 分钟,无优惠)");
{
  const r = computeOrder({
    startAt: new Date(2026, 4, 25, 10, 29),
    endAt: new Date(2026, 4, 25, 12, 49),
    hourlyRateCents: 4000,
  });
  eq(r.durationMin, 140, "时长 140 分钟");
  eq(r.originalCents, 9333, "原价 ¥93.33");
  eq(r.discountCents, 0, "优惠 ¥0");
  eq(r.payableCents, 9333, "实付 ¥93.33");
  eq(r.commissionCents, 1167, "抽成 ¥11.67");
  eq(r.playerEarnCents, 8166, "陪玩应得 ¥81.66");
  eq(r.shopProfitCents, 1167, "店铺毛利 ¥11.67(无优惠时 = 抽成)");
}

console.log("\n样例 2: 45 元/h × 1:09 (69 分钟,无优惠)");
{
  const r = computeOrder({
    startAt: new Date(2026, 4, 25, 14, 0),
    endAt: new Date(2026, 4, 25, 15, 9),
    hourlyRateCents: 4500,
  });
  eq(r.durationMin, 69, "时长 69 分钟");
  eq(r.originalCents, 5175, "原价 ¥51.75");
  eq(r.payableCents, 5175, "实付 ¥51.75");
  eq(r.commissionCents, 575, "抽成 ¥5.75");
  eq(r.playerEarnCents, 4600, "陪玩应得 ¥46.00");
}

console.log("\n样例 3: 开业 8 折 — 40 元/h × 2h,优惠 16 元(=20% of 80)");
{
  const r = computeOrder({
    startAt: new Date(2026, 4, 25, 10, 0),
    endAt: new Date(2026, 4, 25, 12, 0),
    hourlyRateCents: 4000,
    discountCents: 1600,
  });
  eq(r.originalCents, 8000, "原价 ¥80.00");
  eq(r.discountCents, 1600, "优惠 ¥16.00");
  eq(r.payableCents, 6400, "实付 ¥64.00");
  eq(r.commissionCents, 1000, "抽成 ¥10.00");
  eq(r.playerEarnCents, 7000, "陪玩应得 ¥70.00(按原价 80 - 抽成 10)");
  eq(r.shopProfitCents, -600, "店铺毛利 -¥6.00(亏 6 块,= 抽成 10 - 优惠 16)");
}

console.log("\n边界: 跨零点 23:30 → 01:15");
{
  const r = computeOrder({
    startAt: new Date(2026, 4, 25, 23, 30),
    endAt: new Date(2026, 4, 25, 1, 15),
    hourlyRateCents: 4000,
  });
  eq(r.durationMin, 105, "跨零点时长 105 分钟");
}

console.log(process.exitCode ? "\n✗ 失败" : "\n✓ 全部通过");
