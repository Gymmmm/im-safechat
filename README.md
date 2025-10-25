# SafeChat 现代即时通信系统

SafeChat 提供一套可直接运行的现代化即时通信体验，包含好友管理、一对一私聊、群聊以及跨设备消息记录功能。后端基于 Node.js + Express + Socket.IO，数据存储使用 MongoDB 持久化，前端采用现代 UI 风格的纯前端实现。

## 功能概览

- 🔐 用户注册 / 登录，采用 JWT 认证
- 👥 好友搜索、发送请求、接受或拒绝
- 💬 一对一私聊会话自动创建与消息同步
- 🧑‍🤝‍🧑 群聊创建与实时消息同步
- 🔄 消息、好友、请求数据实时刷新并存储于 MongoDB，支持跨设备访问
- 🖥️ 现代化前端界面，内置 Socket 连接状态处理和消息通知
- 📊 自带后台控制台，实时查看用户、会话、消息等关键指标

## 目录结构

```
backend/             Node.js + Express + Socket.IO + MongoDB 后端
frontend/modern/     纯前端现代化 UI，可直接在浏览器打开 index.html
```

## 快速开始

### 方式 1: Docker 部署（推荐）

**最简单的部署方式**，适合生产环境：

```bash
# 克隆项目
git clone https://github.com/yesuf435/im-safechat.git
cd im-safechat

# 启动所有服务（MongoDB + Backend + Frontend）
docker compose up -d

# 查看日志
docker compose logs -f
```

访问 `http://localhost` 即可使用。

**生产环境部署**：请查看 [生产环境部署指南 (PRODUCTION_DEPLOYMENT.md)](PRODUCTION_DEPLOYMENT.md)  
**Docker 详细说明**：请查看 [DOCKER_DEPLOY.md](DOCKER_DEPLOY.md)

### 方式 2: 传统部署

1. **安装依赖**

   ```bash
   cd backend
   npm install
   ```

2. **启动 MongoDB**

   确保本机或服务器已启动 MongoDB 服务（默认连接 `mongodb://localhost:27017/safechat`）。如需自定义连接串，设置环境变量 `MONGODB_URI`。

3. **运行后端服务**

   ```bash
   npm start
   ```

   可选环境变量：

   - `PORT`（默认 3001）
   - `JWT_SECRET` 自定义 JWT 密钥
   - `ALLOWED_ORIGINS` 逗号分隔的允许跨域地址，例如 `http://localhost:5173,http://localhost:5500`

4. **打开前端页面**

   使用任意静态文件服务器或直接在浏览器中打开 `frontend/modern/index.html`。登录页内置“体验界面预览”按钮，可在未登录状态下快速浏览私信、群聊等界面布局。

5. **访问后台控制台（可选）**

   登录成功后，可直接访问 `frontend/modern/admin.html` 获取实时的用户、会话与消息概览。控制台会复用当前浏览器中的登录令牌。

6. **一键打包用于宝塔面板部署（可选）**

   如果需要在宝塔 CentOS 7 服务器快速部署，可运行：

   ```bash
   bash deploy/create-baota-package.sh
   ```

   脚本会在 `dist/` 下生成 `safechat-baota-release.tar.gz` 与 `safechat-baota-release.zip` 两个压缩包，内容一致，包含后端、前端、启动脚本与精简版部署指南。详细操作步骤见 `deploy/BAOTA_DEPLOY.md`。

## 自动化测试

后端提供基于 Jest + Supertest 的端到端测试用例，用于覆盖注册登录、好友请求、一对一和群聊核心流程。

```bash
cd backend
npm test
```

> **提示**：测试默认会使用 `mongodb-memory-server` 拉取内存版 MongoDB。若运行环境无法访问 MongoDB 官方镜像源，测试会自动跳过下载失败的用例并给出提示。

## 开发提示

- Socket 连接成功后会自动加入当前会话房间，实现消息实时推送。
- 所有 REST API 均以 `/api` 开头，需要在请求头附带 `Authorization: Bearer <token>`。
- 登录页支持快速切换登录/注册表单，并提供界面预览模式以便演示效果。
- 后台控制台提供一键刷新按钮，可随时查看最新的用户与会话统计。

## 部署状态

🎉 **SafeChat 已完全准备好部署到生产环境！**

查看详细的部署就绪状态：[DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)

## 常见问题

- **登录后长时间未操作**：若 JWT 过期或 Socket 认证失败，前端会自动退出登录，请重新登录。
- **无法创建群聊**：需至少拥有一位好友，创建时可输入逗号分隔的好友用户名选择成员，留空则默认全部好友加入。
- **无法连接后端**：检查 `ALLOWED_ORIGINS` 配置是否包含前端页面地址，并确保后端服务已启动。

祝使用愉快！
