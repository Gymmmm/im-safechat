const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { 
  cors: { 
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// 路由引入（只保留一次）
const setupSocket = require('./socket');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');
const superSecretRoutes = require('./routes/superSecretRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

// 中间件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 确保uploads目录存在
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 文件上传
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'audio/mpeg', 'audio/wav', 'application/pdf'];
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('文件类型不支持'));
    }
    cb(null, true);
  }
});
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype });
});

// 路由挂载
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
if (process.env.ENABLE_BOSS === 'true') {
  app.use('/superpanel', superSecretRoutes);
}

// socket
setupSocket(io);

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制' });
    }
  }
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// 启动服务
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ IM 后端已启动，监听端口 ${PORT}`);
  console.log(`📁 上传目录: ${uploadsDir}`);
  console.log(`🔑 数据库: ${process.env.DB_HOST}:${process.env.DB_NAME}`);
});
