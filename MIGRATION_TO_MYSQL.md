# SQLite → MySQL 迁移操作单 (Runbook)

按顺序执行。任何一步报错先停下排查,不要硬上。

## 0. 前置条件检查

- [ ] 已有目标 MySQL 8.x 实例,服务器/网络可达
- [ ] 已有运维账号,具备 CREATE DATABASE / CREATE USER / GRANT 权限
- [ ] 已通知所有相关方:本次切换需要停服 ~30 分钟
- [ ] 本地端到端验证 (Task #8) 已通过

## 1. 准备 MySQL 实例 (服务器或运维侧,提前做好)

```sql
CREATE DATABASE mo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'mo_user'@'%' IDENTIFIED BY '<填一个强密码>';
GRANT ALL PRIVILEGES ON mo.* TO 'mo_user'@'%';
FLUSH PRIVILEGES;
```

确认时区:`SELECT @@global.time_zone, @@session.time_zone;` — 应该是 `+08:00` 或 `Asia/Shanghai`。如果是 `SYSTEM`,看服务器系统时区是否对。

## 2. 在 MySQL 上建表

把项目代码拉到 deploy 用的临时机器,或直接在服务器跑:

```bash
# 设置好 .env (DATABASE_URL=mysql://mo_user:xxx@host:3306/mo?charset=utf8mb4)
npm install --omit=dev=false   # 装上 better-sqlite3 (devDep) 给迁移脚本用
npm run db:push                # drizzle-kit 把 schema push 到空库
```

或者把 `drizzle/0000_mighty_jack_power.sql` 直接 `mysql ... < ` 灌进去也行,只用一次。

跑完后用 `SHOW TABLES;` 确认 8 张表都建好:`account, customer, customer_balance_txn, order, player_invite, session, user, verification`。

## 3. 停服 (此刻起开始计时)

```bash
# 在跑应用的服务器
pm2 stop mo            # 或者 systemctl stop mo / docker stop mo,看你怎么部署的
```

停服后立刻验证:`curl https://你的域名/` 应该不通。

## 4. 备份 SQLite

```bash
# 在生产服务器 SQLite 文件所在目录
cp data/mo.db data/mo.db.bak.$(date +%Y%m%d_%H%M%S)
ls -lh data/mo.db.bak.*    # 确认备份在了
```

**这一步是后悔药,不能跳过。**

## 5. 把 SQLite 文件拷到迁移机器

如果迁移脚本不在同一台机器跑,先拷过去:

```bash
# 假设迁移脚本机器名 migrator
scp data/mo.db migrator:/path/to/ameyoru/data/mo.db
```

`LEGACY_SQLITE_PATH` 在 `.env` 里指向这个文件路径。

## 6. 数据迁移 — Dry Run

```bash
cd /path/to/ameyoru
# 确认 .env 里 DATABASE_URL 指向 MySQL,LEGACY_SQLITE_PATH 指向旧文件
npm run db:migrate-from-sqlite
```

输出会显示每张表的行数。**对照肉眼检查**:

- `user` 行数 = 旧 SQLite 里 `SELECT COUNT(*) FROM user;`
- `customer` / `order` / `customer_balance_txn` 同样对账

dry-run 全部正常,继续:

## 7. 数据迁移 — 真正写入

```bash
npm run db:migrate-from-sqlite -- --commit
```

完成后到 MySQL 里二次校验:

```sql
SELECT 'user' AS t, COUNT(*) FROM user
UNION ALL SELECT 'customer', COUNT(*) FROM customer
UNION ALL SELECT 'player_invite', COUNT(*) FROM player_invite
UNION ALL SELECT 'order', COUNT(*) FROM `order`
UNION ALL SELECT 'customer_balance_txn', COUNT(*) FROM customer_balance_txn
UNION ALL SELECT 'session', COUNT(*) FROM session
UNION ALL SELECT 'account', COUNT(*) FROM account
UNION ALL SELECT 'verification', COUNT(*) FROM verification;
```

数字必须和脚本日志里的 `total=` 一致。

抽查关键余额:

```sql
SELECT SUM(balance_cents) FROM customer;
```

应该跟旧 SQLite 的 `SELECT SUM(balance_cents) FROM customer;` 完全相等。**不等就回滚 (步骤 11)**。

## 8. 部署新代码

```bash
# 服务器上拉新版本(已包含 mysql2 + 改写后的 schema/db/auth)
git fetch && git checkout <new-tag>
npm ci --omit=dev
npm run build
```

确认 `.env` 里:
- `DATABASE_URL=mysql://...` (新)
- `BETTER_AUTH_SECRET` 沿用旧值 (不能换,否则所有 session 失效;迁过来的 session 表也用旧 secret 验签)

## 9. 启动新版

```bash
pm2 start mo    # 或 systemctl start mo / docker start mo
pm2 logs mo --lines 100
```

观察启动日志:
- 没有 `ECONNREFUSED` (MySQL 连接成功)
- 没有 `Table 'mo.xxx' doesn't exist` (schema 都在)
- better-auth 没报 schema mismatch

## 10. 烟雾测试 (5 分钟内必须完成)

按顺序操作,任何一步失败立刻进入回滚:

- [ ] 浏览器打开首页,能加载
- [ ] 用一个老板账号登录,session 立即生效(说明 session 表迁过来了)
- [ ] `/overview` 页能看到统计数字,跟停服前一致
- [ ] `/customers` 页能看到客户列表,余额对得上
- [ ] 给一个客户充值 ¥1,确认 `customerBalanceTxn` 里多了一条 DEPOSIT
- [ ] 创建一个测试订单 → 完成 → 结算 → 走完流程
- [ ] 取消一个订单(挑测试客户),确认 prepayUsedCents 退回到 customer.balanceCents

## 11. 回滚预案 (烟雾测试任何一步失败时)

```bash
# 停新版
pm2 stop mo

# 切回旧代码
git checkout <pre-migration-tag>
npm ci --omit=dev
npm run build

# 改 .env 把 DATABASE_URL 恢复成 file:./data/mo.db
# 把备份文件还原回 data/mo.db
cp data/mo.db.bak.<timestamp> data/mo.db

# 启动旧版
pm2 start mo
```

回滚后客户立即可用旧版,数据是停服那一刻的状态(因为 MySQL 上的操作只有烟雾测试,影响小)。

## 12. 24h 观察期

- [ ] 保留 `data/mo.db.bak.<timestamp>` 备份 至少 7 天
- [ ] 保留旧版镜像/构建产物 至少 24 小时
- [ ] 设置 MySQL 的每日备份:`mysqldump -u mo_user -p mo > backups/mo-$(date +%F).sql`

## 13. 清理(确认 7 天稳定运行后)

- [ ] 从仓库移除 `better-sqlite3` devDep (可选,留着以后用得上)
- [ ] 归档/删除 `scripts/migrate-customer-prepay.ts`, `migrate-partner-customer-invite.ts`, `migrate-qr-security.ts` — SQLite 时代的历史增量脚本,不再适用
- [ ] 归档 `scripts/migrate-sqlite-to-mysql.ts` — 一次性工具,跑过就不再用,可以保留在仓库作为历史

---

## 附录:常见坑

**1. 表名 `order` 引发的 SQL 错**

`order` 是 MySQL 保留字。Drizzle ORM 自动用反引号包,正常。但如果你手写 SQL 查这张表,必须写 `` `order` ``。

**2. 时区**

业务里 `TZ=Asia/Shanghai`。`src/db/index.ts` 的 pool 配了 `timezone: '+08:00'`。如果 MySQL server 时区不是 `+08:00`,可能引发 datetime 偏移 8 小时。检查 `SELECT NOW();` 应该是中国时间。

**3. better-auth session 跨库迁移**

迁过来的 `session.token` 跟 `BETTER_AUTH_SECRET` 绑定。**secret 千万不能改**,否则所有用户被踢下线。

**4. emoji / 生僻字写不进去**

确认建库时 `CHARACTER SET utf8mb4`,确认连接串带 `?charset=utf8mb4`。

**5. AUTO_INCREMENT 不需要**

业务里所有 id 都是应用层生成的 string (nanoid),不依赖数据库自增。所以不用关心 AUTO_INCREMENT。
