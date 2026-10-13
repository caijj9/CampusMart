package com.itcjj.campusmart.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员强制下架商品的入参（PUT /admin/product/offline/{id}）
 */
@Data
public class ProductOfflineDTO {

    @NotBlank(message = "下架原因不能为空")
    @Size(max = 200, message = "下架原因不能超过 200 个字符")
    private String reason;
}
