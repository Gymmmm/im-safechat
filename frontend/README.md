# SafeChat Modern Frontend

现代化的即时通信前端界面，采用原生 JavaScript 实现，提供流畅的用户体验。

## 功能特性

### 用户认证
- 用户登录和注册
- JWT token 认证
- 自动登录（保存 token）

### 好友系统
- 搜索用户
- 发送好友请求
- 接受/拒绝好友请求
- 查看好友列表

### 会话管理
- 创建私聊会话
- 创建群聊会话
- 查看会话列表
- 实时消息同步

### 实时通信
- Socket.io 实时消息推送
- 消息即时送达
- 会话状态实时更新
- 在线状态同步

### 后台管理
- 用户统计
- 会话分析
- 系统概览
- 数据可视化

## 文件结构

```
frontend/
├── index.html          # 主应用页面
├── styles.css          # 主应用样式
├── app.js             # 主应用逻辑
├── admin.html         # 管理后台页面
├── admin.css          # 管理后台样式
├── admin.js           # 管理后台逻辑
└── modern/            # 原始开发目录（保留参考）
```

## API 集成

前端通过以下 API 端点与后端通信：

### 认证相关
- `POST /api/login` - 用户登录
- `POST /api/register` - 用户注册
- `GET /api/me` - 获取当前用户信息

### 好友系统
- `GET /api/users/search` - 搜索用户
- `GET /api/friends` - 获取好友列表
- `POST /api/friends/requests` - 发送好友请求
- `GET /api/friends/requests` - 获取好友请求列表
- `POST /api/friends/requests/:id/accept` - 接受好友请求
- `POST /api/friends/requests/:id/reject` - 拒绝好友请求

### 会话消息
- `GET /api/conversations` - 获取会话列表
- `POST /api/conversations/private` - 创建私聊
- `POST /api/conversations/group` - 创建群聊
- `GET /api/conversations/:id/messages` - 获取消息列表
- `POST /api/conversations/:id/messages` - 发送消息

### 管理后台
- `GET /api/admin/overview` - 系统概览
- `GET /api/admin/users` - 用户列表
- `GET /api/admin/conversations` - 会话列表

## Socket.io 事件

### 客户端发送
- `authenticate` - 认证连接
- `joinConversation` - 加入会话房间
- `leaveConversation` - 离开会话房间

### 服务端推送
- `authenticated` - 认证成功
- `unauthorized` - 认证失败
- `messageCreated` - 新消息创建
- `conversationUpdated` - 会话更新

## 技术栈

- **原生 JavaScript (ES6+)** - 无框架依赖，轻量高效
- **Socket.io Client** - 实时通信
- **Fetch API** - HTTP 请求
- **CSS3** - 现代化样式设计
- **响应式设计** - 移动端适配

## 设计特点

### UI/UX
- 简洁现代的界面设计
- 流畅的动画效果
- 直观的交互体验
- 移动端优先的响应式布局

### 性能优化
- 按需加载数据
- 消息虚拟滚动
- 防抖搜索
- 本地状态缓存

## 部署说明

前端文件通过 Nginx 静态服务器部署，API 请求通过反向代理转发到后端服务。

### Nginx 配置

```nginx
location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
}

location /api {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

location /socket.io {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 开发模式

应用内置了预览模式（Demo Mode），可以在不连接后端的情况下体验界面：

1. 点击登录页面的"体验界面预览"按钮
2. 系统会加载模拟数据
3. 可以浏览所有界面但无法执行实际操作

## 浏览器支持

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 移动端浏览器

## 未来规划

- [ ] 支持文件上传和分享
- [ ] 消息撤回功能
- [ ] @提及功能
- [ ] 表情包支持
- [ ] 语音/视频通话
- [ ] 消息搜索
- [ ] 主题切换（深色模式）
- [ ] PWA 支持
- [ ] 离线消息缓存
