package com.itcjj.campusmart.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.itcjj.campusmart.common.CacheKeys;
import com.itcjj.campusmart.common.CodeEnum;
import com.itcjj.campusmart.dto.ProductDTO;
import com.itcjj.campusmart.dto.ProductSearchDTO;
import com.itcjj.campusmart.dto.ProductUpdateDTO;
import com.itcjj.campusmart.entity.Order;
import com.itcjj.campusmart.entity.Product;
import com.itcjj.campusmart.enums.OrderStatus;
import com.itcjj.campusmart.exception.BizException;
import com.itcjj.campusmart.mapper.OrderMapper;
import com.itcjj.campusmart.mapper.ProductMapper;
import com.itcjj.campusmart.service.ProductService;
import com.itcjj.campusmart.util.UserContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import com.itcjj.campusmart.service.FileStorageService;
import tools.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.stream.Collectors;


@Slf4j
@Service
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductMapper productMapper;
    @Autowired
    private FileStorageService fileStorageService;
    @Autowired
    private StringRedisTemplate redisTemplate;   // 操作 Redis 的工具
    @Autowired
    private ObjectMapper objectMapper;           // 对象 ⇄ JSON 的转换器




    @Override
    public Long publish(ProductDTO dto) {
        // 1. DTO（入参袋子）→ Entity（表里的一行）
        Product product = new Product();
        product.setTitle(dto.getTitle());
        product.setDescription(dto.getDescription());
        product.setPrice(dto.getPrice());
        product.setConditionLevel(dto.getConditionLevel());
        product.setCategoryId(dto.getCategoryId());
        product.setImages(dto.getImages());


        // 2. ★★★ 卖家从 token 取，不信前端 —— 今天整节课就为这一行
        product.setSellerId(UserContext.get().getId());

        // 3. 刚发布就是在售，不让用户决定
        product.setStatus(1);

        // 4. 落库
        productMapper.insert(product);


        // 5. insert 之后 MP 会把自增 id 回填进 product 对象，这时才有值
        log.info("商品发布成功 -> sellerId={}, productId={}, title={}",
                product.getSellerId(), product.getId(), product.getTitle());
        return product.getId();
    }
    @Override
    public void update(ProductUpdateDTO dto) {
        Product old = productMapper.selectById(dto.getId());
        if (old == null) {
            throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);
        }
        if (!old.getSellerId().equals(UserContext.get().getId())) {
            throw new BizException(CodeEnum.NO_PERMISSION);
        }
        assertNotTrading(dto.getId());
        Product upd = new Product();
        upd.setTitle(dto.getTitle());
        upd.setDescription(dto.getDescription());
        upd.setPrice(dto.getPrice());
        upd.setConditionLevel(dto.getConditionLevel());
        upd.setCategoryId(dto.getCategoryId());
        upd.setImages(dto.getImages());
