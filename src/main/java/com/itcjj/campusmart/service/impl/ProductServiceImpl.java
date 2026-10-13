package com.itcjj.campusmart.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.itcjj.campusmart.common.CacheKeys;
import com.itcjj.campusmart.common.CodeEnum;
import com.itcjj.campusmart.dto.ProductDTO;
import com.itcjj.campusmart.dto.ProductSearchDTO;
import com.itcjj.campusmart.dto.ProductUpdateDTO;
import com.itcjj.campusmart.entity.Category;
import com.itcjj.campusmart.entity.Order;
import com.itcjj.campusmart.entity.Product;
import com.itcjj.campusmart.entity.Review;
import com.itcjj.campusmart.entity.User;
import com.itcjj.campusmart.enums.OrderStatus;
import com.itcjj.campusmart.exception.BizException;
import com.itcjj.campusmart.mapper.CategoryMapper;
import com.itcjj.campusmart.mapper.OrderMapper;
import com.itcjj.campusmart.mapper.ProductMapper;
import com.itcjj.campusmart.mapper.ReviewMapper;
import com.itcjj.campusmart.mapper.UserMapper;
import com.itcjj.campusmart.service.ProductService;
import com.itcjj.campusmart.util.UserContext;
import com.itcjj.campusmart.vo.ProductAdminVO;
import com.itcjj.campusmart.vo.ProductDetailVO;
import com.itcjj.campusmart.vo.ProductListVO;
import com.itcjj.campusmart.vo.SellerBriefVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import com.itcjj.campusmart.service.FileStorageService;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
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
    @Autowired
    private CategoryMapper categoryMapper;       // 校验 categoryId 是否真实存在




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
    public List<ProductListVO> listByCategory(Long categoryId) {
        // 分类不存在 → 明确报错（而不是静默返回空列表，让调用方以为是"该分类没商品"）
        assertCategoryExists(categoryId);

        List<Product> products = productMapper.selectList(
                new LambdaQueryWrapper<Product>()
                        .eq(Product::getCategoryId, categoryId)
                        .eq(Product::getStatus, 1)
                        .orderByDesc(Product::getCreateTime, Product::getId));   // id 兜底，稳定排序

        return products.stream().map(ProductListVO::from).collect(Collectors.toList());
    }
    @Override
    public Page<ProductListVO> search(ProductSearchDTO dto) {
        // 分类不存在 → 明确报错（不再是"返回空列表"）
        if (dto.getCategoryId() != null) {
            assertCategoryExists(dto.getCategoryId());
        }

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

        // 排序（白名单）—— ⚠️ 每种排序最后都要带 id 兜底，否则同价商品顺序不定，翻页会重复/漏
        if ("price_asc".equals(dto.getSortBy())) {
            wrapper.orderByAsc(Product::getPrice).orderByAsc(Product::getId);
        } else if ("price_desc".equals(dto.getSortBy())) {
            wrapper.orderByDesc(Product::getPrice).orderByDesc(Product::getId);
        } else {
            wrapper.orderByDesc(Product::getCreateTime, Product::getId);  // 默认：最新在前
        }

        // 分页兜底（和其他列表接口统一）：
        //   页码 <1 已被 Controller 的 @Min(1) 拦成 400，这里只兜 null；
        //   每页上限 50 —— 超了【截断】不报错
        Integer pageNum = (dto.getPageNum() == null || dto.getPageNum() < 1) ? 1 : dto.getPageNum();
        Integer pageSize = (dto.getPageSize() == null) ? 10 : Math.min(dto.getPageSize(), 50);

        Page<Product> src = productMapper.selectPage(
                new Page<>(pageNum, pageSize), wrapper);

        // 实体 -> VO（唯一出处 ProductListVO.from，⚠️ 不把 deleted / version 漏给前端）
        Page<ProductListVO> voPage = new Page<>(src.getCurrent(), src.getSize(), src.getTotal());
        voPage.setRecords(src.getRecords().stream()
                .map(ProductListVO::from)
                .collect(Collectors.toList()));
        return voPage;
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


    @Autowired
    private UserMapper userMapper;
    @Autowired
    private ReviewMapper reviewMapper;
    @Override
    public ProductDetailVO getDetail(Long id) {
            String cacheKey = CacheKeys.PRODUCT_DETAIL_PREFIX + id;
            String cached = redisTemplate.opsForValue().get(cacheKey);

            // ⭐ 关键改动：三岔路不再各自 return，而是把结果统一交给 product 变量
            Product product;
            if (StringUtils.hasText(cached)) {
                product = objectMapper.readValue(cached, Product.class);          // 情况 A：命中
            } else if (cached != null) {
                throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);               // 情况 B：空值标记
            } else {
                product = productMapper.selectById(id);                          // 情况 C：回源
                if (product != null) {
                    redisTemplate.opsForValue().set(cacheKey,
                            objectMapper.writeValueAsString(product), CacheKeys.PRODUCT_DETAIL_TTL);
                } else {
                    redisTemplate.opsForValue().set(cacheKey, CacheKeys.NULL_MARK,
                            CacheKeys.PRODUCT_DETAIL_NULL_TTL);
                    throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);
                }
            }

            // ===== 到这里 product 一定有了（没有的话上面已经 throw 出去了）=====
            // 第 0 步：记浏览历史
            // ⚠️ 必须放在「确认商品存在」之后：否则传一个不存在的商品 id，也会被记进浏览历史
            //    （能这么搬，是因为三分支已经合并成单出口，不再有早 return 挡住下面的代码）
            recordHistory(id);

            // 第 ⓪ 步：浏览量原子 +1
            // ⚠️ 必须让【数据库自己加】：`view_count = view_count + 1` 写在 SQL 里，
            //    绝不能用「查出来 +1 再写回」—— 并发下两个请求会都读到旧值，只加一次。
            productMapper.update(null, new LambdaUpdateWrapper<Product>()
                    .eq(Product::getId, id)
                    .setSql("view_count = view_count + 1"));

            // 第 ③ 步：卖家简况（独立 60 秒缓存）
            String briefKey = CacheKeys.USER_BRIEF_PREFIX + product.getSellerId();
            String briefJson = redisTemplate.opsForValue().get(briefKey);

            SellerBriefVO seller;
            if (StringUtils.hasText(briefJson)) {
                seller = objectMapper.readValue(briefJson, SellerBriefVO.class);
            } else {
                User u = userMapper.selectById(product.getSellerId());
                seller = new SellerBriefVO();
                if (u != null) {                                  // ⚠️ 判空，别直接 .getNickname()
                    seller.setNickname(u.getNickname());
                    seller.setAvatar(u.getAvatar());
                    seller.setCampus(u.getCampus());
                }
                seller.setAvgRating(reviewMapper.selectAvgRating(product.getSellerId()));   // 无评价 = null
                seller.setReviewCount(reviewMapper.selectCount(
                        new LambdaQueryWrapper<Review>().eq(Review::getSellerId, product.getSellerId())));

                redisTemplate.opsForValue().set(briefKey,
                        objectMapper.writeValueAsString(seller), CacheKeys.USER_BRIEF_TTL);
            }

            // 第 ④ 步：逐字段搬进 VO
            ProductDetailVO vo = new ProductDetailVO();
            vo.setId(product.getId());
            vo.setSellerId(product.getSellerId());
            vo.setCategoryId(product.getCategoryId());
            vo.setTitle(product.getTitle());
            vo.setDescription(product.getDescription());
            vo.setPrice(product.getPrice());
            vo.setStatus(product.getStatus());
            vo.setConditionLevel(product.getConditionLevel());
            vo.setImages(product.getImages());
            vo.setCreateTime(product.getCreateTime());
            vo.setUpdateTime(product.getUpdateTime());
            vo.setOfflineReason(product.getOfflineReason());   // 仅 status=3 有值
            // 浏览量：必须回源读 —— 缓存里的 product 是旧的，刚才那次 +1 不在里面
            vo.setViewCount(productMapper.selectViewCount(id));
            vo.setSeller(seller);
            return vo;

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
    public List<ProductListVO> getHistory() {
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
        //    ⑤ 实体 -> VO（唯一出处 ProductListVO.from）
        return ids.stream()
                .map(map::get)
                .filter(Objects::nonNull)         // 商品可能已被删掉
                .map(ProductListVO::from)
                .collect(Collectors.toList());
    }

    @Autowired
    private OrderMapper orderMapper;
    // ProductServiceImpl 里加私有方法
    // ==================== 管理端 ====================

    @Override
    public void offlineByAdmin(Long id, String reason) {
        // ① 商品存在吗
        Product old = productMapper.selectById(id);
        if (old == null) {
            throw new BizException(CodeEnum.PRODUCT_NOT_FOUND);      // 2001
        }

        // ② 已售出的商品没有「下架」这回事 —— 单独报 2014，比笼统的 2003 说得清楚
        //    （已售出一定伴随一笔订单，所以这一条必须排在「交易中」前面，否则会被报成 2010）
        if (old.getStatus() == 2) {
            throw new BizException(CodeEnum.PRODUCT_SOLD_CANNOT_OFFLINE);   // 2014
        }

        // ③ 交易中不能下架（跨表查 orders）—— 必须先于 CAS，报的是 2010
        assertNotTrading(id);

        // ④ CAS：状态白名单塞进 WHERE，一条 UPDATE 同时改三列
        int rows = productMapper.update(null, new LambdaUpdateWrapper<Product>()
                .eq(Product::getId, id)
                .in(Product::getStatus, 0, 1)                        // ⚠️ 在售 + 卖家已下架，都能平台下架
                .set(Product::getStatus, 3)                          // 3 = 平台下架
                .set(Product::getOfflineReason, reason)
                .set(Product::getOfflineTime, LocalDateTime.now()));
        if (rows == 0) {
            throw new BizException(CodeEnum.PRODUCT_STATUS_ERROR);   // 2003：兜底（已平台下架 3 / 并发变化）
        }

        // ⑤ 清详情缓存（下架了，详情页必须马上变）
        redisTemplate.delete(CacheKeys.PRODUCT_DETAIL_PREFIX + id);
        log.info("平台下架商品 -> 操作人={}, productId={}, reason={}",
                UserContext.get().getId(), id, reason);
    }

    /** 分类必须真实存在 —— 否则「查不到商品」和「分类 id 传错了」看起来一模一样 */
    private void assertCategoryExists(Long categoryId) {
        if (categoryId == null) {
            return;
        }
        Long count = categoryMapper.selectCount(new LambdaQueryWrapper<Category>()
                .eq(Category::getId, categoryId));
        if (count == null || count == 0) {
            throw new BizException(CodeEnum.CATEGORY_NOT_FOUND);
        }
    }

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
    public Page<ProductListVO> listMine(Integer status, Integer pageNum, Integer pageSize) {
        Long sellerId = UserContext.get().getId();
        //status可以筛选，分页pageNum默认1，pagesize默认10，上限50
        pageNum = (pageNum == null || pageNum < 1) ? 1 : pageNum;
        pageSize = pageSize == null ? 10 : Math.min(pageSize, 50);

        Page<Product> src = productMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Product>()
                        .eq(Product::getSellerId, sellerId)
                        .eq(status != null, Product::getStatus, status)
                        .orderByDesc(Product::getCreateTime, Product::getId));

        // 实体 -> VO（唯一出处 ProductListVO.from）
        Page<ProductListVO> voPage = new Page<>(src.getCurrent(), src.getSize(), src.getTotal());
        voPage.setRecords(src.getRecords().stream()
                .map(ProductListVO::from)
                .collect(Collectors.toList()));
        return voPage;
    }

    @Override
    public Page<ProductAdminVO> adminSearch(Integer status, String keyword, Long categoryId,
                                            Integer pageNum, Integer pageSize) {
        // 分页统一约定：默认 10 / 上限 50
        pageNum = (pageNum == null || pageNum < 1) ? 1 : pageNum;
        pageSize = pageSize == null ? 10 : Math.min(pageSize, 50);

        // ⚠️ 和公共 search 最大的区别：这里「不写死状态」—— status 为空就查全部（0/1/2/3）
        Page<Product> src = productMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Product>()
                        .eq(status != null, Product::getStatus, status)
                        .eq(categoryId != null, Product::getCategoryId, categoryId)
                        // 管理端只按标题找（公共 search 查「标题 OR 描述」）—— 够用且少一层括号
                        .like(StringUtils.hasText(keyword), Product::getTitle, keyword)
                        .orderByDesc(Product::getCreateTime, Product::getId));

        // 实体 -> VO，逐条搬（每轮都要 new 一个，别写在循环外）
        List<ProductAdminVO> records = new ArrayList<>();
        for (Product p : src.getRecords()) {
            ProductAdminVO vo = new ProductAdminVO();
            vo.setId(p.getId());
            vo.setSellerId(p.getSellerId());
            vo.setCategoryId(p.getCategoryId());
            vo.setTitle(p.getTitle());
            vo.setPrice(p.getPrice());
            vo.setStatus(p.getStatus());
            vo.setConditionLevel(p.getConditionLevel());
            vo.setImages(p.getImages());
            vo.setCreateTime(p.getCreateTime());
            vo.setOfflineReason(p.getOfflineReason());
            vo.setOfflineTime(p.getOfflineTime());
            records.add(vo);
        }

        Page<ProductAdminVO> voPage = new Page<>(src.getCurrent(), src.getSize(), src.getTotal());
        voPage.setRecords(records);
        return voPage;
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
