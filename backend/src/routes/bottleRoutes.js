const express = require('express'); // 引入 express 框架
const router = express.Router(); // 创建路由实例
const bottleController = require('../controllers/bottleController'); // 引入控制器
const authMiddleware = require('../middleware/authMiddleware'); // 引入鉴权中间件
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware'); // 引入可选鉴权中间件
const createRateLimiter = require('../middleware/rateLimitMiddleware');

const tossLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });
const nearbyLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120 });
const pickupLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

router.post('/toss', tossLimiter, authMiddleware, bottleController.tossBottle);
router.get('/nearby', nearbyLimiter, optionalAuthMiddleware, bottleController.getNearbyBottles);
router.get('/:id/pickup', pickupLimiter, authMiddleware, bottleController.pickupBottle);

module.exports = router; // 导出路由供 app.js 使用
