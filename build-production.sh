#!/bin/bash

# IM-SafeChat 生产环境构建脚本

echo "🏗️  开始构建 IM-SafeChat 生产版本..."

# 检查环境
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    exit 1
fi

# 构建前端
echo ""
echo "📦 构建前端..."
cd frontend/im-frontend

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

if [ ! -f ".env.production" ]; then
    echo "⚠️  警告: .env.production 不存在"
    echo "请创建 frontend/im-frontend/.env.production 并配置 VITE_API_BASE"
    exit 1
fi

echo "开始构建..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功! 输出目录: frontend/im-frontend/dist"
else
    echo "❌ 前端构建失败"
    exit 1
fi

# 检查后端依赖
echo ""
echo "📦 检查后端依赖..."
cd ../../backend/im-backend

if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 不存在"
    echo "请创建 backend/im-backend/.env 并配置数据库连接"
    exit 1
fi

echo "✅ 后端依赖已就绪"

# 创建部署包
echo ""
echo "📦 创建部署包..."
cd ../../

DEPLOY_DIR="deploy_$(date +%Y%m%d_%H%M%S)"
mkdir -p $DEPLOY_DIR

# 复制文件
echo "复制文件到 $DEPLOY_DIR..."
mkdir -p $DEPLOY_DIR/frontend
mkdir -p $DEPLOY_DIR/backend/im-backend
mkdir -p $DEPLOY_DIR/mysql-init

cp -r frontend/im-frontend/dist $DEPLOY_DIR/frontend/
cp -r backend/im-backend/* $DEPLOY_DIR/backend/im-backend/
cp -r mysql-init/* $DEPLOY_DIR/mysql-init/
cp docker-compose.yml $DEPLOY_DIR/
cp DEPLOYMENT.md $DEPLOY_DIR/
cp README.md $DEPLOY_DIR/

# 创建启动脚本
cat > $DEPLOY_DIR/start.sh << 'EOFSTART'
#!/bin/bash
cd backend/im-backend
npm start
EOFSTART

chmod +x $DEPLOY_DIR/start.sh

# 打包
echo "打包部署文件..."
tar -czf ${DEPLOY_DIR}.tar.gz $DEPLOY_DIR

echo ""
echo "======================================"
echo "✅ 构建完成!"
echo "======================================"
echo "部署包: ${DEPLOY_DIR}.tar.gz"
echo "解压后运行: cd $DEPLOY_DIR && ./start.sh"
echo ""
echo "或使用 Docker:"
echo "cd $DEPLOY_DIR && docker-compose up -d"
echo ""
