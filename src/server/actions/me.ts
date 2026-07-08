"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth-helpers";

const MIN_PASSWORD_LENGTH = 6;

/**
 * 修改密码:经 better-auth 校验当前密码后才生效,成功后才清掉强制改密标志。
 *
 * mustChangePwd 只能作为"已验证的改密"的一部分被清除 —— 不再提供任何
 * 无条件清除入口,避免用户保留初始/临时密码却绕过强制改密门槛。
 * 强制改密用户允许进入本动作(allowMustChangePwd),由 changePassword
 * 验证旧密码;门槛的拦截点仍是 auth-helpers 里的重定向。
 */
export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user: me } = await requireSession({ allowMustChangePwd: true });

  const currentPassword = input.currentPassword ?? "";
  const newPassword = input.newPassword ?? "";
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `新密码至少 ${MIN_PASSWORD_LENGTH} 位` };
  }

  try {
    // changePassword 会校验 currentPassword,错误时抛出;只有校验通过才会返回。
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "当前密码不正确",
    };
  }

  // 密码确实被改过后,才清除强制改密标志。
  await db
    .update(user)
    .set({ mustChangePwd: false })
    .where(eq(user.id, me.id));

  return { ok: true };
}
