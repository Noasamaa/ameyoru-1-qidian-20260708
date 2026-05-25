import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { leaderboard } from "@/server/stats";
import { rangeLabel, type RangeKey } from "@/lib/date-range";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LeaderboardPodium } from "./podium";
import { LeaderboardRow as Row } from "./row";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ranges: RangeKey[] = ["today", "week", "month"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { user: me } = await requireSession();
  const { range: rangeParam } = await searchParams;
  const range = (ranges.includes(rangeParam as RangeKey)
    ? rangeParam
    : "week") as RangeKey;

  const rows = await leaderboard(range);
  const isBoss = me.role === "BOSS" || me.role === "STAFF";
  const safeRows = isBoss
    ? rows
    : rows.map((r) => ({
        ...r,
        payableCents: 0,
        commissionCents: 0,
        playerEarnCents: r.playerId === me.id ? r.playerEarnCents : null,
      }));

  return (
    <>
      <PageHeader
        title="排行榜"
        description={
          isBoss
            ? "按单量排序,显示每位陪玩的接单情况"
            : "看大家这周/这个月接了多少单,只能看见自己的具体收益"
        }
      />

      <div className="mb-6 inline-flex h-9 items-center justify-center rounded-lg bg-muted p-[3px]">
        {ranges.map((r) => (
          <Link
            key={r}
            href={`/leaderboard?range=${r}`}
            scroll={false}
            className={cn(
              "inline-flex h-full items-center rounded-md px-4 text-sm font-medium transition-all",
              r === range
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {rangeLabel[r]}
          </Link>
        ))}
      </div>

      {safeRows.length === 0 ? (
        <EmptyState
          icon={<Trophy />}
          title={`${rangeLabel[range]}还没有订单`}
          description="陪玩报单后,排行实时更新"
        />
      ) : (
        <>
          <LeaderboardPodium
            rows={safeRows.slice(0, 3)}
            isBoss={isBoss}
            myId={me.id}
          />
          {safeRows.length > 3 && (
            <Card className="mt-6 overflow-hidden p-0">
              <ul className="divide-y">
                {safeRows.slice(3).map((r, i) => (
                  <Row
                    key={r.playerId}
                    row={r}
                    rank={i + 4}
                    isBoss={isBoss}
                    isMe={r.playerId === me.id}
                  />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
