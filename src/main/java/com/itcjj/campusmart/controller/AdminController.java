package com.itcjj.campusmart.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.itcjj.campusmart.annotation.RequireAdmin;
import com.itcjj.campusmart.common.Result;
import com.itcjj.campusmart.service.ProductService;
import com.itcjj.campusmart.service.UserService;
import com.itcjj.campusmart.vo.ProductAdminVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired
    private UserService userService;
    @Autowired
    private ProductService productService;

    // ---------- 用户管理 ----------

    @RequireAdmin
    @PutMapping("/user/disable/{id}")
    public Result<String> disableUser(@PathVariable Long id) {
        userService.disableUser(id);
        return Result.success("已禁用");
    }

    @RequireAdmin
    @PutMapping("/user/enable/{id}")
    public Result<String> enableUser(@PathVariable Long id) {
        userService.enableUser(id);
        return Result.success("已启用");
    }

    // ---------- 商品管理 ----------

    /**
     * 管理端商品查询
     *
     * 与公共 GET /product/search 的区别：这里「不写死状态」，
     * 能看到 0 卖家下架 / 1 在售 / 2 已售出 / 3 平台下架。
     */
    @RequireAdmin
    @GetMapping("/product/search")
    public Result<Page<ProductAdminVO>> searchProduct(@RequestParam(required = false) Integer status,
                                                      @RequestParam(required = false) String keyword,
                                                      @RequestParam(required = false) Long categoryId,
                                                      @RequestParam(defaultValue = "1") Integer pageNum,
                                                      @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(productService.adminSearch(status, keyword, categoryId, pageNum, pageSize));
    }
}
