/**
 * SafeChat 前端配置文件 - 开发环境示例
 * 
 * 此文件展示开发环境下的配置示例。
 * 使用时，请复制为 config.js 并根据实际情况修改。
 */

const SafeChatConfig = {
  /**
   * 开发环境：后端通常运行在独立端口（默认 3001）
   * 前端可能使用 Live Server、webpack-dev-server 或直接打开 HTML 文件
   */
  apiBaseUrl: 'http://localhost:3001',
  socketUrl: 'http://localhost:3001',

  socketOptions: {
    transports: ['websocket', 'polling']
  }
};
