import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const schema = read("src/db/schema.ts");
const customersAction = read("src/server/actions/customers.ts");
const ordersAction = read("src/server/actions/orders.ts");
const customersPage = read("src/app/(authed)/customers/page.tsx");
const customersList = read("src/app/(authed)/customers/customers-list.tsx");
const newOrderPage = read("src/app/(authed)/orders/new/page.tsx");
const orderForm = read("src/app/(authed)/orders/new/order-form.tsx");
const ordersPage = read("src/app/(authed)/orders/page.tsx");
const ordersList = read("src/app/(authed)/orders/orders-list.tsx");

assert.match(schema, /balanceCents:\s*integer\("balance_cents"\)/);
assert.match(
  schema,
  /customerBalanceTxn\s*=\s*sqliteTable\(\s*"customer_balance_txn"/
);
assert.match(schema, /"DEPOSIT"/);
assert.match(schema, /"ORDER_DEBIT"/);
assert.match(schema, /"ORDER_REFUND"/);
assert.match(schema, /prepayUsedCents:\s*integer\("prepay_used_cents"\)/);

assert.match(customersAction, /addCustomerDepositAction/);
assert.match(customersAction, /customerBalanceTxn/);
assert.match(customersAction, /DEPOSIT/);
assert.match(customersAction, /customer\.balanceCents}\s*\+\s*\$\{amountCents/);

assert.match(ordersAction, /usePrepay/);
assert.match(ordersAction, /prepayUsedCents/);
assert.match(ordersAction, /ORDER_DEBIT/);
assert.match(ordersAction, /ORDER_REFUND/);
assert.match(ordersAction, /customer\.balanceCents}\s*-\s*\$\{prepayUsedCents/);
assert.match(
  ordersAction,
  /customer\.balanceCents}\s*\+\s*\$\{target\.prepayUsedCents/
);

assert.match(customersPage, /balanceCents:\s*c\.balanceCents/);
assert.match(customersList, /预存余额/);
assert.match(customersList, /充值预存/);
assert.match(customersList, /addCustomerDepositAction/);
assert.match(newOrderPage, /balanceCents:\s*customer\.balanceCents/);
assert.match(orderForm, /usePrepay/);
assert.match(orderForm, /使用预存/);
assert.match(orderForm, /预存抵扣/);
assert.match(ordersPage, /prepayUsedCents:\s*order\.prepayUsedCents/);
assert.match(ordersList, /预存抵扣/);
assert.match(ordersList, /还需支付/);

console.log("customer prepay checks passed");
