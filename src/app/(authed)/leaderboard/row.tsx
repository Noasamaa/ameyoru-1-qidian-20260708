import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { avatarInitial, formatDuration, formatYuan } from "@/lib/format";
import type { LeaderboardDisplayRow as RowData } from "./podium";

export function LeaderboardRow({
  row,
  rank,
  isBoss,
  isMe,
}: {
  row: RowData;
  rank: number;
  isBoss: boolean;
  isMe: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent",
        isMe && "bg-primary/[0.04]"
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-sm font-medium tabular-nums text-muted-foreground">
        {rank}
      </span>
      <Avatar className="size-9">
        <AvatarFallback className="bg-muted text-foreground text-xs">
          {avatarInitial(row.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {row.displayName}
          {isMe && (
            <Badge variant="outline" className="text-[10px]">
              我
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDuration(row.durationMin)} · {row.orderCount} 单
        </div>
      </div>
      {isBoss && (
        <div className="text-right">
          <div className="font-mono text-sm tabular-nums">
            {formatYuan(row.payableCents)}
          </div>
          <div className="font-mono text-[11px] tabular-nums text-success">
            应得{" "}
            {row.playerEarnCents == null
              ? "—"
              : formatYuan(row.playerEarnCents)}
          </div>
        </div>
      )}
      {!isBoss && isMe && row.playerEarnCents != null && (
        <div className="text-right">
          <div className="font-mono text-sm tabular-nums text-success">
            {formatYuan(row.playerEarnCents)}
          </div>
          <div className="text-[11px] text-muted-foreground">应得</div>
        </div>
      )}
    </li>
  );
}
