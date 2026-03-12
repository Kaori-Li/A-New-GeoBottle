const express = require('express'); // 引入 express 框架
const router = express.Router(); // 创建路由实例
const authController = require('../controllers/authController'); // 引入对应的控制器
const authMiddleware = require('../middleware/authMiddleware');
const createRateLimiter = require('../middleware/rateLimitMiddleware');

const authWriteLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });
const authLoginLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10 });

router.post('/register', authWriteLimiter, authController.register);
router.post('/login', authLoginLimiter, authController.login);
router.post('/guest', authWriteLimiter, authController.guestLogin);
router.post('/logout', authMiddleware, authController.logout);
router.post('/logout-all', authMiddleware, authController.logoutAll);

module.exports = router; // 导出路由供 app.js 使用
