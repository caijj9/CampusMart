package com.itcjj.campusmart.service;

import com.itcjj.campusmart.dto.ReviewDTO;
import com.itcjj.campusmart.vo.SellerReviewVO;

public interface ReviewService {
    void addReview(Long orderId,ReviewDTO reviewDTO);

    SellerReviewVO listBySeller(Long sellerId, Integer pageNum, Integer pageSize);

}
