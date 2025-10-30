/**
 * 统一 API 响应格式工具
 */

/**
 * 成功响应
 * @param {Object} res - Express response 对象
 * @param {*} data - 响应数据
 * @param {String} message - 响应消息
 * @param {Number} statusCode - HTTP 状态码
 */
function successResponse(res, data = null, message = 'Success', statusCode = 200) {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  return res.status(statusCode).json(response);
}

/**
 * 错误响应
 * @param {Object} res - Express response 对象
 * @param {String} message - 错误消息
 * @param {Number} statusCode - HTTP 状态码
 * @param {*} errors - 详细错误信息
 */
function errorResponse(res, message = 'Error', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (errors && process.env.NODE_ENV !== 'production') {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 异步路由处理器包装器
 * 自动捕获 async 函数中的错误
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';
  
  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
    const errors = Object.values(err.errors).map(e => e.message);
    return errorResponse(res, message, statusCode, errors);
  }
  
  // Mongoose 重复键错误
  if (err.code === 11000) {
    statusCode = 400;
    message = '数据已存在';
    const field = Object.keys(err.keyPattern)[0];
    return errorResponse(res, message, statusCode, `${field} 已被使用`);
  }
  
  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的认证令牌';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '认证令牌已过期';
  }
  
  // 记录错误日志
  const errorLog = {
    message: err.message,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId || 'anonymous'
  };
  
  // 尝试使用 logger，如果不存在则使用 console
  try {
    const { logger } = require('../config/logger');
    if (statusCode >= 500) {
      logger.error(`${errorLog.method} ${errorLog.url} - ${errorLog.message}`, { 
        stack: err.stack,
        ...errorLog 
      });
    } else {
      logger.warn(`${errorLog.method} ${errorLog.url} - ${errorLog.message}`, errorLog);
    }
  } catch {
    console.error('错误:', errorLog, err.stack);
  }
  
  return errorResponse(
    res,
    message,
    statusCode,
    process.env.NODE_ENV !== 'production' ? err.stack : null
  );
}

/**
 * 404 Not Found 处理
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(`路径 ${req.originalUrl} 不存在`, 404);
  next(error);
}

module.exports = {
  successResponse,
  errorResponse,
  AppError,
  asyncHandler,
  errorHandler,
  notFoundHandler
};
