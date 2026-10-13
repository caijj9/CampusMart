package com.itcjj.campusmart.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.itcjj.campusmart.dto.ProductDTO;
import com.itcjj.campusmart.dto.ProductSearchDTO;
import com.itcjj.campusmart.dto.ProductUpdateDTO;
import com.itcjj.campusmart.entity.Product;
import com.itcjj.campusmart.vo.ProductAdminVO;
import com.itcjj.campusmart.vo.ProductDetailVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProductService {
    Long publish(ProductDTO dto);
    void update(ProductUpdateDTO dto);

    void offline(Long id);

    void delete(Long id);

    List<Product> listByCategory(Long categoryId);

    Page<Product> search(ProductSearchDTO dto);

    List<String> uploadImages(List<MultipartFile> files);

    ProductDetailVO getDetail(Long id);

    List<Product> getHistory();

    Page<Product> listMine(Integer status, Integer pageNum, Integer pageSize);

    /** 管理端商品查询：不限制状态（0/1/2/3 全查），可按 status / keyword / categoryId 筛选 */
    Page<ProductAdminVO> adminSearch(Integer status, String keyword, Long categoryId,
                                     Integer pageNum, Integer pageSize);

    void relist(Long id);

}

