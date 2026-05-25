import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus, SettleStatus } from "@/db/schema";

const orderStatusMap = {
  IN_PROGRESS: {
    label: "进行中",
    variant: "default" as const,
    icon: Clock,
  },
  COMPLETED: {
    label: "已完成",
    variant: "success" as const,
    icon: CheckCircle2,
  },
  CANCELED: {
    label: "已取消",
    variant: "outline" as const,
    icon: XCircle,
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = orderStatusMap[status];
  const Icon = m.icon;
  return (
    <Badge variant={m.variant} className="gap-1">
      <Icon className="size-3" />
      {m.label}
    </Badge>
  );
}

export function SettleStatusBadge({ status }: { status: SettleStatus }) {
  if (status === "SETTLED") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="size-3" />
        已结
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <Clock className="size-3" />
      未结
    </Badge>
  );
}

/**
 * 组合徽章:
 * - 进行中:仅订单状态
 * - 已完成:订单状态 + 结算状态
 * - 已取消(有补偿):订单状态 + 结算状态(陪玩有钱要拿)
 * - 已取消(无补偿):仅订单状态
 */
export function OrderStatusGroup({
  orderStatus,
  settleStatus,
  hasCompensation = false,
}: {
  orderStatus: OrderStatus;
  settleStatus: SettleStatus;
  hasCompensation?: boolean;
}) {
  const showSettle =
    orderStatus === "COMPLETED" ||
    (orderStatus === "CANCELED" && hasCompensation);
  if (!showSettle) {
    return <OrderStatusBadge status={orderStatus} />;
  }
  return (
    <span className="flex items-center gap-1.5">
      <OrderStatusBadge status={orderStatus} />
      <SettleStatusBadge status={settleStatus} />
    </span>
  );
}
