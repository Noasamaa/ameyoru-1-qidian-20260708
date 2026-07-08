/**
 * 企业微信群机器人推送。
 * 在 .env 配 WECOM_WEBHOOK_URL 后才生效;未配置则直接跳过。
 * 推送失败只 console.error,不抛错(不影响主业务流程)。
 *
 * 文档:https://developer.work.weixin.qq.com/document/path/91770
 *
 * 注意:在 Serverless 环境下,response 返回后 lambda 可能立即冻结,
 * 导致 fire-and-forget 的 fetch 还没发出去。当前定位是自建部署,无此问题。
 */

import { formatDuration, formatYuan } from "./format";
import type { CancelFault } from "@/db/schema";

const faultLabel: Record<CancelFault, string> = {
  PLAYER: "陪玩责任",
  CUSTOMER: "客户责任",
  SHOP: "店里责任",
  OTHER: "其他",
};

function webhookUrl(): string | null {
  const u = process.env.WECOM_WEBHOOK_URL?.trim();
  return u && u.startsWith("http") ? u : null;
}

/**
 * 转义用户可控字段(客户名 / 派单人 / 操作人),
 * 防止把 markdown 控制字符或换行注入到推送正文里(消息注入)。
 * - 换行 / 回车 / 制表符 → 空格(防止伪造新的 > 引用行)
 * - markdown / html 控制字符 → 加反斜杠转义
 */
function escMd(s: string): string {
  return String(s ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\\`*_#>~\[\]()<&]/g, "\\$&")
    .trim();
}

async function pushMarkdown(content: string): Promise<void> {
  const url = webhookUrl();
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.error("[wecom] push failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("[wecom] push error:", e);
  }
}

const payMethodLabel = { WECHAT: "微信", ALIPAY: "支付宝" } as const;

export function notifyOrderCreated(opts: {
  dispatcherName: string;
  customerName: string;
  durationMin: number;
  payableCents: number;
  discountCents: number;
  isSelfReport: boolean;
}): void {
  const verb = opts.isSelfReport ? "报单" : "派单";
  const discountLine =
    opts.discountCents > 0
      ? `\n> 优惠:<font color="warning">${formatYuan(opts.discountCents)}</font>`
      : "";
  void pushMarkdown(
    `**【新${verb}】${escMd(opts.dispatcherName)}**
> 客户:${escMd(opts.customerName)}
> 时长:${formatDuration(opts.durationMin)}
> 实付:<font color="info">${formatYuan(opts.payableCents)}</font>${discountLine}`
  );
}

export function notifyOrderCompleted(opts: {
  actorName: string;
  payableCents: number;
  playerEarnCents: number;
}): void {
  void pushMarkdown(
    `**【订单完成】${escMd(opts.actorName)}**
> 实付:${formatYuan(opts.payableCents)}
> 陪玩应得:<font color="info">${formatYuan(opts.playerEarnCents)}</font>(待结算)`
  );
}

export function notifyOrderSettled(opts: {
  actorName: string;
  playerEarnCents: number;
  paidMethod?: "WECHAT" | "ALIPAY";
}): void {
  const method = opts.paidMethod ? payMethodLabel[opts.paidMethod] : "线下";
  void pushMarkdown(
    `**【已打款】${escMd(opts.actorName)}**
> 方式:${method}
> 金额:<font color="info">${formatYuan(opts.playerEarnCents)}</font>`
  );
}

export function notifyOrderCanceled(opts: {
  actorName: string;
  customerName: string;
  fault: CancelFault;
  compensationCents: number;
}): void {
  const compLine =
    opts.compensationCents > 0
      ? `\n> 陪玩补偿:<font color="warning">${formatYuan(opts.compensationCents)}</font>(待结算)`
      : "";
  void pushMarkdown(
    `**【订单取消】${escMd(opts.actorName)}**
> 客户:${escMd(opts.customerName)}
> 责任方:${faultLabel[opts.fault]}${compLine}`
  );
}
