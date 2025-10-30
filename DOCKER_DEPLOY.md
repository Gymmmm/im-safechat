# SafeChat Docker 部署指南

本指南介绍如何使用 Docker Compose 快速部署 SafeChat 即时通信系统。

## 快速开始

### 前提条件

- Docker 20.10+
- Docker Compose v2.0+

### 一键部署

```bash
# 克隆项目
git clone https://github.com/yesuf435/im-safechat.git
cd im-safechat

# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f
```

访问 `http://localhost` 即可使用 SafeChat。

## 服务说明

Docker Compose 会启动以下三个服务：

### 1. MongoDB (im-mongodb)

- **端口**: 27017
- **用户**: admin
- **密码**: MyNew@2025Safe
- **数据库**: safechat
- **数据持久化**: 使用 Docker volume `mongodb_data`

### 2. Backend (im-backend)

- **内部端口**: 3001
- **映射端口**: 3000 (主机端口 3000 映射到容器的 3001)
- **环境变量**:
  - `MONGODB_URI`: MongoDB 连接字符串
  - `JWT_SECRET`: JWT 密钥
  - `PORT`: 后端服务端口
  - `ALLOWED_ORIGINS`: 允许的跨域来源

### 3. Frontend (im-frontend)

- **端口**: 80
- **技术**: Nginx + 静态文件
- **功能**: 
  - 提供前端页面
  - 反向代理 `/api` 到后端
  - 反向代理 `/socket.io` 到后端 WebSocket

## 配置自定义

### 修改数据库密码

编辑 `docker-compose.yml`:

```yaml
mongodb:
  environment:
    MONGO_INITDB_ROOT_USERNAME: your_username
    MONGO_INITDB_ROOT_PASSWORD: your_password

backend:
  environment:
    - MONGODB_URI=mongodb://your_username:your_password@mongodb:27017/safechat?authSource=admin
```

### 修改端口映射

```yaml
frontend:
  ports:
    - "8080:80"  # 将前端映射到 8080 端口

backend:
  ports:
    - "3002:3001"  # 将后端映射到 3002 端口
```

### 修改 JWT 密钥

```yaml
backend:
  environment:
    - JWT_SECRET=your_super_secret_key_here
```

## 生产环境部署建议

### 1. 使用 HTTPS

推荐在 Nginx 前面配置反向代理（如 Caddy、Traefik）或使用云服务的 SSL 终止。

### 2. 配置域名

修改 `nginx.conf` 中的 `server_name`:

```nginx
server_name yourdomain.com;
```

### 3. 持久化数据备份

定期备份 MongoDB 数据：

```bash
# 备份
docker exec im-mongodb mongodump --username admin --password MyNew@2025Safe --authenticationDatabase admin --out /data/backup

# 恢复
docker exec im-mongodb mongorestore --username admin --password MyNew@2025Safe --authenticationDatabase admin /data/backup
```

### 4. 监控和日志

```bash
# 查看所有服务状态
docker compose ps

# 查看后端日志
docker compose logs -f backend

# 查看 MongoDB 日志
docker compose logs -f mongodb

# 查看 Nginx 日志
docker compose logs -f frontend
```

### 5. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

## 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f [service_name]

# 进入容器
docker compose exec backend sh
docker compose exec mongodb mongosh

# 重建并启动
docker compose up -d --build

# 停止并删除所有数据（谨慎使用）
docker compose down -v
```

## 性能优化

### Nginx 优化

`nginx.conf` 已包含以下优化：

- ✅ Gzip 压缩
- ✅ 静态资源缓存
- ✅ 安全响应头
- ✅ WebSocket 支持
- ✅ 合理的超时配置

### MongoDB 优化

```yaml
mongodb:
  command: mongod --wiredTigerCacheSizeGB 1.5
```

### 后端优化

使用 Node.js 集群模式：

修改 `backend/Dockerfile`:

```dockerfile
CMD ["node", "-r", "cluster", "app.js"]
```

## 故障排查

### 1. 前端无法连接后端

**检查**:
```bash
# 测试后端是否运行
curl http://localhost:3000/api/health

# 检查 Nginx 配置
docker compose exec frontend cat /etc/nginx/conf.d/default.conf

# 查看后端日志
docker compose logs backend
```

### 2. MongoDB 连接失败

**检查**:
```bash
# 测试 MongoDB 连接
docker compose exec mongodb mongosh -u admin -p MyNew@2025Safe --authenticationDatabase admin

# 查看 MongoDB 日志
docker compose logs mongodb
```

### 3. WebSocket 连接失败

**检查**:
- 浏览器控制台是否有 Socket.IO 错误
- Nginx 是否正确配置了 WebSocket 代理
- 防火墙是否阻止了 WebSocket 连接

### 4. 容器启动失败

**检查**:
```bash
# 查看所有容器状态
docker compose ps

# 查看失败容器的日志
docker compose logs [service_name]

# 检查端口是否被占用
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :27017
```

## 网络安全

### 防火墙配置

仅开放必要端口：

```bash
# UFW 示例
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# 不要开放 3000, 27017 到公网
```

### 环境变量安全

生产环境使用 `.env` 文件：

```bash
# 创建 .env 文件
cat > .env <<EOF
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
EOF

# 在 docker-compose.yml 中引用
environment:
  - JWT_SECRET=${JWT_SECRET}
```

## 升级和维护

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重建并启动
docker compose up -d --build

# 清理旧镜像
docker image prune -f
```

### 数据迁移

导出和导入数据：

```bash
# 导出
docker exec im-mongodb mongodump --uri="mongodb://admin:MyNew@2025Safe@localhost:27017/safechat?authSource=admin" --out=/backup

# 导入到新环境
docker exec im-mongodb mongorestore --uri="mongodb://admin:MyNew@2025Safe@localhost:27017/safechat?authSource=admin" /backup/safechat
```

## 技术支持

如遇到问题：

1. 查看 [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
2. 查看 [DEPLOYMENT.md](DEPLOYMENT.md)
3. 检查 Docker 日志
4. 验证网络连接
5. 查看浏览器控制台

---

**最后更新**: 2025-10-18
