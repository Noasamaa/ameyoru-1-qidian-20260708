import Link from "next/link";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { leaderboard } from "@/server/stats";
import { rangeLabel, type RangeKey } from "@/lib/date-range";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeaderboardPodium } from "./podium";
import { LeaderboardRow as Row } from "./row";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ranges: RangeKey[] = ["today", "week", "month"];
const PAGE_SIZE = 20;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  const { user: me } = await requireSession();
  const { range: rangeParam, page: pageParam } = await searchParams;
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

  // 分页:Top 3 始终显示;第 4 名起按 PAGE_SIZE 翻页
  const restRows = safeRows.slice(3);
  const totalPages = Math.max(1, Math.ceil(restRows.length / PAGE_SIZE));
  const currentPage = Math.min(
    totalPages,
    Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  );
  const pageRows = restRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 自己在第几名(用于顶部提示)
  const myRankIdx = safeRows.findIndex((r) => r.playerId === me.id);
  const myRankLabel =
    myRankIdx >= 0
      ? `你排第 ${myRankIdx + 1},共 ${safeRows.length} 人`
      : null;

  function pageHref(p: number) {
    return `/leaderboard?range=${range}&page=${p}`;
  }

  return (
    <>
      <PageHeader
        title="排行榜"
        description={
          isBoss
            ? "按总时长排序,显示每位陪玩的接单情况"
            : "按总时长排序,只能看见自己的具体收益"
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-[3px]">
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
        {myRankLabel && !isBoss && (
          <Badge variant="secondary" className="text-xs">
            {myRankLabel}
          </Badge>
        )}
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
          {restRows.length > 0 && (
            <Card className="mt-6 overflow-hidden p-0">
              <ul className="divide-y">
                {pageRows.map((r, i) => {
                  const rank = 3 + (currentPage - 1) * PAGE_SIZE + i + 1;
                  return (
                    <Row
                      key={r.playerId}
                      row={r}
                      rank={rank}
                      isBoss={isBoss}
                      isMe={r.playerId === me.id}
                    />
                  );
                })}
              </ul>
            </Card>
          )}

          {/* 分页导航 */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {currentPage > 1 && (
                <Button asChild variant="ghost" size="icon">
                  <Link href={pageHref(currentPage - 1)} scroll={false}>
                    <ChevronLeft />
                  </Link>
                </Button>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 2
                )
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] ?? 0) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span
                      key={`dots-${idx}`}
                      className="px-1 text-sm text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      asChild={item !== currentPage}
                      variant={item === currentPage ? "default" : "ghost"}
                      size="icon"
                      className="size-8 text-sm"
                    >
                      {item === currentPage ? (
                        <span>{item}</span>
                      ) : (
                        <Link href={pageHref(item)} scroll={false}>
                          {item}
                        </Link>
                      )}
                    </Button>
                  )
                )}
              {currentPage < totalPages && (
                <Button asChild variant="ghost" size="icon">
                  <Link href={pageHref(currentPage + 1)} scroll={false}>
                    <ChevronRight />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
