const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const path = require('path');require('dotenv').config();

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
app.use(httpLogger); // HTTP 请求日志
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
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'audio/mpeg', 'audio/wav'];
const maxFileSize = (process.env.MAX_FILE_SIZE || 10) * 1024 * 1024; // MB to bytes

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
    cb(null, true);
  }
});
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype });

app.post('/upload', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '未上传文件' 
      });
    }
    
    res.json({ 
      success: true,
      data: {
        url: `/uploads/${req.file.filename}`,
        type: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    next(error);
  }
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

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 连接数据库并启动服务
const PORT = process.env.PORT || 3001;
connectDatabase()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`✅ IM 后端已启动，监听端口 ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    logger.error(`❌ 启动失败: ${error.message}`);
    process.exit(1);
  });

// 导出 app 用于测试
module.exports = app;
