package com.itcjj.campusmart.service;

import com.itcjj.campusmart.dto.ReviewDTO;

public interface ReviewService {
    void addReview(Long orderId,ReviewDTO reviewDTO);
}
