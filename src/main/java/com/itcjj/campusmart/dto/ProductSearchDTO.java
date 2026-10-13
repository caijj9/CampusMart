package com.itcjj.campusmart.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductSearchDTO {

    @Size(max = 50, message = "关键字长度不能超过 50 个字符")
    private String keyword;

    private Long categoryId;
    private BigDecimal minPrice;	// 最小价格
    private BigDecimal maxPrice;	// 最大价格
    private Integer conditionLevel;

    // ⚠️ 这个注解只有在 Controller 上用 @Valid 才会生效（之前漏了 @Valid，所以形同虚设）
    @Min(value = 1, message = "页码不能小于 1")
    private Integer pageNum = 1;	// 默认 1

    // pageSize 不写上限注解：按约定「传 > 50 就截断为 50」，而不是报错（在 Service 里 Math.min）
    private Integer pageSize = 10;	// 默认 10

    private String sortBy;			// 白名单：price_asc / price_desc，其余走默认
}
