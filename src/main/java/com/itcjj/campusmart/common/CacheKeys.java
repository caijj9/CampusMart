package com.itcjj.campusmart.common;

import java.time.Duration;

/**
 * Redis key 与缓存时长的唯一出处
 *
 * ⚠️ 为什么必须集中：key 的拼法若有两个出处，
 * 「写的地方改了、删的地方忘了改」→ 缓存删不掉，而且【不报错】，只是静默失效。
 */
public final class CacheKeys {          // final：不允许被继承（它只是个常量容器）

    private CacheKeys() {}              // 私有构造器：不允许 new（防止有人 new 一个空的）

    // ---------- 商品详情缓存 ----------
    public static final String   PRODUCT_DETAIL_PREFIX   = "product:detail:";
    public static final Duration PRODUCT_DETAIL_TTL      = Duration.ofMinutes(30);
    public static final Duration PRODUCT_DETAIL_NULL_TTL = Duration.ofMinutes(1);
    public static final String   NULL_MARK               = "";

    // ---------- 订单幂等 Token ----------
    public static final String   ORDER_TOKEN_PREFIX = "order:token:";
    public static final Duration ORDER_TOKEN_TTL    = Duration.ofMinutes(5);

    // ---------- 浏览历史 ----------
    public static final String HISTORY_PREFIX = "history:";
    /** 最多保留多少条浏览记录 */
    public static final int    PRODUCT_HISTORY_MAX = 20;
    /** 超时阈值：15 分钟。⚠️ 测试时临时改成 1，测完改回来 */
    public static final int TIMEOUT_MINUTES = 15;
    /** 一次最多处理多少条 —— 防止积压时一口气全捞出来 */
    public static final int BATCH_LIMIT = 100;

    public static final String USER_BRIEF_PREFIX = "user:brief:";
    public static final Duration USER_BRIEF_TTL = Duration.ofSeconds(60);
}
