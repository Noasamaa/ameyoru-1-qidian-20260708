"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Play, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatYuan } from "@/lib/format";
import {
  endQuickOrderAction,
  startQuickOrderAction,
} from "@/server/actions/orders";

interface ActiveOrder {
  id: string;
  startAt: string;
  hourlyRateCents: number;
  customerName: string;
}

export function QuickOrderCard({
  defaultRateCents,
  activeOrder,
}: {
  defaultRateCents: number | null;
  activeOrder: ActiveOrder | null;
}) {
  if (activeOrder) {
    return <ActiveOrderPanel order={activeOrder} />;
  }
  return <StartOrderPanel defaultRateCents={defaultRateCents} />;
}

function StartOrderPanel({
  defaultRateCents,
}: {
  defaultRateCents: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customerName, setCustomerName] = useState("");
  const canStart = !!defaultRateCents && defaultRateCents > 0;

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!canStart) {
      toast.error("请先在「个人设置」里填默认单价");
      return;
    }
    if (!customerName.trim()) {
      toast.error("请填写客户名");
      return;
    }
    startTransition(async () => {
      const res = await startQuickOrderAction({ customerName });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("已开始接单");
      router.refresh();
    });
  }

  return (
    <Card className="mb-6 p-5">
      <form onSubmit={handleStart} className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">开始接单</h2>
          <span className="text-xs text-muted-foreground">
            {canStart
              ? `默认单价 ${formatYuan(defaultRateCents!)}/h`
              : "默认单价未设置"}
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="老板的名字"
            disabled={!canStart || pending}
            autoComplete="off"
            required
          />
          <Button
            type="submit"
            disabled={!canStart || pending}
            className="shrink-0"
          >
            {pending ? <Loader2 className="animate-spin" /> : <Play />}
            开始接单
          </Button>
        </div>
        {!canStart && (
          <p className="text-xs text-muted-foreground">
            没设默认单价不能用快速接单,可以走右上角的「报单」走完整流程。
          </p>
        )}
      </form>
    </Card>
  );
}

function ActiveOrderPanel({ order }: { order: ActiveOrder }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [elapsedMs, setElapsedMs] = useState(
    () => Date.now() - new Date(order.startAt).getTime()
  );

  useEffect(() => {
    const startMs = new Date(order.startAt).getTime();
    const tick = () => setElapsedMs(Date.now() - startMs);
    tick();
    const handle = setInterval(tick, 1000);
    return () => clearInterval(handle);
  }, [order.startAt]);

  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const seconds = Math.max(0, Math.floor((elapsedMs / 1000) % 60));
  const hours = Math.floor(minutes / 60);
  const elapsedLabel = hours
    ? `${hours}h ${String(minutes % 60).padStart(2, "0")}min`
    : `${minutes}min ${String(seconds).padStart(2, "0")}s`;

  // 预估应得:按已经过的时长 × 单价 × (1 - 抽成率),粗略给陪玩心里有数
  const estimateCents = Math.max(
    0,
    Math.round((order.hourlyRateCents * minutes) / 60)
  );

  function handleEnd() {
    if (!confirm("结束接单?会按实际时长记为已完成,等管理端打款")) return;
    startTransition(async () => {
      const res = await endQuickOrderAction({ id: order.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("已结束,等管理端打款");
      router.refresh();
    });
  }

  return (
    <Card className="mb-6 border-primary/30 bg-primary/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Timer className="size-4 text-primary" />
            <span className="text-base font-semibold">接单中</span>
          </div>
          <div className="mt-1 text-sm">
            <span className="text-muted-foreground">客户 </span>
            <span className="font-medium">{order.customerName}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div>
              <span className="text-xs text-muted-foreground">已计时 </span>
              <span className="font-mono text-lg font-semibold tabular-nums text-primary">
                {elapsedLabel}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">预估流水 </span>
              <span className="font-mono text-sm tabular-nums">
                {formatYuan(estimateCents)}
              </span>
            </div>
          </div>
        </div>
        <Button onClick={handleEnd} disabled={pending} size="lg">
          {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
          结束接单
        </Button>
      </div>
    </Card>
  );
}
