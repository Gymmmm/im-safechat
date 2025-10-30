#!/bin/bash
#
# SafeChat 生产环境部署脚本 (Production Deployment Script)
# 
# 使用方法: bash deploy-production.sh
#

set -e

echo "======================================"
echo "SafeChat 生产环境部署"
echo "SafeChat Production Deployment"
echo "======================================"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装 (Docker not installed)"
    echo "请访问 https://docs.docker.com/get-docker/ 安装 Docker"
    exit 1
fi
echo "✅ Docker 已安装"

# 检查 Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装 (Docker Compose not installed)"
    echo "请访问 https://docs.docker.com/compose/install/ 安装 Docker Compose"
    exit 1
fi
echo "✅ Docker Compose 已安装"

echo ""
echo "======================================"
echo "环境配置检查 (Environment Configuration)"
echo "======================================"
echo ""

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件 (.env file not found)"
    echo ""
    read -p "是否从模板创建 .env 文件? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.production.example .env
        echo "✅ 已创建 .env 文件"
        echo ""
        echo "⚠️  重要: 请编辑 .env 文件并修改以下配置："
        echo "   1. MONGO_INITDB_ROOT_PASSWORD (数据库密码)"
        echo "   2. JWT_SECRET (JWT密钥)"
        echo "   3. ALLOWED_ORIGINS (允许的域名)"
        echo ""
        read -p "按回车键继续编辑 .env 文件..."
        ${EDITOR:-nano} .env
    else
        echo "❌ 部署已取消 (Deployment cancelled)"
        exit 1
    fi
else
    echo "✅ .env 文件已存在"
fi

echo ""
echo "======================================"
echo "开始部署 (Starting Deployment)"
echo "======================================"
echo ""

# 验证 docker-compose 配置
echo "📋 验证 Docker Compose 配置..."
if docker compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo "✅ Docker Compose 配置有效"
else
    echo "❌ Docker Compose 配置无效"
    exit 1
fi

# 停止旧容器（如果存在）
echo ""
echo "🛑 停止旧容器（如果存在）..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# 构建并启动服务
echo ""
echo "🚀 构建并启动服务..."
docker compose -f docker-compose.prod.yml up -d --build

# 等待服务启动
echo ""
echo "⏳ 等待服务启动 (等待 30 秒)..."
sleep 30

# 检查服务状态
echo ""
echo "📊 检查服务状态..."
docker compose -f docker-compose.prod.yml ps

# 检查后端健康状态
echo ""
echo "🏥 检查后端健康状态..."
for i in {1..12}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ 后端服务健康"
        break
    fi
    if [ $i -eq 12 ]; then
        echo "❌ 后端健康检查失败"
        echo ""
        echo "查看日志:"
        docker compose -f docker-compose.prod.yml logs backend --tail 50
        exit 1
    fi
    echo "等待后端启动... ($i/12)"
    sleep 5
done

echo ""
echo "======================================"
echo "✅ 部署完成! (Deployment Complete!)"
echo "======================================"
echo ""
echo "📱 访问地址:"
echo "   前端: http://localhost"
echo "   后端: http://localhost:3000"
echo "   健康检查: http://localhost:3000/health"
echo ""
echo "📊 查看日志:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🛑 停止服务:"
echo "   docker compose -f docker-compose.prod.yml down"
echo ""
echo "📖 更多信息请查看:"
echo "   - PRODUCTION_DEPLOYMENT.md (生产部署指南)"
echo "   - DEPLOYMENT_STATUS.md (部署状态)"
echo "   - DOCKER_DEPLOY.md (Docker详细说明)"
echo ""
echo "🎉 祝使用愉快!"
