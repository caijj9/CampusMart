-- ============================================================
-- CampusMart · 数据库初始化脚本
--
-- 执行方式（二选一）：
--   A. MySQL Workbench / DataGrip：打开本文件 → 全选 → 执行
--   B. 命令行：mysql -u root -p < init.sql
--
-- ⚠️ 本文件是「影子文件」：以后任何 ALTER TABLE 都要同步改这里，
--    否则别人克隆项目后跑不起来。
-- ============================================================

-- ---------- 1. 建库 ----------
-- utf8mb4 是 MySQL 里完整的 UTF-8，中文、emoji 都不会乱码
CREATE DATABASE IF NOT EXISTS campusmart
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_general_ci;

USE campusmart;

-- ---------- 2. 用户表 ----------
CREATE TABLE IF NOT EXISTS `user`
(
    `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    `username`      VARCHAR(50)  NOT NULL COMMENT '用户名',
    `password`      VARCHAR(100) NOT NULL COMMENT '密码（BCrypt 加密后的）',
    `nickname`      VARCHAR(50)  DEFAULT NULL COMMENT '昵称',
    `phone`         VARCHAR(20)  DEFAULT NULL COMMENT '手机号',
    `avatar`        VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
    `campus`        VARCHAR(50)  DEFAULT NULL COMMENT '校区',
    `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：1正常 0禁用',
    `role`          VARCHAR(20)  NOT NULL DEFAULT 'USER' COMMENT '角色：USER普通用户 ADMIN管理员',
    `token_version` INT          NOT NULL DEFAULT 0 COMMENT 'token 版本号：改密码时 +1，让旧 token 失效',

    `create_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted`       TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删 1已删',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT = '用户表';

-- ---------- 3. 商品分类表 ----------
-- 分类是给管理员维护的「字典表」：数量少、改动少、被商品表引用
CREATE TABLE IF NOT EXISTS `category`
(
    `id`          BIGINT      NOT NULL AUTO_INCREMENT COMMENT '分类ID',
    `name`        VARCHAR(50) NOT NULL COMMENT '分类名称',
    `sort`        INT         NOT NULL DEFAULT 0 COMMENT '排序号：数字越小越靠前',

    `create_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted`     TINYINT     NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删 1已删',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT = '商品分类表';

-- ---------- 4. 商品表 ----------
CREATE TABLE IF NOT EXISTS `product`
(
    `id`              BIGINT        NOT NULL AUTO_INCREMENT COMMENT '商品ID',
    `title`           VARCHAR(100)  NOT NULL COMMENT '标题',
    `description`     TEXT          DEFAULT NULL COMMENT '商品描述',
    `price`           DECIMAL(10,2) NOT NULL COMMENT '价格（元）：金额绝不用 float/double',
    `condition_level` TINYINT       NOT NULL DEFAULT 1 COMMENT '成色：1全新 2几乎全新 3轻微使用痕迹 4明显使用痕迹',
    `category_id`     BIGINT        NOT NULL COMMENT '分类ID → category.id',
    `seller_id`       BIGINT        NOT NULL COMMENT '卖家ID → user.id',
    `status`          TINYINT       NOT NULL DEFAULT 1 COMMENT '状态：1在售 2已售出 0已下架',

    `create_time`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted`         TINYINT       NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删 1已删',
    `images`          VARCHAR(1000) COMMENT '图片URL，逗号分隔，最多9张',
    `version`         INT           NOT NULL DEFAULT 0 COMMENT '乐观锁版本号：下单时防止超卖',

PRIMARY KEY (`id`),
    -- 「你打算用它当查询条件，就给它建索引」：按卖家查「我的商品」、按分类筛选商品
    KEY `idx_seller_id` (`seller_id`),
    KEY `idx_category_id` (`category_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT = '商品表';

-- ---------- 5. 分类初始数据 ----------
-- INSERT IGNORE：靠 uk_name 去重，本脚本重复执行不会插出重复数据
INSERT IGNORE INTO `category` (`name`, `sort`)
VALUES ('数码电子', 1),
       ('图书教材', 2),
       ('生活用品', 3),
       ('运动户外', 4),
       ('服饰鞋包', 5),
       ('其他', 99);

-- ---------- 6. 确认建好了 ----------
SHOW TABLES;
DESC `user`;
DESC `category`;
DESC `product`;
SELECT * FROM `category` ORDER BY `sort`;

USE campusmart;

-- 订单表：一单一件商品
-- 校园二手每件都是孤品（一单一品），所以**不需要**单独的订单明细表 ——
-- 把商品快照直接内联在订单上：少一张表、少一次 join。
CREATE TABLE IF NOT EXISTS `orders`
(
    `id`             BIGINT        NOT NULL AUTO_INCREMENT COMMENT '订单ID',
    `order_no`       VARCHAR(32)   NOT NULL COMMENT '订单号（给用户看的），唯一',
    `buyer_id`       BIGINT        NOT NULL COMMENT '买家ID → user.id',
    `seller_id`      BIGINT        NOT NULL COMMENT '下单时的卖家ID → user.id',
    `product_id`     BIGINT        NOT NULL COMMENT '商品ID → product.id',

    -- ↓↓↓ 下单时的商品快照：订单是凭证，商品之后改价/改名/删图都不影响历史订单
    `product_title`  VARCHAR(100)  NOT NULL COMMENT '下单时的商品标题（快照）',
    `product_images` VARCHAR(1000) DEFAULT NULL COMMENT '下单时的商品图片（快照）',

    `amount`         DECIMAL(10,2) NOT NULL COMMENT '订单金额 = 下单时的商品价格（快照）',
    `status`         TINYINT       NOT NULL DEFAULT 0
        COMMENT '0待付款 1已付款 2已发货 3已完成 4已取消',

    `create_time`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted`        TINYINT       NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删 1已删',
    KEY `idx_product_id` (`product_id`),


    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    -- 「我买到的」按 buyer_id 查；「我卖出的」按 seller_id 查
    KEY `idx_buyer_id` (`buyer_id`),
    KEY `idx_seller_id` (`seller_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
    COMMENT = '订单表（一单一品，商品快照内联）';


-- 检查建表结果
SHOW TABLES;
DESC `orders`;
CREATE TABLE IF NOT EXISTS `favorite`
(
    `id`          BIGINT   NOT NULL AUTO_INCREMENT COMMENT '收藏ID',
    `user_id`     BIGINT   NOT NULL COMMENT '用户ID → user.id',
    `product_id`  BIGINT   NOT NULL COMMENT '商品ID → product.id',

    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_product` (`user_id`, `product_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
    COMMENT = '商品收藏表';

-- 交易评价表（买家评卖家，一个订单只能评一次）
-- ⚠️ 刻意不加 deleted 列：本版没有"删除评价"这个操作；
--    且逻辑删除会与 uk_order_id 冲突（软删的记录仍占用唯一键，重插会报错）
CREATE TABLE IF NOT EXISTS `review`
(
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '评价ID',
    `order_id`    BIGINT       NOT NULL COMMENT '订单ID -> orders.id',
    `buyer_id`    BIGINT       NOT NULL COMMENT '评价人（买家）-> user.id',
    `seller_id`   BIGINT       NOT NULL COMMENT '被评人（卖家）-> user.id',
    `rating`      TINYINT      NOT NULL COMMENT '评分 1~5',
    `content`     VARCHAR(500) DEFAULT NULL COMMENT '评价内容，可空',

    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_id` (`order_id`)
        COMMENT '一个订单只能评价一次（数据库兜底，防并发重复）',
    KEY `idx_seller_id` (`seller_id`)
        COMMENT 'D6 按卖家查评价列表 / 算平均分'
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
    COMMENT = '交易评价表（买家评卖家）';
