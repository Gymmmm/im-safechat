# SafeChat 生产环境部署指南 (Production Deployment Guide)

## 🚀 快速部署 (Quick Deployment)

### 前置要求 (Prerequisites)
- Docker 20.10+
- Docker Compose v2.0+
- 至少 2GB 可用内存
- 开放端口：80 (HTTP)、443 (HTTPS，可选)

### 方式 1: 使用自动部署脚本（最简单）

```bash
# 1. 克隆项目
git clone https://github.com/yesuf435/im-safechat.git
cd im-safechat

# 2. 运行自动部署脚本
bash deploy-production.sh
```

脚本会自动：
- ✅ 检查 Docker 和 Docker Compose
- ✅ 帮助创建和配置 .env 文件
- ✅ 验证配置
- ✅ 构建并启动所有服务
- ✅ 检查服务健康状态

### 方式 2: 手动部署

```bash
# 1. 克隆项目
git clone https://github.com/yesuf435/im-safechat.git
cd im-safechat

# 2. 生产环境配置
cp .env.production.example .env
# 编辑 .env 文件，修改以下关键配置：
# - MONGO_INITDB_ROOT_PASSWORD（数据库密码）
# - JWT_SECRET（JWT密钥）
# - ALLOWED_ORIGINS（允许的前端域名）

# 3. 启动所有服务
docker compose -f docker-compose.prod.yml up -d

# 4. 查看服务状态
docker compose -f docker-compose.prod.yml ps

# 5. 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

访问 `http://your-server-ip` 即可使用！

---

## 📋 部署检查清单 (Deployment Checklist)

### 部署前 (Before Deployment)
- [ ] 确认服务器已安装 Docker 和 Docker Compose
- [ ] 配置防火墙，开放必要端口（80、443）
- [ ] 准备域名并配置 DNS 解析（可选）
- [ ] 复制并编辑 `.env` 文件，设置强密码和密钥

### 部署中 (During Deployment)
- [ ] 执行 `docker compose -f docker-compose.prod.yml up -d`
- [ ] 等待所有容器启动（约 30-60 秒）
- [ ] 检查容器运行状态：`docker compose ps`
- [ ] 验证后端健康检查：`curl http://localhost:3000/health`

### 部署后 (After Deployment)
- [ ] 访问前端页面，测试注册和登录功能
- [ ] 创建测试用户，验证私信和群聊功能
- [ ] 检查 WebSocket 连接是否正常（浏览器 F12 控制台）
- [ ] 配置 HTTPS（推荐使用 Caddy 或 Nginx 反向代理）
- [ ] 设置数据库定期备份
- [ ] 配置日志轮转和监控

---

## 🔐 安全配置 (Security Configuration)

### 必须修改的配置项
1. **MongoDB 密码**：修改 `.env` 中的 `MONGO_INITDB_ROOT_PASSWORD`
2. **JWT 密钥**：修改 `.env` 中的 `JWT_SECRET`（建议使用 64 位随机字符串）
3. **CORS 配置**：修改 `ALLOWED_ORIGINS`，仅允许信任的域名

### 生成强密码示例
```bash
# 生成 MongoDB 密码
openssl rand -base64 32

# 生成 JWT 密钥
openssl rand -base64 64
```

### 防火墙配置（Ubuntu/Debian）
```bash
# 开放 HTTP
sudo ufw allow 80/tcp

# 开放 HTTPS（如果使用）
sudo ufw allow 443/tcp

# 不要对外开放 MongoDB 端口 27017
# 不要对外开放后端端口 3000/3001
```

---

## 🌐 HTTPS 配置 (Optional but Recommended)

### 方式 1：使用 Caddy（推荐，自动 HTTPS）
```bash
# 安装 Caddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 配置 Caddyfile
sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
yourdomain.com {
    reverse_proxy localhost:80
}
EOF

# 重启 Caddy
sudo systemctl restart caddy
```

### 方式 2：使用 Nginx + Certbot
详见 [DOCKER_DEPLOY.md](DOCKER_DEPLOY.md) 中的 HTTPS 配置部分。

---

## 📊 监控和维护 (Monitoring & Maintenance)

### 查看服务状态
```bash
# 查看所有容器状态
docker compose -f docker-compose.prod.yml ps

# 查看后端日志
docker compose -f docker-compose.prod.yml logs -f backend

# 查看 MongoDB 日志
docker compose -f docker-compose.prod.yml logs -f mongodb

# 查看前端 Nginx 日志
docker compose -f docker-compose.prod.yml logs -f frontend
```

### 数据备份
```bash
# 备份 MongoDB 数据
docker exec im-mongodb-prod mongodump \
  --username admin \
  --password YOUR_PASSWORD \
  --authenticationDatabase admin \
  --out /backup

# 导出备份文件
docker cp im-mongodb-prod:/backup ./mongodb-backup-$(date +%Y%m%d)
```

### 更新应用
```bash
# 拉取最新代码
git pull origin main

# 重建并重启服务
docker compose -f docker-compose.prod.yml up -d --build

# 清理旧镜像
docker image prune -f
```

---

## 🚨 故障排查 (Troubleshooting)

### 问题 1：容器启动失败
```bash
# 查看容器日志
docker compose -f docker-compose.prod.yml logs [service_name]

# 检查端口占用
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :27017
```

### 问题 2：前端无法连接后端
```bash
# 测试后端健康检查
curl http://localhost:3000/health

# 检查 Nginx 配置
docker compose -f docker-compose.prod.yml exec frontend cat /etc/nginx/conf.d/default.conf

# 查看 Nginx 错误日志
docker compose -f docker-compose.prod.yml logs frontend
```

### 问题 3：MongoDB 连接失败
```bash
# 测试 MongoDB 连接
docker compose -f docker-compose.prod.yml exec mongodb mongosh \
  -u admin -p YOUR_PASSWORD --authenticationDatabase admin

# 检查 MongoDB 日志
docker compose -f docker-compose.prod.yml logs mongodb
```

### 问题 4：WebSocket 连接失败
- 检查浏览器控制台是否有 Socket.IO 错误
- 确认 Nginx 配置正确代理 `/socket.io` 路径
- 验证防火墙没有阻止 WebSocket 连接

---

## 📚 相关文档 (Related Documentation)

- [Docker 部署详细指南](DOCKER_DEPLOY.md) - Docker 部署完整说明
- [宝塔面板部署指南](deploy/BAOTA_DEPLOY.md) - 适用于宝塔面板的部署方式
- [README.md](README.md) - 项目功能和快速开始
- [使用指南.md](使用指南.md) - 功能使用说明

---

## ✅ 部署完成确认 (Deployment Verification)

部署成功后，请验证以下功能：

1. ✅ 可以访问前端页面
2. ✅ 可以注册新用户
3. ✅ 可以登录系统
4. ✅ 可以添加好友
5. ✅ 可以发送私信
6. ✅ 可以创建群聊
7. ✅ WebSocket 连接正常（实时消息）
8. ✅ 刷新页面后消息历史正常显示

---

## 🎉 部署成功！

现在你已经成功部署了 SafeChat 即时通信系统！

如有问题，请查看：
- 故障排查部分
- GitHub Issues
- 相关文档链接

**祝使用愉快！** 🚀
