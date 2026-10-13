package com.itcjj.campusmart.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.itcjj.campusmart.common.CodeEnum;
import com.itcjj.campusmart.entity.Favorite;
import com.itcjj.campusmart.entity.Product;
import com.itcjj.campusmart.exception.BizException;
import com.itcjj.campusmart.mapper.FavoriteMapper;
import com.itcjj.campusmart.mapper.ProductMapper;
import com.itcjj.campusmart.service.FavoriteService;
import com.itcjj.campusmart.util.UserContext;
import com.itcjj.campusmart.vo.ProductListVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service                                   // ⚠️ ① 必须有
public class FavoriteServiceImpl implements FavoriteService {

    @Autowired
    private FavoriteMapper favoriteMapper;  // ⚠️ ④ 必须有
    @Autowired
    private ProductMapper productMapper;

    @Override
    public void addFavorite(Long productId) {
        // ① 商品得存在（注意：返回的是 Product，不是 ProductDTO）
        Product product = productMapper.selectById(productId);
        if (product == null) {
            throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);   // ⚠️ ② 用 BizException
        }

        // ② 当前用户 —— 从 token 取，不信前端
        Long userId = UserContext.get().getId();

        // ③ 已经收藏过？给个友好提示（数据库唯一索引才是最后防线）
        Long count = favoriteMapper.selectCount(new LambdaQueryWrapper<Favorite>()
                .eq(Favorite::getUserId, userId)
                .eq(Favorite::getProductId, productId));
        if (count != null && count > 0) {
            throw new BizException(CodeEnum.ALREADY_FAVORITED);
        }

        // ④ 落库
        Favorite favorite = new Favorite();
        favorite.setUserId(userId);
        favorite.setProductId(productId);
        favoriteMapper.insert(favorite);

        log.info("收藏成功 -> userId={}, productId={}", userId, productId);
    }

    @Override
    public void removeFavorite(Long productId) {
        Long userId = UserContext.get().getId();

        // ⚠️ 删除必须带 userId 条件！否则能删掉别人的收藏（IDOR）
       favoriteMapper.delete(new LambdaQueryWrapper<Favorite>()
                .eq(Favorite::getUserId, userId)
                .eq(Favorite::getProductId, productId));

        log.info("取消收藏 -> userId={}, productId={}", userId, productId);
    }

    @Override
    public List<ProductListVO> list() {
        Long userId = UserContext.get().getId();

        // ① 先拿收藏记录（按时间倒序，这个顺序是有序的）
        List<Favorite> favorites = favoriteMapper.selectList(new LambdaQueryWrapper<Favorite>()
                .eq(Favorite::getUserId, userId)
                .orderByDesc(Favorite::getCreateTime));

        if (favorites.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> productIds = favorites.stream()
                .map(Favorite::getProductId)
                .collect(Collectors.toList());

        // ② 批量查商品
        Map<Long, Product> map = productMapper.selectBatchIds(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        // ③ ⚠️ 按 productIds 的顺序重新排列
        //    （selectBatchIds 用 IN 查询，MySQL 不保证返回顺序）
        //    ④ 实体 -> VO（唯一出处 ProductListVO.from）
        return productIds.stream()
                .map(map::get)
                .filter(Objects::nonNull)        // 商品可能已被删除，过滤掉
                .map(ProductListVO::from)
                .collect(Collectors.toList());
    }
}
