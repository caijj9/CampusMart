package com.itcjj.campusmart.vo;

import com.itcjj.campusmart.entity.Product;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 商品列表项（GET /product/search、/product/list、/product/history、/product/mine、/favorite/list）
 *
 * ⚠️ 不含 deleted / version —— 那是内部字段。
 * 字段与前端 src/types/product.ts 的 Product 类型一一对应。
 */
@Data
public class ProductListVO {
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

    /**
     * 实体 -> VO 的唯一出处
     *
     * 为什么做成静态工厂：这个转换在 ProductServiceImpl 和 FavoriteServiceImpl 里一共要用 5 次，
     * 11 个字段手抄 5 遍，漏一个就是「字段静默变成 null」这种查不出来的 bug。
     * 放这里的好处是：**加字段时只需要改这一处**。
     */
    public static ProductListVO from(Product p) {
        ProductListVO vo = new ProductListVO();
        vo.setId(p.getId());
        vo.setSellerId(p.getSellerId());
        vo.setCategoryId(p.getCategoryId());
        vo.setTitle(p.getTitle());
        vo.setDescription(p.getDescription());
        vo.setPrice(p.getPrice());
        vo.setStatus(p.getStatus());
        vo.setConditionLevel(p.getConditionLevel());
        vo.setImages(p.getImages());
        vo.setCreateTime(p.getCreateTime());
        vo.setUpdateTime(p.getUpdateTime());
        return vo;
    }
}
