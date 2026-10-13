package com.itcjj.campusmart.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.itcjj.campusmart.dto.ProductDTO;
import com.itcjj.campusmart.dto.ProductSearchDTO;
import com.itcjj.campusmart.dto.ProductUpdateDTO;
import com.itcjj.campusmart.vo.ProductAdminVO;
import com.itcjj.campusmart.vo.ProductDetailVO;
import com.itcjj.campusmart.vo.ProductListVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProductService {
    Long publish(ProductDTO dto);
    void update(ProductUpdateDTO dto);

    void offline(Long id);

    void delete(Long id);

    List<ProductListVO> listByCategory(Long categoryId);

    Page<ProductListVO> search(ProductSearchDTO dto);

    List<String> uploadImages(List<MultipartFile> files);

    ProductDetailVO getDetail(Long id);

    List<ProductListVO> getHistory();

    Page<ProductListVO> listMine(Integer status, Integer pageNum, Integer pageSize);

    /** 管理端商品查询：不限制状态（0/1/2/3 全查），可按 status / keyword / categoryId 筛选 */
    Page<ProductAdminVO> adminSearch(Integer status, String keyword, Long categoryId,
                                     Integer pageNum, Integer pageSize);

    void relist(Long id);

    /** 管理员强制下架：只允许 status ∈ (0,1)，拒绝已售出(2)/已平台下架(3)/交易中；记录原因 */
    void offlineByAdmin(Long id, String reason);

}

