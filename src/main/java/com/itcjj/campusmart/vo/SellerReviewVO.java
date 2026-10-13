package com.itcjj.campusmart.vo;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SellerReviewVO {
    private Page<ReviewVO> page;
    private BigDecimal avgRating;     // 无评价 = null
    private Long reviewCount;
}
