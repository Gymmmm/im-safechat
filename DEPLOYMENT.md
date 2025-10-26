# IM-SafeChat 生产环境部署指南

## 系统架构

本项目采用前后端分离架构：
- **后端**: Express.js + Socket.io + MySQL (位于 `backend/im-backend`)
- **前端**: React + Vite + TailwindCSS (位于 `frontend/im-frontend`)
- **数据库**: MySQL 8.0

## 功能特性

- ✅ 用户注册/登录 (JWT认证)
- ✅ 实时私聊消息 (WebSocket)
- ✅ 消息历史记录
- ✅ 文件上传 (图片、音频、文档)
- ✅ 群组聊天支持
- ✅ 好友系统
- ✅ 在线状态显示
- ✅ 消息已读状态
- ✅ 移动端适配

## 快速部署 (Docker)

### 1. 使用 Docker Compose 一键部署

```bash
# 克隆仓库
git clone https://github.com/Gymmmm/im-safechat.git
cd im-safechat

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

服务将在以下端口启动：
- 前端: http://localhost
- 后端API: http://localhost:3000
- MySQL: localhost:3306

### 2. 访问应用

打开浏览器访问 http://localhost

默认测试账号：
- 用户名: testuser / 密码: 123456
- 用户名: alice / 密码: 123456
- 用户名: bob / 密码: 123456

## 手动部署

### 环境要求

- Node.js >= 14.x
- MySQL >= 8.0
- npm 或 yarn

### 1. 数据库配置

```bash
# 登录MySQL
mysql -u root -p

# 创建数据库和用户
CREATE DATABASE chat_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fcim'@'localhost' IDENTIFIED BY 'MyNew@2025Safe';
GRANT ALL PRIVILEGES ON chat_app.* TO 'fcim'@'localhost';
FLUSH PRIVILEGES;

# 导入数据库结构
mysql -u fcim -p chat_app < mysql-init/init.sql
```

### 2. 后端部署

```bash
cd backend/im-backend

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env

# 编辑 .env 文件，配置数据库连接
nano .env

# 启动后端服务
npm start

# 使用 PM2 保持运行 (推荐生产环境)
npm install -g pm2
pm2 start app.js --name im-backend
pm2 save
pm2 startup
```

### 3. 前端部署

```bash
cd frontend/im-frontend

# 安装依赖
npm install

# 配置生产环境API地址
# 编辑 .env.production 文件
echo "VITE_API_BASE=http://your-domain.com:3001" > .env.production

# 构建生产版本
npm run build

# 部署到Nginx或其他Web服务器
# 构建产物在 dist/ 目录
```

### 4. Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/im-frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket代理
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 文件上传
    location /uploads {
        proxy_pass http://localhost:3001;
    }
}
```

## 生产环境优化

### 1. 数据库优化

```sql
-- 添加索引以提高查询性能
ALTER TABLE messages ADD INDEX idx_sender_receiver (sender_id, receiver_id);
ALTER TABLE messages ADD INDEX idx_created_at (created_at);

-- 定期清理旧消息（可选）
DELETE FROM messages WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### 2. 后端优化

- 启用 HTTPS
- 配置 CORS 白名单
- 启用日志记录
- 配置数据库连接池
- 启用 Redis 缓存会话

### 3. 前端优化

- 启用 CDN 加速
- 启用 Gzip 压缩
- 配置资源缓存策略
- 使用生产版本构建

## 环境变量说明

### 后端 (.env)

```env
# 数据库配置
DB_HOST=localhost          # 数据库主机
DB_USER=fcim              # 数据库用户
DB_PASSWORD=password      # 数据库密码
DB_NAME=chat_app          # 数据库名称

# JWT配置
JWT_SECRET=your_secret    # JWT密钥，生产环境必须更改

# 服务器配置
PORT=3001                 # 后端监听端口

# 功能开关
ENABLE_BOSS=false         # 是否启用管理面板
```

### 前端 (.env.production)

```env
VITE_API_BASE=http://your-domain.com:3001  # 后端API地址
```

## 监控和维护

### 查看日志

```bash
# PM2日志
pm2 logs im-backend

# Docker日志
docker-compose logs -f backend
```

### 数据备份

```bash
# 备份数据库
mysqldump -u fcim -p chat_app > backup_$(date +%Y%m%d).sql

# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/im-backend/uploads
```

### 性能监控

```bash
# 安装监控工具
pm2 install pm2-server-monit

# 查看性能指标
pm2 monit
```

## 安全建议

1. ✅ 修改默认的 JWT_SECRET
2. ✅ 使用强密码配置数据库
3. ✅ 启用 HTTPS
4. ✅ 配置防火墙规则
5. ✅ 定期更新依赖包
6. ✅ 限制文件上传大小和类型
7. ✅ 启用 SQL 注入防护
8. ✅ 配置 Rate Limiting

## 故障排查

### 后端无法启动

1. 检查数据库连接: `mysql -u fcim -p`
2. 检查端口占用: `lsof -i :3001`
3. 查看错误日志: `pm2 logs im-backend`

### WebSocket连接失败

1. 检查防火墙是否放行端口
2. 确认Nginx配置正确代理WebSocket
3. 检查CORS配置

### 文件上传失败

1. 检查uploads目录权限: `ls -la backend/im-backend/uploads`
2. 确认文件大小不超过限制
3. 检查磁盘空间: `df -h`

## 技术支持

- GitHub Issues: https://github.com/Gymmmm/im-safechat/issues
- 文档: 参见 README.md

## 许可证

MIT License