// 注意：不 set 的字段不会被更新（MP 默认只更新非空字段）

        int rows = productMapper.update(upd, new LambdaUpdateWrapper<Product>()
                .eq(Product::getId, dto.getId())
                .eq(Product::getStatus, 1));        // 只有在售才可编辑
        if (rows == 0) { throw new BizException(CodeEnum.PRODUCT_STATUS_ERROR); }

        //删除缓存
        redisTemplate.delete(CacheKeys.PRODUCT_DETAIL_PREFIX + dto.getId());
        log.info("商品更新成功 -> 操作人={}, productId={}", UserContext.get().getId(), dto.getId());

    }
    @Override
    public void offline(Long id) {
        Product old = productMapper.selectById(id);
        if (old == null) {
            throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);
        }
        if (!old.getSellerId().equals(UserContext.get().getId())) {
            throw new BizException(CodeEnum.NO_PERMISSION);
        }
        assertNotTrading(id);
        int rows = productMapper.update(null, new LambdaUpdateWrapper<Product>()
                .eq(Product::getId, id)
                .eq(Product::getStatus, 1)          // 只有在售才能下架
                .set(Product::getStatus, 0));
        if (rows == 0) { throw new BizException(CodeEnum.PRODUCT_STATUS_ERROR); }
        //删除缓存
        redisTemplate.delete(CacheKeys.PRODUCT_DETAIL_PREFIX + id);
        log.info("商品下架成功 -> 操作人={}, productId={}", UserContext.get().getId(), id);
    }
    @Override
    public void delete(Long id) {
        Product old = productMapper.selectById(id);
        if (old == null) {
            throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);
        }
        if (!old.getSellerId().equals(UserContext.get().getId())) {
            throw new BizException(CodeEnum.NO_PERMISSION);
        }
        assertNotTrading(id);
        int rows = productMapper.delete(new LambdaUpdateWrapper<Product>()
                .eq(Product::getId, id)
                .in(Product::getStatus, 0, 1));     // 在售 / 卖家下架的才能删
        if (rows == 0) { throw new BizException(CodeEnum.PRODUCT_STATUS_ERROR); }

        //删除缓存
        redisTemplate.delete(CacheKeys.PRODUCT_DETAIL_PREFIX + id);
        log.info("商品删除成功 -> 操作人={}, productId={}", UserContext.get().getId(), id);
    }
    @Override// ProductServiceImpl
    public List<Product> listByCategory(Long categoryId) {
        return productMapper.selectList(
                new LambdaQueryWrapper<Product>()
                        .eq(Product::getCategoryId, categoryId)
                        .eq(Product::getStatus, 1)
                        .orderByDesc(Product::getCreateTime));
    }
    @Override
    public Page<Product> search(ProductSearchDTO dto) {
        Page<Product> page = new Page<>(dto.getPageNum(), dto.getPageSize());

        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<Product>()
                .eq(Product::getStatus, 1)                    // 只查在售
                .eq(dto.getCategoryId() != null, Product::getCategoryId, dto.getCategoryId())
                .ge(dto.getMinPrice() != null, Product::getPrice, dto.getMinPrice())
                .le(dto.getMaxPrice() != null, Product::getPrice, dto.getMaxPrice())
                .eq(dto.getConditionLevel() != null, Product::getConditionLevel, dto.getConditionLevel())
                // ... 其他条件，每个前面挂一个 boolean 开关
                .and(StringUtils.hasText(dto.getKeyword()), w -> w     // 关键字（或条件需括号包裹）
                        .like(Product::getTitle, dto.getKeyword())
                        .or()
                        .like(Product::getDescription, dto.getKeyword()));

// 排序（白名单）
        if ("price_asc".equals(dto.getSortBy())) {
            wrapper.orderByAsc(Product::getPrice);
        } else if ("price_desc".equals(dto.getSortBy())) {
            wrapper.orderByDesc(Product::getPrice);
        } else {
            wrapper.orderByDesc(Product::getCreateTime);     // 默认：最新在前
        }

        return productMapper.selectPage(page, wrapper);

    }
    @Override
    public List<String> uploadImages(List<MultipartFile> files) {
        //1，空校验
        if (files == null || files.isEmpty()) {
            throw new BizException(CodeEnum.FILE_EMPTY);
        }
        //2，数量检验
        if(files.size() > 9){
            throw new BizException(CodeEnum.TOO_MANY_IMAGES);
        }
        //3，逐个存
        List<String> urls= new ArrayList<>();
        for(MultipartFile file:files){
            urls.add(fileStorageService.save(file, "product"));
        }
        //4，日志
        log.info("商品图片上传成功 -> 操作人={}, 文件数量={}", UserContext.get().getId(), files.size());
        return urls;
    }


    @Override
    public Product getDetail(Long id) {
        // ---------- 第 0 步：记浏览历史（必须放在查缓存之前！） ----------
        recordHistory(id);

        // 拼出这个商品的缓存 key，例如 "product:detail:7"
        String cacheKey = CacheKeys.PRODUCT_DETAIL_PREFIX + id;

        // ---------- 第 1 步：先问 Redis，看有没有缓存 ----------
        String cached = redisTemplate.opsForValue().get(cacheKey);

        // 情况 A：拿到一段非空字符串 —— 是之前缓存下来的真数据（JSON）
        //         hasText = "不是 null，且去掉空白后还有内容"
        if (StringUtils.hasText(cached)) {
            log.info("商品详情命中缓存 -> productId={}", id);
            // JSON 字符串 → Product 对象。注意用 readValue，不是 convertValue
            return objectMapper.readValue(cached, Product.class);
        }

        // 情况 B：拿到了空串 —— 这是上次留下的"空值标记"，说明库里确实没有
        //         （能走到这里，cached 只可能是 ""，因为上面已经把 null 排除了）
        if (cached != null) {
            log.warn("商品详情被空值标记拦下，不查库 -> productId={}", id);
            throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);
        }

        // 情况 C：cached == null —— 从来没缓存过，第一次来 → 回源查数据库
        log.info("商品详情缓存未命中，回源查库 -> productId={}", id);
        Product product = productMapper.selectById(id);

        // ---------- 第 2 步：库里查到了 → 写缓存，再返回 ----------
        if (product != null) {
            redisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(product),   // Product → JSON 字符串
                    CacheKeys.PRODUCT_DETAIL_TTL);                                 // 30 分钟过期
            return product;
        }

        // ---------- 第 3 步：库里也没有 → 写"空值标记"，防穿透 ----------
        redisTemplate.opsForValue().set(cacheKey, CacheKeys.NULL_MARK, CacheKeys.PRODUCT_DETAIL_NULL_TTL);  // 空串，只存 1 分钟
        throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);
    }
    /** 记一次浏览：商品 id 当 member，当前时间戳当分数 */
    private void recordHistory(Long productId) {
        Long userId = UserContext.get().getId();
        String key = CacheKeys.HISTORY_PREFIX + userId;

        // ① 写进去（同一个商品再来看，只会更新分数，不会多出一条）
        redisTemplate.opsForZSet().add(key, String.valueOf(productId), System.currentTimeMillis());

        // ② 只保留最近 N 条
        redisTemplate.opsForZSet().removeRange(key, 0, -(CacheKeys.PRODUCT_HISTORY_MAX + 1));
    }

    @Override
    public List<Product> getHistory() {
        Long userId = UserContext.get().getId();
        String key = CacheKeys.HISTORY_PREFIX + userId;

        // ① 取最近 N 个商品 id（倒序 = 时间从新到旧）
        Set<String> idSet = redisTemplate.opsForZSet().reverseRange(key, 0, CacheKeys.PRODUCT_HISTORY_MAX - 1);
        if (idSet == null || idSet.isEmpty()) {
            return Collections.emptyList();
        }

        // ② 转成 Long —— reverseRange 返回的是「有序 Set」，顺序会保留下来
        List<Long> ids = idSet.stream().map(Long::valueOf).collect(Collectors.toList());

        // ③ 批量查商品
        Map<Long, Product> map = productMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        // ④ 按 ids 的顺序重排（selectBatchIds 不保证返回顺序！）
        return ids.stream()
                .map(map::get)
                .filter(Objects::nonNull)         // 商品可能已被删掉
                .collect(Collectors.toList());
    }

    @Autowired
    private OrderMapper orderMapper;
    // ProductServiceImpl 里加私有方法
    private void assertNotTrading(Long productId) {
        Long count = orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getProductId, productId)
                .in(Order::getStatus,
                        OrderStatus.PENDING_PAYMENT.getCode(),
                        OrderStatus.PAID.getCode(),
                        OrderStatus.SHIPPED.getCode()));
        if (count != null && count > 0) {
            throw new BizException(CodeEnum.PRODUCT_IN_TRADE);
        }
    }

    @Override
    public Page<Product> listMine(Integer status, Integer pageNum, Integer pageSize) {
        Long sellerId = UserContext.get().getId();
        //status可以筛选，分页pageNum默认1，pagesize默认10，上限50
        pageNum = (pageNum == null || pageNum < 1) ? 1 : pageNum;
        pageSize = pageSize == null ? 10 : Math.min(pageSize, 50);
        //排序
        Page<Product> page = new Page<>(pageNum, pageSize);
        return productMapper.selectPage(page, new LambdaQueryWrapper<Product>()
                .eq(Product::getSellerId, sellerId)
                .eq(status != null, Product::getStatus, status)
                .orderByDesc(Product::getCreateTime, Product::getId));
    }

    @Override
    public void relist(Long id) {
        Product old = productMapper.selectById(id);
        if (old == null) {
            throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);
        }
        if (!old.getSellerId().equals(UserContext.get().getId())) {
            throw new BizException(CodeEnum.NO_PERMISSION);      // 只能救自己的
        }

        // 只有「卖家下架(0)」能回到在售；平台下架(3) / 已售出(2) / 已在售(1) 都进不来
        int rows = productMapper.update(null, new LambdaUpdateWrapper<Product>()
                .eq(Product::getId, id)
                .eq(Product::getStatus, 0)
                .set(Product::getStatus, 1));

        if (rows == 0) {
            throw new BizException(CodeEnum.PRODUCT_RELIST_NOT_ALLOWED);   // 2013
        }
        redisTemplate.delete(CacheKeys.PRODUCT_DETAIL_PREFIX + id);
        log.info("商品重新上架 -> productId={}", id);
    }



}
