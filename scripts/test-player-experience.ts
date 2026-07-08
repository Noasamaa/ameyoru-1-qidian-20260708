// Structure smoke-check (static grep), NOT a behavioral test.
// 仅对源码文本做正则断言,确认陪玩相关页面 / 字段存在;不执行任何业务逻辑。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const schema = read("src/db/schema.ts");
const usersAction = read("src/server/actions/users.ts");
const playersPage = read("src/app/(authed)/players/page.tsx");
const playersClient = read("src/app/(authed)/players/players-client.tsx");
const newOrderPage = read("src/app/(authed)/orders/new/page.tsx");
const orderForm = read("src/app/(authed)/orders/new/order-form.tsx");
const leaderboardPage = read("src/app/(authed)/leaderboard/page.tsx");
const profilePage = read("src/app/(authed)/profile/page.tsx");

assert.match(schema, /playerGender:\s*mysqlEnum\("player_gender",\s*\["MALE",\s*"FEMALE"\]\)/);
assert.match(usersAction, /playerGender:\s*z\.enum\(\["MALE",\s*"FEMALE"\]\)/);
assert.match(usersAction, /playerGender/);
assert.match(playersPage, /playerGender:\s*user\.playerGender/);
assert.match(playersClient, /男陪/);
assert.match(playersClient, /女陪/);
assert.match(playersClient, /PRICE_BUCKETS/);
assert.match(playersClient, /priceBucket/);
assert.match(newOrderPage, /playerGender:\s*user\.playerGender/);
assert.match(orderForm, /function PlayerPicker/);
assert.match(orderForm, /PRICE_BUCKETS/);
assert.match(orderForm, /男陪/);
assert.match(orderForm, /女陪/);
assert.doesNotMatch(orderForm, /<select[\s\S]*id="player"/);
assert.match(orderForm, /useState\(""\)/);
assert.match(orderForm, /setRate\(p\?\.defaultRateCents != null \? centsToYuanString\(p\.defaultRateCents\) : ""\)/);
assert.match(orderForm, /setUsePrepay\(false\)/);
assert.doesNotMatch(orderForm, /useState\(players\[0\]\?\.id/);
assert.doesNotMatch(orderForm, /nowLocalInput/);
assert.doesNotMatch(orderForm, /placeholder="叶子"/);
assert.doesNotMatch(newOrderPage, /initialRateCents/);
assert.doesNotMatch(newOrderPage, /players\[0\]\?\.defaultRateCents/);
assert.match(leaderboardPage, /safeRows/);
assert.match(leaderboardPage, /playerEarnCents:\s*r\.playerId === myId/);
assert.match(leaderboardPage, /null/);
assert.match(leaderboardPage, /只能看见自己的具体收益/);
assert.match(profilePage, /还没上传收款码/);
assert.match(profilePage, /请先上传微信或支付宝收款码/);
assert.match(profilePage, /如无法上传收款码，请设置\/修改安全码/);

console.log("player experience checks passed");
