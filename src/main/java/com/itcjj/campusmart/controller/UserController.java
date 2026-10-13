package com.itcjj.campusmart.controller;

import com.itcjj.campusmart.annotation.RequireAdmin;
import com.itcjj.campusmart.common.Result;
import com.itcjj.campusmart.dto.LoginDTO;
import com.itcjj.campusmart.dto.PasswordDTO;
import com.itcjj.campusmart.dto.UserDTO;
import com.itcjj.campusmart.dto.ValidGroup;
import com.itcjj.campusmart.service.UserService;
import com.itcjj.campusmart.vo.UserAdminVO;
import com.itcjj.campusmart.vo.UserProfileVO;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/user")
public class UserController {

    @Autowired
    private UserService userService;

    // 获取用户列表
    @RequireAdmin
    @GetMapping("/list")
    public Result<List<UserAdminVO>> list() {
        return Result.success(userService.listAll());
    }
    // 添加用户
    @PostMapping("/add")
    public Result<Void> add(@Validated(ValidGroup.Create.class) @RequestBody UserDTO dto) {
        userService.add(dto);
        return Result.success(null);
    }

    // 更新用户
    @PutMapping("/update")
    public Result<Void> update(@Validated(ValidGroup.Update.class) @RequestBody UserDTO dto) {
        userService.update(dto);
        return Result.success(null);
    }

    // 删除用户 —— 仅管理员可操作（删数据比看数据危险，必须收紧）
    @RequireAdmin
    @DeleteMapping("/delete/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return Result.success(null);
    }
    // 登录
    @PostMapping("/login")
    public Result<String> login(@Valid@RequestBody LoginDTO dto) {
        return Result.success(userService.login(dto));
    }
    // 注册
    @PostMapping("/register")
    public Result<Void> register(@Validated(ValidGroup.Create.class) @RequestBody UserDTO dto) {
        userService.add(dto);
        return Result.success(null);
    }
    @GetMapping("/me")
    public Result<UserProfileVO> me() {
        return Result.success(userService.getCurrentUser());
    }

    // 修改密码
    @PutMapping("/password")
    public Result<Void> updatePassword(@Valid @RequestBody PasswordDTO dto) {
        userService.updatePassword(dto);
        return Result.success(null);
    }
    // 上传头像
    @PostMapping("/avatar")
    public Result<String> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return Result.success(userService.uploadAvatar(file));
    }


}
