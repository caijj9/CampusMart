package com.itcjj.campusmart.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.itcjj.campusmart.entity.Product;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface ProductMapper extends BaseMapper<Product> {

    /**
     * 只读浏览量这一列
     *
     * ⚠️ 为什么要单独读：`product:detail:{id}` 缓存里的 view_count 是【旧的】，
     *    而我们每次详情请求都会把它 +1 —— 所以必须回源（主键查询，极快）才能拿到最新的数。
     *    这是「计数类数据天生和缓存冲突」的必然代价。
     */
    @Select("SELECT view_count FROM product WHERE id = #{id}")
    Integer selectViewCount(@Param("id") Long id);
}
