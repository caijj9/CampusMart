package com.itcjj.campusmart.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewDTO {

    @Size(max = 500, message = "评价内容长度不能超过 500 个字符")
    private String content;

    @NotNull(message = "评分不能为空")
    @Min(value = 1, message = "评分必须在 1 到 5 之间")
    @Max(value = 5, message = "评分必须在 1 到 5 之间")
    private Integer rating;
}
