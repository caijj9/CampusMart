package com.itcjj.campusmart.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 管理端商品查询返回体（GET /admin/product/search）
 *
 * ⚠️ 为什么不直接返回 Product 实体：
 *   ① 实体带 deleted / version 这类内部字段，不该出现在对外契约里
 *   ② 管理端比公共端多需要 offlineReason / offlineTime（下架原因与时间）
 */
@Data
public class ProductAdminVO {

    private Long id;
    private Long sellerId;
    private Long categoryId;
    private String title;
    private BigDecimal price;
    private Integer status;            // 0卖家下架 1在售 2已售出 3平台下架
    private Integer conditionLevel;
    private String images;
    private LocalDateTime createTime;

    // 平台下架信息（仅 status = 3 时有值）
    private String offlineReason;
    private LocalDateTime offlineTime;
}
