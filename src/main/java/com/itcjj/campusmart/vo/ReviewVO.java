package com.itcjj.campusmart.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ReviewVO {
    private Long id;
    private String content;
    private Integer rating;
    private LocalDateTime createTime;
}
