package com.itcjj.campusmart.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.itcjj.campusmart.entity.Review;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;

@Mapper
public interface ReviewMapper extends BaseMapper<Review> {
    @Select("SELECT ROUND(AVG(rating), 2) FROM review WHERE seller_id = #{sellerId}")
    BigDecimal selectAvgRating(@Param("sellerId") Long sellerId);


}
