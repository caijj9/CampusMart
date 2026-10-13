package com.itcjj.campusmart.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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
import com.itcjj.campusmart.vo.ReviewVO;
import com.itcjj.campusmart.vo.SellerReviewVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

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

    @Override
    public SellerReviewVO listBySeller(Long sellerId, Integer pageNum, Integer pageSize) {
        // ① 分页参数兜底（和 listBought 一致：默认 10 / 上限 50）
        pageNum = (pageNum == null || pageNum < 1) ? 1 : pageNum;
        pageSize = pageSize == null ? 10 : Math.min(pageSize, 50);

        // ② 查这一页的评价
        Page<Review> src = reviewMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Review>()
                        .eq(Review::getSellerId, sellerId)
                        .orderByDesc(Review::getCreateTime, Review::getId));

        // ③ 实体 -> VO，逐条搬（每轮都 new 一个新的）
        List<ReviewVO> records = new ArrayList<>();
        for (Review review : src.getRecords()) {
            ReviewVO vo = new ReviewVO();
            vo.setId(review.getId());
            vo.setContent(review.getContent());
            vo.setRating(review.getRating());
            vo.setCreateTime(review.getCreateTime());
            records.add(vo);
        }

        // ④ 分页信息一起搬（current/size/total 少一个前端页码就乱）
        Page<ReviewVO> voPage = new Page<>(src.getCurrent(), src.getSize(), src.getTotal());
        voPage.setRecords(records);

        // ⑤ 组装
        SellerReviewVO result = new SellerReviewVO();
        result.setPage(voPage);
        result.setReviewCount(src.getTotal());                          // 已经数过了，不再查 COUNT
        result.setAvgRating(reviewMapper.selectAvgRating(sellerId));    // 无评价就是 null
        return result;
    }



}
