require('dotenv').config(); // 在启动早期加载环境变量配置。
const mongoose = require('mongoose'); // 引入 Mongoose 用于连接 MongoDB
const app = require('./app'); // 引入上面定义的 Express 应用
const logger = require('./utils/logger');

// 从环境变量读取配置 (默认使用 localhost，生产环境通过 Docker 注入)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/geobottle';
const PORT = process.env.PORT || 3000;

// 连接 MongoDB 数据库
mongoose.connect(MONGO_URI)
  .then(() => {
    logger.info('DB_CONNECTED', { mongoUri: MONGO_URI });
    // 只有数据库连接成功后，才开始监听端口
    app.listen(PORT, () => {
      logger.info('SERVER_STARTED', { port: Number(PORT) });
    });
  })
  .catch((err) => {
    logger.error('DB_CONNECT_FAILED', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    process.exit(1); // 连接失败则强制退出进程
  });
