package com.itcjj.campusmart.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.itcjj.campusmart.common.CodeEnum;
import com.itcjj.campusmart.common.CurrentUser;
import com.itcjj.campusmart.dto.LoginDTO;
import com.itcjj.campusmart.dto.PasswordDTO;
import com.itcjj.campusmart.dto.UserDTO;
import com.itcjj.campusmart.entity.User;
import com.itcjj.campusmart.exception.BizException;
import com.itcjj.campusmart.mapper.UserMapper;
import com.itcjj.campusmart.service.FileStorageService;
import com.itcjj.campusmart.service.UserService;
import com.itcjj.campusmart.util.JwtUtil;
import com.itcjj.campusmart.util.UserContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;


@Slf4j
@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private FileStorageService fileStorageService;

    @Override
    public List<User> listAll() {
        // 查询列表不打日志：会被翻页刷爆，没有留存价值
        return userMapper.selectList(null);
    }

    @Override
    public void add(UserDTO dto){
        // 检查用户名是否已存在
        Long count = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, dto.getUsername()));
        if (count > 0) {
            throw new BizException(CodeEnum.USERNAME_EXIST);
        }

        // 设置用户信息
        User user=new User();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));

        user.setNickname(dto.getNickname());
        user.setPhone(dto.getPhone());
        user.setCampus(dto.getCampus());
        userMapper.insert(user);

        // insert 后 id 已被 MP 回填，可以拿到。只记 id 和 username，绝不记密码
        log.info("用户注册成功 -> id={}, username={}", user.getId(), user.getUsername());
    }

    @Override
    public void update(UserDTO dto){
        // ★ 越权校验：既不是自己，又不是管理员 → 拒
        Long currentId = UserContext.get().getId();
        String role = UserContext.get().getRole();
        if (!currentId.equals(dto.getId()) && !"ADMIN".equals(role)) {
            throw new BizException(CodeEnum.NO_PERMISSION);
        }
        User user=new User();
        user.setId(dto.getId());
        user.setNickname(dto.getNickname());
        user.setPhone(dto.getPhone());
        user.setCampus(dto.getCampus());
        int rows = userMapper.updateById(user);
        if (rows == 0) {
            throw new BizException(CodeEnum.USER_NOT_FOUND);
        }


        // 改别人资料是敏感操作：记下「谁改的、改的是谁」
        log.info("用户资料更新 -> 操作人={}, 目标用户={}", currentId, dto.getId());
    }

    @Override
    public void delete(Long id){
        int rows = userMapper.deleteById(id);
        if (rows == 0) {
            throw new BizException(CodeEnum.USER_NOT_FOUND);
        }

        // 删除是敏感操作：记下「谁删了谁」，出问题能追溯
        log.info("删除用户 -> 操作人={}, 目标用户={}", UserContext.get().getId(), id);
    }

    @Override
    public String login(LoginDTO dto) {
        // 实现登录逻辑
        //第一步，按用户名查出这个用户
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, dto.getUsername()));
        //第二步，没这个人，抛异常
        //第三步，密码错误，抛异常
        if (user == null || !passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BizException(CodeEnum.LOGIN_FAILED);
        }
        if(user.getStatus() == 0){
            throw new BizException(CodeEnum.USER_DISABLED);}


        // 登录成功记一笔（安全审计：谁、什么时候登录过）
        log.info("用户登录成功 -> id={}, username={}", user.getId(), user.getUsername());

        //第四步：都过了，生成并且返回token
        return jwtUtil.createToken(user.getId(), user.getRole(), user.getTokenVersion());
    }

    @Override
    public User getCurrentUser() {
        CurrentUser current = UserContext.get();// 👈 关键在这行
        return userMapper.selectById(current.getId());
    }

    @Override
    public void updatePassword(PasswordDTO dto) {
        Long userId = UserContext.get().getId();
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException(CodeEnum.USER_NOT_FOUND);
        }

        // 1. 验原密码：证明「你是本人」，不只是「你手上有 token」
        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPassword())) {
            throw new BizException(CodeEnum.OLD_PASSWORD_WRONG);
        }

        // 2. 一次 UPDATE 同时干两件事：换新密码（自动生成新盐）+ 版本号 +1
        User upd = new User();
        upd.setId(userId);
        upd.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        upd.setTokenVersion(user.getTokenVersion() + 1);
        userMapper.updateById(upd);

        // 只记 id：新旧密码都不能进日志
        log.info("用户修改密码 -> id={}，该用户所有旧 token 已作废", userId);
    }
    @Override
    public String uploadAvatar(MultipartFile file) {
        String url = fileStorageService.save(file, "avatar");

        // 5. 库里只存访问路径（不存二进制）
        Long userId = UserContext.get().getId();
        User upd = new User();
        upd.setId(userId);
        upd.setAvatar(url);
        userMapper.updateById(upd);

        log.info("用户上传头像 -> id={}, url={}", userId, url);
        return url;
    }
    @Override
    public void disableUser(Long id) {
        // 一条 UPDATE 干两件事：状态置 0 + token_version 自增
        // setSql 是「原样拼进 SQL」，所以 +1 是数据库算的，不是 Java 算的（避免并发丢更新）
        UpdateWrapper<User> w = new UpdateWrapper<User>()
                .eq("id", id)
                .set("status", 0)
                .setSql("token_version = token_version + 1");

        int rows = userMapper.update(null, w);   // 条件全在 wrapper 里，第一个参数传 null
        if (rows == 0) {
            throw new BizException(CodeEnum.USER_NOT_FOUND);   // 1002
        }
        log.info("用户禁用 -> id={}", id);
    }

    @Override
    public void enableUser(Long id) {
        // 启用只改状态 —— 不要动 token_version（旧 token 已经作废了，不用再作废一次）
        UpdateWrapper<User> w = new UpdateWrapper<User>()
                .eq("id", id)
                .set("status", 1);

        int rows = userMapper.update(null, w);
        if (rows == 0) {
            throw new BizException(CodeEnum.USER_NOT_FOUND);
        }
        log.info("用户启用 -> id={}", id);
    }


}
