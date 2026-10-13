package com.itcjj.campusmart.service;

import com.itcjj.campusmart.vo.ProductListVO;

import java.util.List;

public interface FavoriteService {

    /** 收藏商品 */
    void addFavorite(Long productId);

    /** 取消收藏 */
    void removeFavorite(Long productId);

    /** 我的收藏列表（按收藏时间倒序） */
    List<ProductListVO> list();
}

