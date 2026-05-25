import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 轻量 middleware:只检查 cookie 是否存在,不做 DB 查询(Edge runtime 友好)。
 * 完整 session + 角色检查在 server components 和 server actions 里做。
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const isLogin = pathname === "/login";
  const forceLogin = request.nextUrl.searchParams.has("inactive");

  if (!sessionCookie) {
    if (isLogin) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLogin && forceLogin) return NextResponse.next();

  if (isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
