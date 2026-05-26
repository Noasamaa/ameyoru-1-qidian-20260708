"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  FileText,
  Loader2,
  MessageCircle,
  MinusCircle,
  Pencil,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { avatarInitial, formatDuration, formatYuan } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  addCustomerDepositAction,
  deductCustomerBalanceAction,
  getCustomerLedgerAction,
  updateCustomerAction,
} from "@/server/actions/customers";
import type { CustomerBalanceTxnType, OrderStatus } from "@/db/schema";

interface CustomerRow {
  id: string;
  name: string;
  memberNo: string;
  wechat: string | null;
  note: string | null;
  orderCount: number;
  payableCents: number;
  balanceCents: number;
}

interface PlayerOption {
  id: string;
  name: string;
  username: string;
}

type CustomerBalanceLedgerRow = {
  kind: "BALANCE";
  id: string;
  txnId: string;
  type: CustomerBalanceTxnType;
  amountCents: number;
  note: string | null;
  createdAt: string;
  occurredAt: string;
  actorName: string;
  orderId: string | null;
  orderStartAt: string | null;
  orderPayableCents: number | null;
  playerNames: string[] | null;
};

type CustomerOrderLedgerRow = {
  kind: "ORDER";
  id: string;
  orderId: string;
  createdAt: string;
  occurredAt: string;
  startAt: string;
  durationMin: number;
  payableCents: number;
  prepayUsedCents: number;
  discountCents: number;
  orderStatus: OrderStatus;
  note: string | null;
  playerName: string;
  dispatcherName: string;
};

type CustomerLedgerRow = CustomerBalanceLedgerRow | CustomerOrderLedgerRow;

