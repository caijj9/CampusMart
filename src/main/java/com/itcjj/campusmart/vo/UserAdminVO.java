package com.itcjj.campusmart.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理员查看用户列表（GET /user/list）
 *
 * ⚠️ 这里【不含 phone】—— 那是【别人的】手机号。
 * 项目规矩：别人的手机号只允许出现在 OrderDetailVO.counterparty.phone，
 * 因为那是「交易对方」，双方有真实的交易关系；而管理端翻列表是另一回事。
 *
 * ⚠️ 也不含 tokenVersion / deleted（内部字段）。
 *
 * 如果将来管理员确实需要联系电话，要显式加进这个 VO —— 那才叫「你决定给」。
 */
@Data
public class UserAdminVO {
    private Long id;
    private String username;
    private String nickname;
    private String avatar;
    private String campus;
    private String role;
    private Integer status;
    private LocalDateTime createTime;
}
