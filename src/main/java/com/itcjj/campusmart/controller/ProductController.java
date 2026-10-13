package com.itcjj.campusmart.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.itcjj.campusmart.common.Result;
import com.itcjj.campusmart.dto.ProductDTO;
import com.itcjj.campusmart.dto.ProductSearchDTO;
import com.itcjj.campusmart.dto.ProductUpdateDTO;
import com.itcjj.campusmart.service.ProductService;
import com.itcjj.campusmart.vo.ProductDetailVO;
import com.itcjj.campusmart.vo.ProductListVO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/product")
@Validated                 // ← 让方法参数上的 @Min / @Size 生效（否则注解写了也不会校验）
public class ProductController {
    @Autowired
    private ProductService productService;

    @PostMapping("/publish")
    public Result<Long> publish(@Valid @RequestBody ProductDTO dto) {
        Long id = productService.publish(dto);
        return Result.success(id);
    }

    @PutMapping("/update")
    public Result<Void> update(@Valid @RequestBody ProductUpdateDTO dto) {
        productService.update(dto);
        return Result.success(null);
    }

    @PutMapping("/offline/{id}")
    public Result<Void> offline(@PathVariable Long id) {
        productService.offline(id);
        return Result.success(null);
    }

    @DeleteMapping("/delete/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return Result.success(null);
    }

    // 按分类查在售商品
    @GetMapping("/list")
    public Result<List<ProductListVO>> list(@RequestParam Long categoryId) {
        return Result.success(productService.listByCategory(categoryId));
    }

    @GetMapping("/search")
    public Result<Page<ProductListVO>> search(@Valid ProductSearchDTO dto) {
        return Result.success(productService.search(dto));
    }

    //上传图片
    @PostMapping("/images")
    public Result<List<String>> uploadImages(@RequestParam(value = "files", required = false) List<MultipartFile> files) {
        return Result.success(productService.uploadImages(files));
    }

    // 商品详情（带 Redis 缓存 + 缓存分层）
    @GetMapping("/{id}")
    public Result<ProductDetailVO> detail(@PathVariable Long id) {
        return Result.success(productService.getDetail(id));
    }

    // 我的浏览历史（最近 20 条）
    @GetMapping("/history")
    public Result<List<ProductListVO>> history() {
        return Result.success(productService.getHistory());
    }

    @GetMapping("/mine")                     // 我发布的
    public Result<Page<ProductListVO>> mine(@RequestParam(required = false) Integer status,
                                            @RequestParam(defaultValue = "1")
                                            @Min(value = 1, message = "页码不能小于 1") Integer pageNum,
                                            @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(productService.listMine(status, pageNum, pageSize));
    }

    @PutMapping("/relist/{id}")              // 重新上架
    public Result<Void> relist(@PathVariable Long id) {
        productService.relist(id);
        return Result.success(null);
    }
}
