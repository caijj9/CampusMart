package com.itcjj.campusmart.vo;

import lombok.Data;

/**
 * 分类列表项（GET /category/list）
 *
 * ⚠️ 不含 deleted / createTime / updateTime —— 前端只要「拿 id 和名字去填下拉框」。
 */
@Data
public class CategoryVO {
    private Long id;
    private String name;
    private Integer sort;
}
