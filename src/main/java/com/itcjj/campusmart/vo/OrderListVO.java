package com.itcjj.campusmart.vo;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// vo/OrderListVO.java —— 列表用，11 个字段，无联系方式
@Data
public class OrderListVO {
    private Long id;
    private String orderNo;
    private Long buyerId;
    private Long sellerId;
    private Long productId;
    private String productTitle;      // 下单时快照
    private String productImages;     // 下单时快照
    private BigDecimal amount;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
