package com.itcjj.campusmart.vo;

import lombok.Data;

/**
 * 订单详情（返回给前端）
 *
 * 继承 OrderListVO 拿到 11 个基础字段，只多加一个「对方」
 */
@Data
public class OrderDetailVO extends OrderListVO {

    /** 对方：买家点开看到卖家，卖家点开看到买家 */
    private Counterparty counterparty;

    @Data
    public static class Counterparty {
        private String nickname;
        private String campus;
        /** ⚠️ 全项目只有这里能出现手机号 —— 不进列表、不进日志 */
        private String phone;
    }
}
