"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getOptionalSession } from "@/lib/auth-helpers";

/** 改密成功后调用,把强制改密标志清掉 */
export async function clearMustChangePwdAction() {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    return { ok: false as const };
  }
  await db
    .update(user)
    .set({ mustChangePwd: false })
    .where(eq(user.id, session.user.id));
  return { ok: true as const };
}
