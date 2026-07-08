// Structure smoke-check (static grep), NOT a behavioral test.
// 仅对源码文本做正则断言,确认各项安全加固代码(鉴权/校验/上传嗅探等)存在;不执行任何业务逻辑。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const authHelpers = read("src/lib/auth-helpers.ts");
const usersAction = read("src/server/actions/users.ts");
const ordersAction = read("src/server/actions/orders.ts");
const qrAction = read("src/server/actions/qr.ts");
const imageUpload = read("src/lib/image-upload.ts");
const middleware = read("src/middleware.ts");
const playersClient = read("src/app/(authed)/players/players-client.tsx");
const staffClient = read("src/app/(authed)/staff/staff-client.tsx");
const customersList = read("src/app/(authed)/customers/customers-list.tsx");

assert.match(authHelpers, /active:\s*boolean/);
assert.match(authHelpers, /getFreshUser\(/);
assert.match(authHelpers, /if\s*\(!freshUser\?\.active\)/);
assert.match(authHelpers, /\/login\?inactive=1/);
assert.match(middleware, /forceLogin/);
assert.match(middleware, /searchParams\.has\("inactive"\)/);

assert.match(usersAction, /const\s+\{\s*user:\s*me\s*\}\s*=\s*await requireSession/);
assert.match(usersAction, /input\.id === me\.id/);
assert.match(usersAction, /target\.role === "BOSS"/);
assert.match(usersAction, /useCount:\s*sql`\$\{playerInvite\.useCount\} \+ 1`/);
assert.match(usersAction, /lt\(playerInvite\.useCount,\s*playerInvite\.maxUses\)/);
assert.match(usersAction, /affectedRows !== 1/);

assert.match(ordersAction, /selectedPlayer/);
assert.match(ordersAction, /eq\(user\.role,\s*"PLAYER"\)/);
assert.match(ordersAction, /eq\(user\.active,\s*true\)/);

assert.match(imageUpload, /detectImageUpload/);
assert.match(imageUpload, /0xff/);
assert.match(imageUpload, /RIFF/);
assert.match(imageUpload, /WEBP/);
assert.match(qrAction, /readImageUpload/);
assert.match(usersAction, /readImageUpload/);

assert.match(playersClient, /if\s*\(!res\.ok\)/);
assert.match(staffClient, /if\s*\(!res\.ok\)/);
assert.match(customersList, /预存变动/);

console.log("security hardening checks passed");
