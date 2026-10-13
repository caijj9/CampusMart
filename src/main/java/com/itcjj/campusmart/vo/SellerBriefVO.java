package com.itcjj.campusmart.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.function.LongFunction;

@Data
public class SellerBriefVO {
    private String nickname;
    private String avatar;
    private String campus;
    private BigDecimal avgRating;
    private Long reviewCount;
}
