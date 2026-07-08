// Structure smoke-check (static grep), NOT a behavioral test.
// 仅对源码文本做正则断言,确认客户流水(ledger)相关代码存在;不执行任何业务逻辑。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const customersAction = read("src/server/actions/customers.ts");
const customersList = read("src/app/(authed)/customers/customers-list.tsx");

assert.match(customersAction, /getCustomerLedgerAction/);
assert.match(customersAction, /aliasedTable\(user,\s*"ledger_player"\)/);
assert.match(customersAction, /\.from\(order\)/);
assert.match(customersAction, /eq\(order\.customerId,\s*input\.customerId\)/);
assert.match(customersAction, /kind:\s*"ORDER"/);
assert.match(customersAction, /kind:\s*"BALANCE"/);
assert.match(customersAction, /playerName:\s*playerUser\.name/);

assert.match(customersList, /getCustomerLedgerAction/);
assert.match(customersList, /type CustomerOrderLedgerRow/);
assert.match(customersList, /接单/);
assert.match(customersList, /订单金额/);

console.log("customer ledger checks passed");
