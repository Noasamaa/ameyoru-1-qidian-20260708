// Structure smoke-check (static grep), NOT a behavioral test.
// 仅对源码文本做正则断言,确认陪玩邀请 / 客户字段相关代码存在;不执行任何业务逻辑。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const schema = read("src/db/schema.ts");
const auth = read("src/lib/auth.ts");
const userActions = read("src/server/actions/users.ts");
const customerActions = read("src/server/actions/customers.ts");
const orderActions = read("src/server/actions/orders.ts");
const authedLayout = read("src/app/(authed)/layout.tsx");
const staffPage = read("src/app/(authed)/staff/page.tsx");
const playersPage = read("src/app/(authed)/players/page.tsx");
const staffClient = read("src/app/(authed)/staff/staff-client.tsx");
const customersList = read("src/app/(authed)/customers/customers-list.tsx");
const newOrderPage = read("src/app/(authed)/orders/new/page.tsx");
const orderForm = read("src/app/(authed)/orders/new/order-form.tsx");
const inviteAction = read("src/server/actions/player-invites.ts");
const invitePage = read("src/app/player-invite/[token]/page.tsx");
const inviteForm = read("src/app/player-invite/[token]/player-invite-form.tsx");
const packageJson = read("package.json");

assert.doesNotMatch(schema, /name:\s*text\("name"\)\.notNull\(\)\.unique\(\)/);
assert.match(schema, /customer_wechat_idx/);
assert.match(schema, /playerInvite\s*=\s*mysqlTable\(\s*"player_invite"/);
assert.match(schema, /inviteToken/);
assert.match(schema, /expiresAt/);
assert.match(schema, /usedAt/);

assert.match(auth, /usernameValidator:\s*\(username\)\s*=>/);
assert.match(auth, /\/\^\[\\p\{L\}\\p\{N\}_.-\]\+\$\/u/);
assert.match(userActions, /usernameField/);
assert.match(userActions, /\\p\{L\}/);
assert.match(userActions, /passwordSchema/);
assert.match(userActions, /\(\?\=\.\*\[a-z\]\)\(\?\=\.\*\[A-Z\]\)/);
assert.match(userActions, /completePlayerInviteAction/);
assert.match(userActions, /mustChangePwd:\s*false/);

assert.match(userActions, /requireSession\(\{ role: \["BOSS", "STAFF"\] \}\)/);
assert.match(staffPage, /requireSession\(\{ role: \["BOSS", "STAFF"\] \}\)/);
assert.match(playersPage, /canManage=\{me\.role === "BOSS" \|\| me\.role === "STAFF"\}/);
assert.match(authedLayout, /staffNav:[\s\S]*\/staff/);
assert.match(staffClient, /同权限/);

assert.match(customerActions, /getCustomerBalanceTxnsAction/);
assert.match(customersList, /客户流水/);
assert.match(customersList, /查看流水/);
assert.match(newOrderPage, /wechat:\s*customer\.wechat/);
assert.match(orderForm, /customerId/);
assert.match(orderForm, /customerWechat/);
assert.match(orderActions, /customerId:\s*z\.string\(\)\.optional\(\)/);
assert.match(orderActions, /customerWechat/);
assert.match(orderActions, /findOrCreateCustomer\(/);
assert.match(orderActions, /customerRec = await findOrCreateCustomer/);

assert.match(inviteAction, /createPlayerInviteAction/);
assert.match(inviteAction, /playerInvite/);
assert.match(staffClient, /创建陪玩链接/);
assert.match(invitePage, /PlayerInviteForm/);
assert.match(inviteForm, /微信收款码/);
assert.match(inviteForm, /支付宝收款码/);
assert.match(inviteForm, /用户名允许中文/);
assert.match(packageJson, /test:partner-customer-invite/);

console.log("partner customer invite checks passed");
