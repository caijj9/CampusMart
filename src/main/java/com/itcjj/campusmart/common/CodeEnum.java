package com.itcjj.campusmart.common;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum CodeEnum {
    SUCCESS(0,"ok"),
    USERNAME_EXIST(1001,"用户名已存在"),
    USER_NOT_FOUND(1002,"用户不存在"),
    LOGIN_FAILED(1003, "用户名或密码错误"),
    NO_PERMISSION(403, "无权限访问"),
    OLD_PASSWORD_WRONG(1004, "原密码错误"),
    FILE_EMPTY(1005, "上传文件不能为空"),
    FILE_TYPE_NOT_ALLOWED(1006, "只支持 jpg / jpeg / png / gif / webp 格式的图片"),
    FILE_UPLOAD_FAILED(1007, "文件上传失败"),
    PRODUCT_NOT_FOUND(2001, "商品不存在"),
    TOO_MANY_IMAGES(2002, "最多上传 9 张图片"),
    PRODUCT_STATUS_ERROR(2003, "商品已售出或已下架"),
    CANNOT_BUY_OWN_PRODUCT(2004, "不能购买自己的商品"),
    DUPLICATE_SUBMIT(2005,"请勿重复提交"),
    ORDER_NOT_FOUND(2006, "订单不存在"),
    ORDER_STATUS_ERROR(2007, "当前订单状态不允许该操作"),
    ALREADY_FAVORITED(2008, "已收藏"),
    ALREADY_UNFAVORITED(2009, "已取消收藏"),
    PRODUCT_IN_TRADE(2010, "商品正在交易中"),
    PRODUCT_RELIST_NOT_ALLOWED(2013, "商品当前状态不允许重新上架"),


    NOT_LOGIN(401, "请先登录");


    private final int code;
    private final String msg;
}
