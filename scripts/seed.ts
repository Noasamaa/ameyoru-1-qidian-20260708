/**
 * 创建初始老板账号。
 * 用 `npm run db:seed` 运行。
 * 需要先 `npm run db:push` 把 schema 推到 MySQL。
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import { db } from "../src/db";
import { user } from "../src/db/schema";
import { BOSS_USERNAME, INTERNAL_EMAIL_DOMAIN } from "../src/lib/constants";

async function main() {
  const initPwd = process.env.BOSS_INIT_PASSWORD ?? "changeme";
  const email = `${BOSS_USERNAME}@${INTERNAL_EMAIL_DOMAIN}`;

  const existing = await db
    .select()
    .from(user)
    .where(eq(user.username, BOSS_USERNAME));

  if (existing.length > 0) {
    console.log(`[seed] 老板账号已存在(${BOSS_USERNAME}),跳过`);
    return;
  }

  // 通过 Better Auth 创建(密码自动 bcrypt 哈希存 account 表)
  await auth.api.signUpEmail({
    body: {
      email,
      password: initPwd,
      name: "老板",
      username: BOSS_USERNAME,
    },
  });

  // role 等业务字段在 schema 中是 input: false,通过 API 不能传入,这里补 update
  await db
    .update(user)
    .set({ role: "BOSS", mustChangePwd: true, name: "老板" })
    .where(eq(user.username, BOSS_USERNAME));

  console.log(`[seed] 已创建老板账号`);
  console.log(`       用户名:${BOSS_USERNAME}`);
  console.log(`       初始密码:${initPwd}`);
  console.log(`       登录后会强制改密。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
