# SafeChat 后端配置指南

## 快速开始

1. **复制环境配置文件**
   ```bash
   cd backend/im-backend
   cp .env.example .env
   ```

2. **修改配置**
   使用文本编辑器打开 `.env` 文件，根据实际情况修改配置值。

3. **安装依赖**
   ```bash
   npm install
   ```

4. **启动 MongoDB**
   确保 MongoDB 服务已启动。本地开发可以使用：
   ```bash
   # macOS (使用 Homebrew)
   brew services start mongodb-community
   
   # Linux (使用 systemctl)
   sudo systemctl start mongod
   
   # 使用 Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **启动后端服务**
   ```bash
   npm start
   ```

## 配置项说明

### 必需配置

- **MONGODB_URI**: MongoDB 数据库连接字符串
  - 本地: `mongodb://localhost:27017/safechat`
  - 远程: `mongodb://username:password@host:port/database`
  
- **JWT_SECRET**: JWT 令牌加密密钥
  - 生产环境务必使用强随机字符串
  - 生成方法: `openssl rand -base64 32`

### 可选配置

- **PORT**: 后端服务端口（默认 3001）
- **ALLOWED_ORIGINS**: CORS 允许的来源
  - 开发: `http://localhost:5173,http://localhost:5500`
  - 生产: `https://yourdomain.com`
- **ENABLE_BOSS**: 是否启用超级管理员面板（默认 false）
- **MAX_FILE_SIZE**: 文件上传大小限制（MB，默认 10）

## 数据库结构

SafeChat 使用 MongoDB 存储数据，主要集合包括：

### Users (用户)
- username: 用户名（唯一）
- password: 加密后的密码
- displayName: 显示名称
- friends: 好友列表（用户 ID 数组）

### FriendRequests (好友请求)
- from: 发起人用户 ID
- to: 接收人用户 ID
- status: 状态（pending/accepted/declined）

### Conversations (会话)
- type: 类型（private/group）
- name: 会话名称（群聊用）
- participants: 参与者用户 ID 数组

### Messages (消息)
- conversation: 会话 ID
- sender: 发送者用户 ID
- content: 消息内容
- type: 消息类型（text/image/audio）

## 安全建议

### 生产环境部署检查清单

- [ ] 修改 `JWT_SECRET` 为强随机字符串
- [ ] 设置 `ALLOWED_ORIGINS` 为具体域名，避免使用 `*`
- [ ] 启用 HTTPS
- [ ] 配置防火墙规则
- [ ] 设置 MongoDB 访问控制
- [ ] 定期备份数据库
- [ ] 监控日志和错误

### JWT 密钥生成

```bash
# 使用 OpenSSL 生成
openssl rand -base64 32

# 使用 Node.js 生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 故障排查

### MongoDB 连接失败
- 检查 MongoDB 服务是否运行
- 验证 MONGODB_URI 配置是否正确
- 检查防火墙和网络连接

### JWT 认证失败
- 确认 JWT_SECRET 配置正确
- 检查 token 是否过期
- 验证请求头格式: `Authorization: Bearer <token>`

### CORS 错误
- 检查 ALLOWED_ORIGINS 配置
- 确认前端请求地址在允许列表中
- 开发环境可临时设置为 `*`

## 更多资源

- [MongoDB 文档](https://docs.mongodb.com/)
- [JWT 介绍](https://jwt.io/)
- [Express.js 文档](https://expressjs.com/)
- [Socket.IO 文档](https://socket.io/)
