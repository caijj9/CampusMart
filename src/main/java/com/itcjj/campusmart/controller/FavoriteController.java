package com.itcjj.campusmart.controller;

import com.itcjj.campusmart.common.Result;
import com.itcjj.campusmart.service.FavoriteService;
import com.itcjj.campusmart.vo.ProductListVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/favorite")

public class FavoriteController {
    @Autowired
    private FavoriteService favoriteService;

    @PostMapping("/{productId}")
    public Result<String> addFavorite(@PathVariable Long productId) {
        favoriteService.addFavorite(productId);
        return Result.success("添加收藏成功");
    }
    @DeleteMapping("/{productId}")
    public Result<String> removeFavorite(@PathVariable Long productId) {
        favoriteService.removeFavorite(productId);
        return Result.success("取消收藏成功");
    }
    @GetMapping("/list")
    public Result<List<ProductListVO>> list() {
        return Result.success(favoriteService.list());
    }

}
