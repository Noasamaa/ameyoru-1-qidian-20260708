"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, KeyRound, UserCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { avatarInitial } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface NavItem {
  href: string;
  label: string;
}

export interface AppNavProps {
  items: NavItem[];
  user: {
    displayName: string;
    username: string;
    roleLabel: string;
  };
}

// 路径需要 exact match 以避免互相误高亮(同级路径)
const exactMatchPaths = new Set([
  "/overview",
  "/orders",
  "/orders/new",
  "/players",
  "/staff",
  "/customers",
  "/leaderboard",
  "/payouts",
  "/profile",
]);

function isActive(pathname: string, href: string) {
  if (exactMatchPaths.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppNav({ items, user }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            起
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            起点电竞
          </span>
        </Link>

        <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2 pl-1.5 pr-2 sm:pr-3"
              aria-label="用户菜单"
            >
              <Avatar className="size-6">
                <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                  {avatarInitial(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">
                {user.displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{user.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {user.roleLabel}
                {user.username ? ` · ${user.username}` : ""}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserCircle /> 我的资料
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/change-password">
                <KeyRound /> 修改密码
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut /> 退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
