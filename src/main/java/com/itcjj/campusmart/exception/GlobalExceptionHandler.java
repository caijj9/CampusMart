package com.itcjj.campusmart.exception;

import com.itcjj.campusmart.common.Result;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 全局异常处理
 *
 * ⚠️ 为什么下面那几个「框架异常」必须单独兜：
 *   Spring 抛的异常如果没人认领，就会落到最后的 Exception 兜底里，
 *   统一变成 500「服务器开小差了」—— 明明是调用方传错了参数，却报"服务端故障"，
 *   既误导前端，也把真正的问题藏起来了。
 *   （之前 /product/list 少传 categoryId 报 500、访问不存在的路径报 500，都是这个原因。）
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 业务异常：属于预期内的分支（如「用户名已存在」），用 warn，不算错误
    @ExceptionHandler(BizException.class)
    public Result<Void> handleBiz(BizException e, HttpServletRequest request) {
        log.warn("业务异常 [{}] -> code={}, msg={}",
                request.getRequestURI(), e.getCodeEnum().getCode(), e.getCodeEnum().getMsg());
        return Result.error(e.getCodeEnum().getCode(), e.getCodeEnum().getMsg());
    }

    // 参数校验失败：@Valid @RequestBody 的 DTO 校验没过
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValidException(MethodArgumentNotValidException e, HttpServletRequest request) {
        String msg = e.getBindingResult().getFieldError().getDefaultMessage();
        log.warn("参数校验失败 [{}] -> {}", request.getRequestURI(), msg);
        return Result.error(400, msg);
    }

    // 参数校验失败：GET 把参数绑到「对象」上（如 ProductSearchDTO）时抛的是这个
    @ExceptionHandler(BindException.class)
    public Result<Void> handleBindException(BindException e, HttpServletRequest request) {
        String msg = e.getBindingResult().getFieldError().getDefaultMessage();
        log.warn("参数绑定失败 [{}] -> {}", request.getRequestURI(), msg);
        return Result.error(400, msg);
    }

    // 参数校验失败：方法参数上直接挂 @Min / @Size（需配合类上的 @Validated）
    @ExceptionHandler(ConstraintViolationException.class)
    public Result<Void> handleConstraintViolation(ConstraintViolationException e, HttpServletRequest request) {
        String msg = e.getConstraintViolations().stream()
                .findFirst()
                .map(v -> v.getMessage())
                .orElse("参数不合法");
        log.warn("参数校验失败 [{}] -> {}", request.getRequestURI(), msg);
        return Result.error(400, msg);
    }

    // 少传必填参数（如 /product/list 没传 categoryId）
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public Result<Void> handleMissingParam(MissingServletRequestParameterException e, HttpServletRequest request) {
        log.warn("缺少必填参数 [{}] -> {}", request.getRequestURI(), e.getParameterName());
        return Result.error(400, "缺少必填参数：" + e.getParameterName());
    }

    // 参数类型不对（如 ?id=abc 却要 Long）
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public Result<Void> handleTypeMismatch(MethodArgumentTypeMismatchException e, HttpServletRequest request) {
        log.warn("参数类型不对 [{}] -> {}", request.getRequestURI(), e.getName());
        return Result.error(400, "参数类型不对：" + e.getName());
    }

    // 访问了不存在的路径/资源 → 404（不是 500）
    @ExceptionHandler(NoResourceFoundException.class)
    public Result<Void> handleNoResource(NoResourceFoundException e, HttpServletRequest request) {
        log.warn("路径不存在 [{}]", request.getRequestURI());
        return Result.error(404, "接口不存在");
    }

    // 上传文件超过大小限制：属于调用方的问题，返回 400 而不是 500
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public Result<Void> handleUploadSize(MaxUploadSizeExceededException e, HttpServletRequest request) {
        log.warn("上传文件过大 [{}]", request.getRequestURI());
        return Result.error(400, "文件太大，单个文件不能超过 2MB");
    }

    // 兜底：真正的意外，用 error + 完整堆栈
    @ExceptionHandler(Exception.class)
    public Result<Void> handleOther(Exception e, HttpServletRequest request) {
        log.error("系统异常 [{}]", request.getRequestURI(), e);
        return Result.error(500, "服务器开小差了");
    }

}
