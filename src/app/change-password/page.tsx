import { requireSession } from "@/lib/auth-helpers";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const { user } = await requireSession({ allowMustChangePwd: true });

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {user.mustChangePwd ? "请先修改初始密码" : "修改密码"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.mustChangePwd
              ? "首次登录,设置一个你自己的密码"
              : "至少 6 位"}
          </p>
        </div>
        <ChangePasswordForm forced={!!user.mustChangePwd} />
      </div>
    </div>
  );
}
