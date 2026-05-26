import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { avatarInitial, formatDuration, formatYuan } from "@/lib/format";
import type { LeaderboardRow } from "@/server/stats";

export type LeaderboardDisplayRow = Omit<
  LeaderboardRow,
  "playerEarnCents"
> & {
  playerEarnCents: number | null;
};

interface PodiumProps {
  rows: LeaderboardDisplayRow[];
  isBoss: boolean;
  myId: string;
}

const styles = [
  // 第 1 名
  {
    gradient:
      "from-rank-gold-from via-rank-gold-to/90 to-rank-gold-to",
    label: "🥇 冠军",
    accent: "ring-rank-gold-to/40",
  },
  // 第 2 名
  {
    gradient:
      "from-rank-silver-from via-rank-silver-to/95 to-rank-silver-to",
    label: "🥈 亚军",
    accent: "ring-rank-silver-to/40",
  },
  // 第 3 名
  {
    gradient:
      "from-rank-bronze-from via-rank-bronze-to/90 to-rank-bronze-to",
    label: "🥉 季军",
    accent: "ring-rank-bronze-to/40",
  },
];

export function LeaderboardPodium({
  rows,
  isBoss,
  myId,
}: PodiumProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {rows.map((r, i) => {
        const s = styles[i];
        const isMe = r.playerId === myId;
        return (
          <div
            key={r.playerId}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md",
              isMe && "ring-2 ring-primary/40"
            )}
          >
            {/* 渐变光晕装饰 */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-gradient-to-br opacity-30 blur-3xl",
                s.gradient
              )}
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <Badge
                  className={cn(
                    "border-transparent bg-gradient-to-br text-white shadow-sm",
                    s.gradient
                  )}
                >
                  {s.label}
                </Badge>
                {isMe && (
                  <Badge variant="outline" className="text-[10px]">
                    我
                  </Badge>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Avatar
                  className={cn(
                    "size-12 ring-2 ring-offset-2 ring-offset-background",
                    s.accent
                  )}
                >
                  <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                    {avatarInitial(r.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">
                    {r.displayName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDuration(r.durationMin)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat label="时长" value={formatDuration(r.durationMin)} />
                <Stat label="单数" value={r.orderCount.toString()} />
              </div>
              {isBoss && (
                <div className="mt-2">
                  <Stat
                    label="流水"
                    value={formatYuan(r.payableCents)}
                    mono
                  />
                </div>
              )}
              {!isBoss && isMe && r.playerEarnCents != null && (
                <div className="mt-2">
                  <Stat
                    label="应得"
                    value={formatYuan(r.playerEarnCents)}
                    mono
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 若不足 3 人,占位卡片 */}
      {Array.from({ length: Math.max(0, 3 - rows.length) }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="rounded-2xl border border-dashed bg-muted/20 p-5 text-center"
        >
          <div className="text-xs text-muted-foreground">虚位以待</div>
        </div>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-base font-semibold tabular-nums",
          mono && "font-mono"
        )}
      >
        {value}
      </div>
    </div>
  );
}
