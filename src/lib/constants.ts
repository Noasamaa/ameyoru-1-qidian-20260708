/**
 * 全店统一的抽成时薪(分/小时)。
 * 5 元/小时 = 500 分/小时。
 * 报单时会把这个值快照写入 Order.commissionPerHourCents,
 * 这样以后改全店设置时不会回溯影响历史订单。
 */
export const DEFAULT_COMMISSION_PER_HOUR_CENTS = 500;

/** 陪玩默认单价(分/小时),老板创建陪玩时若不填使用。 */
export const DEFAULT_PLAYER_RATE_CENTS = 4000;

/** 内部"伪邮箱"域名,因为 Better Auth 要求 email 但我们用 username 登录 */
export const INTERNAL_EMAIL_DOMAIN = "mo.local";

/** 老板账号的默认用户名(seed 创建) */
export const BOSS_USERNAME = "boss";
