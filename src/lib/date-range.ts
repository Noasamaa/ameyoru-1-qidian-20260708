/**
 * 本地时区下的"今天/本周/本月"区间。
 * 周一为一周第一天。
 */

export type RangeKey = "today" | "week" | "month";

function startOfDay(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function endOfDay(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(23, 59, 59, 999);
  return nd;
}

function todayRange(now: Date) {
  return { from: startOfDay(now), to: endOfDay(now) };
}

/**
 * 本周区间(周一 00:00:00.000 ~ 周日 23:59:59.999),按本地日历计算。
 * 这是周区间的唯一权威实现 —— 其它模块(如 gifts.ts)应从此处 import,
 * 不要各自再用 getDay() 手算,避免周边界口径漂移。
 */
export function weekRange(now: Date = new Date()) {
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: startOfDay(monday), to: endOfDay(sunday) };
}

/**
 * 本月区间(1 号 00:00:00.000 ~ 月末 23:59:59.999),按本地日历计算。
 * 同 weekRange,为月区间的唯一权威实现。
 */
export function monthRange(now: Date = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: startOfDay(from), to: endOfDay(to) };
}

export function rangeOf(key: RangeKey, now: Date = new Date()) {
  switch (key) {
    case "today":
      return todayRange(now);
    case "week":
      return weekRange(now);
    case "month":
      return monthRange(now);
  }
}

export const rangeLabel: Record<RangeKey, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
};
