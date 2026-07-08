import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "mysql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  // 我们用 username 登录,email 字段在 schema 里仍存在(伪 email)
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
    minPasswordLength: 6,
    // 账号只能由邀请 / 管理员后台经 auth.api.signUpEmail 服务端创建,
    // 关闭公开注册端点(POST /api/auth/sign-up/email),防止任何人自助注册 PLAYER。
    // 注:disableSignUp 只拦公开 HTTP 端点,服务端 auth.api.signUpEmail 调用不受影响。
    disableSignUp: true,
  },

  // 业务字段
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "PLAYER",
        input: false,
      },
      active: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
      playerGender: {
        type: "string",
        required: false,
        input: false,
      },
      defaultRateCents: {
        type: "number",
        required: false,
        input: false,
      },
      mustChangePwd: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
      wechatQrPath: {
        type: "string",
        required: false,
        input: false,
      },
      alipayQrPath: {
        type: "string",
        required: false,
        input: false,
      },
      qrSecurityCodeHash: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 天
    updateAge: 60 * 60 * 24, // 一天刷一次
  },

  // 仅在 BETTER_AUTH_URL 明确是 HTTPS 时启用 Secure cookie。
  // 正式域名走 HTTPS 会更安全,裸 IP/HTTP 部署也不会因 Secure cookie 无法登录。
  advanced: {
    useSecureCookies: (process.env.BETTER_AUTH_URL ?? "").startsWith("https://"),
  },

  // 登录限流:防暴力撞库。默认对所有 /api/auth 端点生效,
  // 并对登录端点单独收紧(60s 内最多 5 次)。
  rateLimit: {
    enabled: true,
    window: 60, // 秒
    max: 100, // 每个窗口每 IP 的默认上限
    customRules: {
      "/sign-in/username": { window: 60, max: 5 },
      "/sign-in/email": { window: 60, max: 5 },
    },
  },

  plugins: [
    username({
      minUsernameLength: 2,
      maxUsernameLength: 32,
      usernameValidator: (username) => /^[\p{L}\p{N}_.-]+$/u.test(username),
      usernameNormalization: false,
    }),
    nextCookies(),
  ],
});
