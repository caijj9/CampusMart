package com.itcjj.campusmart.vo;

import lombok.Data;
import org.springframework.cglib.core.Local;

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
    private SellerBriefVO seller;     // + import 同包的不用导，SellerBriefVO 就在 vo 包里


}
