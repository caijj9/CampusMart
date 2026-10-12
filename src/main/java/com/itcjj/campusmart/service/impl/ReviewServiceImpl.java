package com.itcjj.campusmart.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itcjj.campusmart.common.CodeEnum;
import com.itcjj.campusmart.dto.ReviewDTO;
import com.itcjj.campusmart.entity.Order;
import com.itcjj.campusmart.entity.Review;
import com.itcjj.campusmart.enums.OrderStatus;
import com.itcjj.campusmart.exception.BizException;
import com.itcjj.campusmart.mapper.OrderMapper;
import com.itcjj.campusmart.mapper.ReviewMapper;
import com.itcjj.campusmart.service.ReviewService;
import com.itcjj.campusmart.util.UserContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class ReviewServiceImpl implements ReviewService {

    @Autowired
    private OrderMapper orderMapper;
    @Autowired
    private ReviewMapper reviewMapper;

    @Override
    public void addReview(Long orderId, ReviewDTO reviewDTO) {
        // ① 查订单
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw new BizException(CodeEnum.ORDER_NOT_FOUND);
        }

        // ② 权限：只有买家能评（别人查你的单，先告诉他"没权限"，而不是泄露订单状态）
        Long uid = UserContext.get().getId();
        if (!uid.equals(order.getBuyerId())) {
            log.warn("非买家尝试评价 -> orderId={}, uid={}", orderId, uid);
            throw new BizException(CodeEnum.NO_PERMISSION);
        }

        // ③ 订单必须「已完成」
        if (order.getStatus() != OrderStatus.COMPLETED.getCode()) {
            throw new BizException(CodeEnum.ORDER_NOT_COMPLETED);
        }

        // ④ 先查有没有评过 —— 为了给友好提示（不是为了保护）
        Long count = reviewMapper.selectCount(new LambdaQueryWrapper<Review>()
                .eq(Review::getOrderId, orderId));
        if (count != null && count > 0) {
            throw new BizException(CodeEnum.ALREADY_REVIEWED);
        }

        // ⑤ 落库 —— buyerId / sellerId 全部从订单取，不信前端
        Review review = new Review();
        review.setOrderId(orderId);
        review.setBuyerId(order.getBuyerId());
        review.setSellerId(order.getSellerId());
        review.setRating(reviewDTO.getRating());
        review.setContent(reviewDTO.getContent());

        try {
            reviewMapper.insert(review);
        } catch (DuplicateKeyException e) {
            // 唯一约束兜住的那一下（并发重复）→ 转友好提示，别让它变成 500
            log.warn("并发重复评价，被唯一约束拦下 -> orderId={}", orderId);
            throw new BizException(CodeEnum.ALREADY_REVIEWED);
        }

        // ⑥ 不碰订单状态（评价与订单状态无关）
        log.info("评价提交成功 -> orderId={}, buyerId={}, sellerId={}, rating={}",
                orderId, review.getBuyerId(), review.getSellerId(), review.getRating());
    }
}
