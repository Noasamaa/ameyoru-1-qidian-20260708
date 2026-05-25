import { cn } from "@/lib/utils";

const styles: Record<number, string> = {
  0: "bg-gradient-to-br from-rank-gold-from to-rank-gold-to text-white shadow-sm",
  1: "bg-gradient-to-br from-rank-silver-from to-rank-silver-to text-foreground shadow-sm",
  2: "bg-gradient-to-br from-rank-bronze-from to-rank-bronze-to text-white shadow-sm",
};

/** 排行榜小徽章 — 0/1/2 名用金/银/铜渐变,其后用灰色数字 */
export function RankBadge({ index }: { index: number }) {
  const top = styles[index];
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums",
        top ?? "font-medium text-muted-foreground"
      )}
    >
      {index + 1}
    </span>
  );
}
