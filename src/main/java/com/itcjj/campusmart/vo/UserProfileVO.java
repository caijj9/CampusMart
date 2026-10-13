package com.itcjj.campusmart.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 当前登录用户自己的资料（GET /user/me）
 *
 * ⚠️ 保留 phone：那是【自己的】手机号，个人资料页要用。
 * ⚠️ 去掉 tokenVersion / deleted —— 那是内部字段，不该出现在对外契约里。
 *
 * 字段与前端 src/types/index.ts 的 User 类型一一对应（前端无需改动）。
 */
@Data
public class UserProfileVO {
    private Long id;
    private String username;
    private String nickname;
    private String avatar;
    private String campus;
    private String phone;
    private String role;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
