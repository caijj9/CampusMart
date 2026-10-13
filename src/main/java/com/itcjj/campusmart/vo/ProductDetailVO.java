package com.itcjj.campusmart.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ProductDetailVO {
    private Long id;
    private Long sellerId;
    private Long categoryId;
    private String title;
    private String description;
    private BigDecimal price;
    private Integer status;
    private Integer conditionLevel;
    private String images;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    /** 平台下架原因（仅 status = 3 时有值，其余为 null） */
    private String offlineReason;

    /** 浏览次数（每次打开详情 +1，取自数据库的实时值，不走缓存） */
    private Integer viewCount;

    /** 卖家公开信息（单独一层缓存：user:brief:{sellerId}，TTL 60s） */
    private SellerBriefVO seller;
}