export function CustomersList({
  customers,
  players,
}: {
  customers: CustomerRow[];
  players: PlayerOption[];
}) {
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [depositing, setDepositing] = useState<CustomerRow | null>(null);
  const [deducting, setDeducting] = useState<CustomerRow | null>(null);
  const [ledgerCustomer, setLedgerCustomer] = useState<CustomerRow | null>(null);
  return (
    <>
      <Card className="overflow-hidden p-0">
        <ul className="divide-y">
          {customers.map((c, i) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 px-4 py-3 hover:bg-accent/40 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-sm font-medium tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    {avatarInitial(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{c.name}</span>
                    {c.orderCount >= 10 && (
                      <Badge className="border-transparent bg-gradient-to-br from-rank-gold-from to-rank-gold-to text-white text-[10px]">
                        VIP
                      </Badge>
                    )}
                    {c.orderCount >= 2 && c.orderCount < 10 && (
                      <Badge variant="success" className="text-[10px]">
                        回头客
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="font-mono">#{c.memberNo}</span>
                    {c.wechat && (
                      <span className="inline-flex items-center gap-0.5 font-mono">
                        <MessageCircle className="size-3" />
                        {c.wechat}
                      </span>
                    )}
                    {c.note && <span className="truncate">· {c.note}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-medium tabular-nums">
                    {formatYuan(c.payableCents)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.orderCount} 单
                  </div>
                  {c.balanceCents > 0 && (
                    <div className="font-mono text-xs tabular-nums text-success">
                      预存余额 {formatYuan(c.balanceCents)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant={c.balanceCents > 0 ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setDepositing(c)}
                  className="flex-1 sm:flex-none"
                >
                  <WalletCards />
                  充值预存
                </Button>
                {c.balanceCents > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeducting(c)}
                    className="flex-1 sm:flex-none"
                  >
                    <MinusCircle />
                    扣减
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLedgerCustomer(c)}
                  className="flex-1 sm:flex-none"
                >
                  <FileText />
                  查看流水
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="编辑客户"
                  onClick={() => setEditing(c)}
                >
                  <Pencil />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* key={editing.id} 确保每次切换客户都重置表单 state */}
      {editing && (
        <EditCustomerDialog
          key={editing.id}
          customer={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {depositing && (
        <DepositDialog
          key={depositing.id}
          customer={depositing}
          onClose={() => setDepositing(null)}
        />
      )}

      {deducting && (
        <DeductDialog
          key={deducting.id}
          customer={deducting}
          players={players}
          onClose={() => setDeducting(null)}
        />
      )}

      {ledgerCustomer && (
        <CustomerLedgerDialog
          key={ledgerCustomer.id}
          customer={ledgerCustomer}
          onClose={() => setLedgerCustomer(null)}
        />
      )}
    </>
  );
}

function EditCustomerDialog({
  customer,
  onClose,
}: {
  customer: CustomerRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(customer.name);
  const [wechat, setWechat] = useState(customer.wechat ?? "");
  const [note, setNote] = useState(customer.note ?? "");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateCustomerAction({
        id: customer.id,
        name: name.trim(),
        wechat: wechat.trim() || null,
        note: note.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("已保存");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑客户</DialogTitle>
          <DialogDescription>
            会员号 <span className="font-mono">{customer.memberNo}</span>{" "}
            自动生成,不可改
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cust-name">客户名</Label>
            <Input
              id="cust-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-wechat">微信号(仅老板/员工可见)</Label>
            <Input
              id="cust-wechat"
              value={wechat}
              onChange={(e) => setWechat(e.target.value)}
              placeholder="客户微信号"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-note">备注</Label>
            <Input
              id="cust-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="比如:重要客户、易取消等"
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} 保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DepositDialog({
  customer,
  onClose,
}: {
  customer: CustomerRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addCustomerDepositAction({
        customerId: customer.id,
        amountYuan: amount,
        note: note.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("预存已入账");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>充值预存</DialogTitle>
          <DialogDescription>
            {customer.name} · 当前预存余额{" "}
            <span className="font-mono">
              {formatYuan(customer.balanceCents)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deposit-amount">充值金额(元)</Label>
            <Input
              id="deposit-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deposit-note">备注(选填)</Label>
            <Input
              id="deposit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="比如:微信转账、线下收款"
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              确认充值
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const txnLabel: Record<CustomerBalanceTxnType, string> = {
  DEPOSIT: "充值",
  ORDER_DEBIT: "预存变动 · 订单抵扣",
  ORDER_REFUND: "预存变动 · 取消退回",
  MANUAL_DEDUCT: "预存扣减(老板提取)",
};

function DeductDialog({
  customer,
  players,
  onClose,
}: {
  customer: CustomerRow;
  players: PlayerOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      toast.error("请至少选一个陪玩");
      return;
    }
    startTransition(async () => {
      const res = await deductCustomerBalanceAction({
        customerId: customer.id,
        amountYuan: amount,
        playerIds: Array.from(selectedIds),
        note: note.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("已扣减预存余额");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>扣减预存余额</DialogTitle>
          <DialogDescription>
            {customer.name} · 当前预存余额{" "}
            <span className="font-mono">
              {formatYuan(customer.balanceCents)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deduct-amount">扣减金额(元)</Label>
            <Input
              id="deduct-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={(customer.balanceCents / 100).toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>关联陪玩(可多选)</Label>
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无在职陪玩</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <ul className="divide-y">
                  {players.map((p) => {
                    const checked = selectedIds.has(p.id);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => togglePlayer(p.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                            checked && "bg-primary/10"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded border",
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input"
                            )}
                          >
                            {checked && <Check className="size-3" />}
                          </span>
                          <span className="flex-1 truncate">{p.name}</span>
                          {p.username && (
                            <span className="font-mono text-xs text-muted-foreground">
                              @{p.username}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              已选 {selectedIds.size} 人
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deduct-note">备注(选填)</Label>
            <Input
              id="deduct-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="比如:陪玩私下接单 / 私单线下结清"
              maxLength={200}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              确认扣减
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const orderStatusLabel: Record<OrderStatus, string> = {
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  CANCELED: "已取消",
};

function CustomerLedgerDialog({
  customer,
  onClose,
}: {
  customer: CustomerRow;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<CustomerLedgerRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await getCustomerLedgerAction({ customerId: customer.id });
      if (!res.ok) return;
      setRows(res.rows);
    });
  }, [customer.id]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>客户流水</DialogTitle>
          <DialogDescription>
            {customer.name} · #{customer.memberNo}
            {customer.wechat ? ` · ${customer.wechat}` : ""} · 当前余额{" "}
            {formatYuan(customer.balanceCents)}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
          {pending && !rows ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="animate-spin" />
              加载中
            </div>
          ) : rows && rows.length > 0 ? (
            <ul className="divide-y">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  {r.kind === "ORDER" ? (
                    <OrderLedgerRow row={r} />
                  ) : (
                    <BalanceLedgerRow row={r} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              暂无客户流水
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrderLedgerRow({ row }: { row: CustomerOrderLedgerRow }) {
  const remainingCents = row.payableCents - row.prepayUsedCents;
  return (
    <>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span>订单 · {row.playerName} 接单</span>
          <Badge variant={row.orderStatus === "COMPLETED" ? "success" : "outline"}>
            {orderStatusLabel[row.orderStatus]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(row.startAt).toLocaleString("zh-CN", { hour12: false })}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatDuration(row.durationMin)} · 派单 {row.dispatcherName} · 订单金额{" "}
          <span className="font-mono">{formatYuan(row.payableCents)}</span>
          {row.prepayUsedCents > 0
            ? ` · 预存抵扣 ${formatYuan(row.prepayUsedCents)} · 还需支付 ${formatYuan(
                remainingCents
              )}`
            : ""}
          {row.note ? ` · ${row.note}` : ""}
        </div>
      </div>
      <div className="font-mono text-sm font-semibold tabular-nums">
        {formatYuan(row.payableCents)}
      </div>
    </>
  );
}

function BalanceLedgerRow({ row }: { row: CustomerBalanceLedgerRow }) {
  return (
    <>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span>{txnLabel[row.type]}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(row.createdAt).toLocaleString("zh-CN", { hour12: false })}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          操作人 {row.actorName}
          {row.playerNames && row.playerNames.length > 0
            ? ` · 陪玩 ${row.playerNames.join("、")}`
            : ""}
          {row.orderId && row.orderStartAt
            ? ` · 订单 ${new Date(row.orderStartAt).toLocaleString("zh-CN", {
                hour12: false,
              })}`
            : ""}
          {row.note ? ` · ${row.note}` : ""}
        </div>
      </div>
      <div
        className={
          row.amountCents >= 0
            ? "font-mono text-sm font-semibold text-success"
            : "font-mono text-sm font-semibold text-foreground"
        }
      >
        {row.amountCents >= 0 ? "+" : ""}
        {formatYuan(row.amountCents)}
      </div>
    </>
  );
}
