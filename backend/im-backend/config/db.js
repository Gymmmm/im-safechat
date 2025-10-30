const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/safechat';

/**
 * 连接 MongoDB 数据库
 */
async function connectDatabase(uri = MONGODB_URI) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB 连接成功');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    throw error;
  }
}

/**
 * 断开数据库连接
 */
async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB 已断开连接');
  } catch (error) {
    console.error('❌ MongoDB 断开连接失败:', error.message);
    throw error;
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  mongoose
};
