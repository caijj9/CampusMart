package com.itcjj.campusmart.controller;

import com.itcjj.campusmart.common.Result;
import com.itcjj.campusmart.dto.ReviewDTO;
import com.itcjj.campusmart.service.ReviewService;
import com.itcjj.campusmart.vo.SellerReviewVO;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/review")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @PostMapping("/{orderId}")
    public Result<String> addReview(@PathVariable Long orderId,
                                    @Valid @RequestBody ReviewDTO reviewDTO) {
        reviewService.addReview(orderId, reviewDTO);
        return Result.success("评价成功");
    }
    @GetMapping("/seller/{sellerId}")
    public Result<SellerReviewVO> listBySeller(@PathVariable Long sellerId,
                                               @RequestParam(defaultValue = "1") Integer pageNum,
                                               @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(reviewService.listBySeller(sellerId, pageNum, pageSize));
    }

}
