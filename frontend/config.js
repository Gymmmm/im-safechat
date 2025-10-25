/**
 * SafeChat 前端配置文件
 * 
 * 此配置文件用于设置前端连接后端的 API 地址和 Socket.IO 服务器地址。
 * 根据您的部署场景选择合适的配置方式。
 */

// 配置选项
const SafeChatConfig = {
  /**
   * API 基础 URL
   * 
   * 部署场景：
   * 1. 开发环境（前后端同域）: '' (空字符串，使用相对路径)
   * 2. 开发环境（后端独立端口）: 'http://localhost:3001'
   * 3. 生产环境（同域部署）: '' (空字符串)
   * 4. 生产环境（后端独立域名）: 'https://api.yourdomain.com'
   */
  apiBaseUrl: '',

  /**
   * Socket.IO 服务器 URL
   * 
   * 部署场景：
   * 1. 开发环境（前后端同域）: undefined (使用当前域)
   * 2. 开发环境（后端独立端口）: 'http://localhost:3001'
   * 3. 生产环境（同域部署）: undefined
   * 4. 生产环境（后端独立域名）: 'https://api.yourdomain.com'
   */
  socketUrl: undefined,

  /**
   * Socket.IO 配置选项
   */
  socketOptions: {
    transports: ['websocket', 'polling']
  }
};

// 自动检测环境（可选）
// 如果需要根据主机名自动切换配置，可以取消下面代码的注释并修改条件
/*
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // 本地开发环境
  SafeChatConfig.apiBaseUrl = 'http://localhost:3001';
  SafeChatConfig.socketUrl = 'http://localhost:3001';
} else {
  // 生产环境 - 假设前后端同域部署
  SafeChatConfig.apiBaseUrl = '';
  SafeChatConfig.socketUrl = undefined;
}
*/
