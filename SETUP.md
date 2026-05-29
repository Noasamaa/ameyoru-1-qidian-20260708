# 起点电竞 — 陪玩店管理系统

## 技术栈

| | |
|---|---|
| 框架 | Next.js 15 (App Router) + React 19 + TypeScript |
| 服务端 | Server Actions(无 REST API) |
| 样式 | Tailwind CSS v4 + shadcn/ui (New York style) |
| 字体 | Geist Sans / Geist Mono + PingFang SC (中文) |
| ORM | Drizzle |
| 数据库 | SQLite (better-sqlite3,同步驱动) |
| 认证 | Better Auth (username 插件) |
| 校验 | Zod |
| 通知 | Sonner (Toast) |

## 快速开始

```bash
git clone https://github.com/Noasamaa/ameyoru.git
cd ameyoru
npm install
```

### 配置环境变量

创建 `.env` 文件:

```env
# 必填:session 签名密钥
BETTER_AUTH_SECRET=<运行 openssl rand -base64 32 生成>

# 老板初始密码(仅首次 seed 使用,登录后强制改密)
BOSS_INIT_PASSWORD=admin123

# 企业微信推送(可选,不配不影响功能)
# WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
```

### 初始化数据库

```bash
mkdir -p data
npm run db:push    # schema → SQLite
npm run db:seed    # 创建老板账号 boss / admin123
```

### 启动

```bash
npm run dev        # http://localhost:3000
```

用 `boss` + 初始密码登录,首次会强制改密。

## 三种角色

| 角色 | 说明 | 权限 |
|---|---|---|
| **BOSS** (店主) | 全权限 | 管理员工/陪玩、派单/结算/撤销、删除店长、增加时长、看全部数据 |
| **STAFF** (店长) | 日常运营 | 派单/结算、管理陪玩(创建/停用/重置密码)、创建陪玩邀请链接。**不能管理其他店长** |
| **PLAYER** (陪玩) | 接单赚钱 | 报单(单价锁定)、看自己的订单/排行/打款明细 |

## 核心功能

### 订单生命周期

```
创建 → 进行中(IN_PROGRESS)
       → 标记完成 → 已完成 + 未结(COMPLETED + UNSETTLED)
                     → 打款标记 → 已完成 + 已结(COMPLETED + SETTLED)
       → 取消(仅管理者) → 已取消(CANCELED) + 纠纷信息
```

### 陪玩报单

陪玩从主页右上角"报单"进入:填客户名 + 开始/结束时间 → 提交。
单价由老板设定,陪玩不可修改(UI 锁定 + 服务端强制 `defaultRateCents`)。
提交后订单为"进行中",管理者标记完成后进入"待结算"。

### 三段定价

| 项 | 公式 | 说明 |
|---|---|---|
| 原价 | 单价 × 时长 | 客户标价 |
| 优惠 | 管理者填(默认 0) | 陪玩不可填 |
| 实付 | 原价 − 优惠 | 客户实际付 |

**陪玩按原价结算**(不受打折影响)。店铺毛利 = 实付 − 应得(可负 = 促销亏损)。

### 增加时长(老板送单)

管理者打开待结算订单 → 点击"增加时长"→ 填小时/分钟 + 备注(如"老板送单")→ 系统自动重算金额。

### 纠纷处理(取消订单)

取消时必须填:责任方(陪玩/客户/店里/其他)+ 取消说明 + 陪玩补偿金额。
补偿 > 0 的取消单进"待结算"队列,老板需打款;补偿 = 0 直接结清。

### 排行榜

- **按总时长排序**(一单 30 小时 > 30 单 1 小时)
- 同时长按流水排,再按完成时间排(更快完成的靠前)
- 支持今日 / 本周 / 本月,20 人/页翻页
- 陪玩端:只能看自己的收益,看不到其他人赚多少
- 主页不在 TOP 5 时,底部追加显示自己位置

### 客户管理

- 自动生成 7 位会员号
- ≥ 10 单自动标 VIP,≥ 2 单标"回头客"
- 微信号仅管理者可见(陪玩端隐藏)
- 支持预存充值 + 下单抵扣

