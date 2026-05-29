import { requireSession } from "@/lib/auth-helpers";
import { ManagerOverview } from "./manager-overview";
import { PlayerOverview } from "./player-overview";

export default async function OverviewPage() {
  const { user } = await requireSession();
  if (user.role === "PLAYER") {
    return <PlayerOverview userId={user.id} userName={user.name} />;
  }
  return <ManagerOverview userName={user.name} />;
}
