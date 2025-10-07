# IM-SafeChat - 生产级即时通讯系统

## 🎯 项目简介

IM-SafeChat 是一个现代化的即时通讯系统，类似于微信和Telegram，采用前后端分离架构，支持实时聊天、文件传输、群组功能等特性。

### ✨ 主要功能

- 🔐 **用户认证**: JWT token 安全认证
- 💬 **实时聊天**: 基于 WebSocket 的实时私聊
- 📁 **文件传输**: 支持图片、音频、文档上传
- 📜 **消息历史**: 完整的聊天记录存储和加载
- 👥 **群组聊天**: 多人群聊功能
- 👫 **好友系统**: 好友添加和管理
- 📱 **移动适配**: 响应式设计，支持移动端
- ✅ **已读状态**: 消息已读未读状态追踪

### 🏗️ 技术栈

**后端** (`backend/im-backend`)
- Express.js - Web框架
- Socket.io - WebSocket实时通信
- MySQL - 数据存储
- JWT - 身份认证
- Multer - 文件上传

**前端** (`frontend/im-frontend`)
- React 19 - UI框架
- Vite - 构建工具
- TailwindCSS - 样式框架
- Socket.io-client - WebSocket客户端
- Axios - HTTP客户端

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 克隆仓库
git clone https://github.com/Gymmmm/im-safechat.git
cd im-safechat

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

访问 http://localhost 即可使用

### 方式二：手动部署

#### 1. 环境准备

- Node.js >= 14.x
- MySQL >= 8.0
- npm 或 yarn

#### 2. 数据库初始化

```bash
# 登录 MySQL
mysql -u root -p

# 执行初始化脚本
mysql -u root -p < mysql-init/init.sql
```

#### 3. 后端部署

```bash
cd backend/im-backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息

# 启动后端
npm start
```

后端将在 http://localhost:3001 启动

#### 4. 前端部署

```bash
cd frontend/im-frontend

# 安装依赖
npm install

# 配置API地址
cp .env.example .env
# 编辑 .env 文件，配置后端API地址

# 开发模式
npm run dev

# 生产构建
npm run build
```

开发模式访问 http://localhost:5173

## 📖 使用指南

### 默认测试账号

系统预置了三个测试账号，密码均为 `123456`：
- testuser
- alice
- bob

### 基本操作

1. **注册/登录**: 访问首页，选择登录或注册
2. **选择联系人**: 从左侧联系人列表选择要聊天的用户
3. **发送消息**: 在输入框输入消息，按Enter或点击发送
4. **发送文件**: 点击📎图标选择文件上传
5. **查看历史**: 选择联系人后自动加载历史消息

## 📁 项目结构

```
im-safechat/
├── backend/
│   └── im-backend/           # 主后端服务
│       ├── app.js           # 应用入口
│       ├── config/          # 配置文件
│       ├── controllers/     # 控制器
│       ├── models/          # 数据模型
│       ├── routes/          # 路由定义
│       ├── socket/          # Socket.io处理
│       └── uploads/         # 上传文件目录
├── frontend/
│   └── im-frontend/          # React前端应用
│       ├── src/
│       │   ├── pages/       # 页面组件
│       │   ├── components/  # 通用组件
│       │   ├── api.js       # API配置
│       │   └── socket.js    # Socket配置
│       └── dist/            # 构建输出
├── mysql-init/
│   └── init.sql             # 数据库初始化脚本
├── docker-compose.yml       # Docker编排配置
└── DEPLOYMENT.md            # 详细部署文档

```

## 🔧 配置说明

### 后端环境变量 (.env)

```env
DB_HOST=localhost          # 数据库主机
DB_USER=fcim              # 数据库用户
DB_PASSWORD=password      # 数据库密码
DB_NAME=chat_app          # 数据库名
JWT_SECRET=your_secret    # JWT密钥（生产环境务必修改）
PORT=3001                 # 服务端口
```

### 前端环境变量 (.env)

```env
VITE_API_BASE=http://localhost:3001  # 后端API地址
```

## 🔐 安全建议

- ✅ 修改默认JWT密钥
- ✅ 使用强密码
- ✅ 启用HTTPS
- ✅ 配置CORS白名单
- ✅ 限制文件上传大小
- ✅ 定期更新依赖
- ✅ 启用防火墙规则

## 📚 API文档

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/all` - 获取所有用户

### 消息接口

- `GET /api/messages/:userId` - 获取与指定用户的聊天记录
- `POST /api/messages/recall/:messageId` - 撤回消息

### 文件接口

- `POST /upload` - 上传文件

### Socket事件

- `private_message` - 发送/接收私聊消息
- `join_group` - 加入群组
- `group_message` - 发送/接收群组消息

## 🛠️ 开发指南

### 后端开发

```bash
cd backend/im-backend
npm install
npm start
```

### 前端开发

```bash
cd frontend/im-frontend
npm install
npm run dev
```

### 代码规范

- 后端: Node.js + Express 最佳实践
- 前端: React Hooks + 函数式组件
- 代码格式: ESLint + Prettier

## 📊 性能优化

- 数据库索引优化
- WebSocket连接池管理
- 静态资源CDN加速
- 图片压缩和懒加载
- 消息分页加载

## 🐛 故障排查

详见 [DEPLOYMENT.md](./DEPLOYMENT.md) 的故障排查章节

## 📝 更新日志

### v1.0.0 (2025-01-XX)
- ✅ 实现基础聊天功能
- ✅ 完善文件上传
- ✅ 优化用户体验
- ✅ 添加消息历史
- ✅ 改进移动端适配

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 联系方式

- GitHub: https://github.com/Gymmmm/im-safechat
- Issues: https://github.com/Gymmmm/im-safechat/issues

---

⭐ 如果这个项目对你有帮助，请给个星标！
