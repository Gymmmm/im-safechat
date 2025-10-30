/**
 * SafeChat 前端配置文件 - 生产环境示例
 * 
 * 此文件展示生产环境下的配置示例。
 * 使用时，请复制为 config.js 并根据实际部署情况修改。
 */

const SafeChatConfig = {
  /**
   * 场景1：前后端同域部署（推荐）
   * 例如：前端部署在 https://yourdomain.com/，后端也在 https://yourdomain.com/api/
   * 使用空字符串，所有请求都是相对路径
   */
  apiBaseUrl: '',
  socketUrl: undefined,

  /**
   * 场景2：后端独立域名部署
   * 例如：前端在 https://chat.yourdomain.com/，后端在 https://api.yourdomain.com/
   * 取消注释并修改下面的配置：
   */
  // apiBaseUrl: 'https://api.yourdomain.com',
  // socketUrl: 'https://api.yourdomain.com',

  /**
   * 场景3：后端在同域的不同端口（仅用于测试环境）
   * 例如：前端在 http://yourdomain.com:8080/，后端在 http://yourdomain.com:3001/
   * 取消注释并修改下面的配置：
   */
  // apiBaseUrl: 'http://yourdomain.com:3001',
  // socketUrl: 'http://yourdomain.com:3001',

  socketOptions: {
    transports: ['websocket', 'polling']
  }
};