### 陪玩邀请链接

员工页可创建邀请链接(选分类 + 默认单价)→ 发给陪玩 → 陪玩打开链接自助注册(设用户名/密码/上传收款码)。
后台可看到所有邀请链接的使用情况,用完可删除。

### 企业微信推送(可选)

`.env` 配 `WECOM_WEBHOOK_URL` 后自动推送:新派单/报单、订单完成、订单结算、订单取消。

## 移动端适配

- 导航栏:sm 以下用汉堡菜单,显示当前页名
- 客户列表:小屏操作按钮自动换行
- 订单详情:收款码在可滚动区,打款按钮固定底部
- Logo:显示"起点"

## 时区

`npm run dev` / `npm run start` / `npm run build` 均自动设置 `TZ=Asia/Shanghai`。

生产部署如果不走 `npm start`(如 Docker / PM2),需要自行设置环境变量 `TZ=Asia/Shanghai`,否则"今日/本周/本月"统计会按 UTC 切日。

订单表单的时间已走客户端 → UTC ISO 链路,不依赖服务端时区。

## 常用命令

```bash
npm run dev              # 开发(TZ=Asia/Shanghai)
npm run build            # 构建(TZ=Asia/Shanghai)
npm run start            # 生产(TZ=Asia/Shanghai)
npm run lint             # ESLint
npm run db:push          # schema → SQLite(开发用)
npm run db:generate      # 生成 migration SQL(生产用)
npm run db:studio        # Drizzle Studio 看数据
npm run db:seed          # 创建老板账号(已存在则跳过)
npm run test:calc        # 验证金额/时长算法
```

### 测试排行榜(可选)

```bash
# 生成 10 个测试陪玩 + 随机订单
TZ=Asia/Shanghai npx tsx scripts/seed-test-leaderboard.ts

# 生成 200 个(压测大规模排行)
TZ=Asia/Shanghai npx tsx scripts/seed-test-leaderboard.ts 200

# 清除测试数据
TZ=Asia/Shanghai npx tsx scripts/seed-test-leaderboard.ts --clean
```

## 端到端验证

1. `boss` 登录 → 强制改密 → 总览
2. 员工页 → 新建店长 `lily` → 复制初始密码
3. 陪玩页 → 新建陪玩 `tutu` / 默认单价 40 → 复制密码(或创建邀请链接让陪玩自助注册)
4. `lily` 登录 → 派单:选图图,客户"叶子",10:29→12:49,单价 40 → 提交
5. `tutu` 登录 → 主页右上角"报单",填客户名 + 起止时间 → 提交 → 管理端标记完成
6. `boss` 登录 → 订单 → 待结算 → 点开 → 微信付 → 已结
7. 排行榜:按时长排序,Top 3 金/银/铜卡片
8. 客户页:叶子显示会员号 + 累计消费

## 常见问题

**Tailwind classes 不生效**
检查 `postcss.config.mjs` 用的是 `@tailwindcss/postcss`(v4 变化)。

**Module not found: better-sqlite3**
native 模块需本机编译。Mac 装 Xcode CLT:`xcode-select --install`。

**BETTER_AUTH_SECRET is not set**
`.env` 没填或放错位置。Better Auth / Drizzle 默认读 `.env`,不是 `.env.local`。

**端口被占**
`PORT=3001 npm run dev`

**忘了老板密码**
`npm run db:seed` 不重置已有账号。删 `data/mo.db` 重新初始化(数据丢失),或用 `npm run db:studio` 改密码。

**时间偏了 8 小时(仅生产)**
见上方"时区"章节。

## 设计风格

- **配色**:浅色主体,主色 indigo-600,排行榜 amber 渐变,成功 emerald,警告 amber,危险 red
- **字体**:Geist Sans/Mono(英文/数字)+ PingFang SC(中文)
- **风格**:Linear 克制结构 + Dub.co 浅色 KPI + Twenty 圆角亲和
- **暗色模式**:CSS 变量已配,toggle `<html class="dark">` 即可
