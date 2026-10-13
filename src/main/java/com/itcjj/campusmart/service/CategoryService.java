package com.itcjj.campusmart.service;

import com.itcjj.campusmart.vo.CategoryVO;

import java.util.List;

public interface CategoryService {
    //查出所有分类
    List<CategoryVO> listAll();
}
