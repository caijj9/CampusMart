package com.itcjj.campusmart.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itcjj.campusmart.entity.Category;
import com.itcjj.campusmart.mapper.CategoryMapper;
import com.itcjj.campusmart.service.CategoryService;
import com.itcjj.campusmart.vo.CategoryVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class CategoryServiceImpl implements CategoryService {
    @Autowired
    private CategoryMapper categoryMapper;

    @Override
    public List<CategoryVO> listAll() {
        // 查询列表不打日志（会被翻页刷爆）
        List<Category> categories = categoryMapper.selectList(
                new LambdaQueryWrapper<Category>().orderByAsc(Category::getSort));

        // 实体 -> VO（只给 id / name / sort）
        List<CategoryVO> list = new ArrayList<>();
        for (Category c : categories) {
            CategoryVO vo = new CategoryVO();
            vo.setId(c.getId());
            vo.setName(c.getName());
            vo.setSort(c.getSort());
            list.add(vo);
        }
        return list;
    }

}
