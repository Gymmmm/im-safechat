const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_safechat_key';

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('未提供认证令牌', 401);
    }
    
    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 将用户信息附加到请求对象
    req.userId = decoded.id;
    req.username = decoded.username;
    req.role = decoded.role || 'user';
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('无效的认证令牌', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('认证令牌已过期', 401));
    } else {
      next(error);
    }
  }
}

/**
 * 可选认证中间件
 * Token 存在时验证，不存在时继续
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      req.userId = decoded.id;
      req.username = decoded.username;
      req.role = decoded.role || 'user';
    }
    
    next();
  } catch (error) {
    // 可选认证失败不报错，继续执行
    next();
  }
}

/**
 * 角色验证中间件
 * @param  {...string} roles - 允许的角色列表
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.userId) {
      return next(new AppError('需要登录才能访问', 401));
    }
    
    if (roles.length && !roles.includes(req.role)) {
      return next(new AppError('没有权限访问此资源', 403));
    }
    
    next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize
};
