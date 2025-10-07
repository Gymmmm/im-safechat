# IM-SafeChat 快速开始指南

## 🚀 5分钟快速部署

### 选项1: Docker 一键部署 (推荐)

适合快速测试和演示。

```bash
# 1. 克隆项目
git clone https://github.com/Gymmmm/im-safechat.git
cd im-safechat

# 2. 构建前端（第一次需要）
cd frontend/im-frontend
npm install
npm run build
cd ../..

# 3. 启动所有服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 访问应用
# 打开浏览器: http://localhost
```

**默认测试账号** (密码都是 `123456`):
- testuser
- alice  
- bob

### 选项2: 开发模式启动

适合开发和调试。

```bash
# 1. 克隆项目
git clone https://github.com/Gymmmm/im-safechat.git
cd im-safechat

# 2. 确保 MySQL 正在运行
# 创建数据库并导入初始化脚本
mysql -u root -p < mysql-init/init.sql

# 3. 使用启动脚本
./start-dev.sh

# 或者手动启动:

# 3a. 启动后端
cd backend/im-backend
cp .env.example .env
# 编辑 .env 配置数据库连接
npm install
npm start

# 3b. 启动前端 (新终端)
cd frontend/im-frontend
cp .env.example .env
npm install
npm run dev

# 4. 访问应用
# 打开浏览器: http://localhost:5173
```

## 📱 快速体验

### 第一步：注册账号

1. 打开浏览器访问应用
2. 点击"去注册"
3. 输入用户名和密码
4. 点击"注册"按钮

### 第二步：登录

1. 使用注册的账号或测试账号登录
2. 输入用户名和密码
3. 点击"登录"按钮

### 第三步：开始聊天

1. 从左侧联系人列表选择要聊天的用户
2. 在输入框输入消息，按回车或点击"发送"
3. 点击 📎 图标可以发送文件或图片

## 🎯 主要功能演示

### 发送文本消息
```
1. 选择联系人
2. 输入框输入文本
3. 按 Enter 或点击"发送"
```

### 发送图片
```
1. 选择联系人
2. 点击 📎 图标
3. 选择图片文件
4. 自动上传并发送
```

### 查看历史消息
```
1. 选择联系人
2. 自动加载历史消息
3. 滚动查看更多
```

### 移动端使用
```
1. 点击左上角菜单图标
2. 打开/关闭联系人列表
3. 选择联系人后自动关闭侧边栏
```

## 🐛 常见问题

### 问题1: 无法连接数据库

**原因**: MySQL 未启动或配置错误

**解决**:
```bash
# 检查 MySQL 是否运行
sudo systemctl status mysql

# 检查 .env 配置
cat backend/im-backend/.env

# 测试数据库连接
mysql -h localhost -u fcim -p chat_app
```

### 问题2: 后端启动失败

**原因**: 端口占用或依赖未安装

**解决**:
```bash
# 检查端口占用
lsof -i :3001

# 重新安装依赖
cd backend/im-backend
rm -rf node_modules
npm install
```

### 问题3: 前端无法加载

**原因**: API 地址配置错误

**解决**:
```bash
# 检查 .env 配置
cat frontend/im-frontend/.env

# 确保 VITE_API_BASE 指向正确的后端地址
echo "VITE_API_BASE=http://localhost:3001" > frontend/im-frontend/.env
```

### 问题4: WebSocket 连接失败

**原因**: 网络或认证问题

**解决**:
```bash
# 检查浏览器控制台是否有错误
# 确保已登录并有有效的 token
# 清除浏览器缓存和 localStorage
```

### 问题5: 文件上传失败

**原因**: 文件大小超限或类型不支持

**解决**:
```bash
# 检查文件大小（最大5MB）
# 支持的文件类型：
# - 图片: jpg, jpeg, png, gif
# - 音频: mp3, wav
# - 文档: pdf

# 检查上传目录权限
ls -la backend/im-backend/uploads
chmod 755 backend/im-backend/uploads
```

## 🔧 配置调整

### 修改端口

**后端端口**:
```bash
# 编辑 backend/im-backend/.env
PORT=3001  # 改为其他端口
```

**前端端口**:
```bash
# 编辑 frontend/im-frontend/vite.config.js
server: {
  port: 5173  // 改为其他端口
}
```

### 数据库配置

```bash
# 编辑 backend/im-backend/.env
DB_HOST=localhost
DB_USER=fcim
DB_PASSWORD=your_password
DB_NAME=chat_app
```

### JWT 密钥

```bash
# 编辑 backend/im-backend/.env
# 生产环境务必修改为随机字符串
JWT_SECRET=your_random_secret_key_here
```

## 📦 生产环境部署

### 使用构建脚本

```bash
# 构建生产版本
./build-production.sh

# 将生成部署包
deploy_YYYYMMDD_HHMMSS.tar.gz
```

### 手动构建

```bash
# 1. 构建前端
cd frontend/im-frontend
echo "VITE_API_BASE=http://your-domain.com:3001" > .env.production
npm run build

# 2. 配置后端
cd ../../backend/im-backend
cp .env.example .env
# 编辑 .env 配置生产环境数据库

# 3. 使用 PM2 运行后端
npm install -g pm2
pm2 start app.js --name im-backend
pm2 save

# 4. 配置 Nginx 代理
# 参考 DEPLOYMENT.md 中的 Nginx 配置
```

## 📚 更多文档

- [完整部署指南](./DEPLOYMENT.md)
- [项目说明](./README.md)
- [功能设计文档](./frontend/wechat_like_features_design.md)

## 💡 提示

- 首次启动需要安装依赖，可能需要几分钟
- 确保 MySQL 服务已启动
- 开发模式使用 http://localhost:5173
- 生产模式需要先构建前端
- 使用测试账号可以快速体验功能
- 密码使用 bcrypt 加密存储

## 🎉 开始使用

现在你已经准备好使用 IM-SafeChat 了！

如果遇到问题，请查看上面的故障排查部分，或访问:
- GitHub Issues: https://github.com/Gymmmm/im-safechat/issues
