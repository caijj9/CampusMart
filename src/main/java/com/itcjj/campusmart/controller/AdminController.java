package com.itcjj.campusmart.controller;

import com.itcjj.campusmart.annotation.RequireAdmin;
import com.itcjj.campusmart.common.Result;
import com.itcjj.campusmart.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")

public class AdminController {
    @Autowired
    private UserService userService;
    @PutMapping("/user/disable/{id}")@RequireAdmin
    public Result<String> disableUser(@PathVariable Long id) {
        userService.disableUser(id);
        return Result.success("已禁用");
    }

    @PutMapping("/user/enable/{id}")@RequireAdmin
    public Result<String> enableUser(@PathVariable Long id) {
        userService.enableUser(id);
        return Result.success("已启用");
    }

}
