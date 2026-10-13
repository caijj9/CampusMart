package com.itcjj.campusmart.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.math.BigDecimal;


import java.time.LocalDateTime;


@Data
@TableName("product")
public class Product {
    @TableId(type = IdType.AUTO)   // ← User 有这行
    private Long id;
    @Version
    private Integer version;
    // 平台下架：卖家下架是 status=0，平台下架是 status=3 —— 这两列只在平台下架时有值
    private String offlineReason;
    private LocalDateTime offlineTime;
    private Long sellerId;
    private Long categoryId;
    private String title;
    private String description;
    private BigDecimal price;
    private Integer status;
    private Integer conditionLevel;
    private String images;
    @TableField(fill = FieldFill.INSERT)
    //字段自动填
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    private Integer deleted;
}
