const mongoose = require('mongoose'); // 引入 Mongoose 库

// 定义漂流瓶的 Schema（数据结构定义）
const bottleSchema = new mongoose.Schema({
  // 瓶子内容：限制长度为 200 字，确保前端 UI 显示正常且性能可控
  content: { 
    type: String, 
    required: [true, '必须填写瓶子内容'], 
    maxlength: [600, '内容编码后长度不能超过 600 个字符'],
    trim: true // 自动去除首尾空格
  },
  
  // 关联用户：ObjectId 引用 User 模型，这是社交产品的核心关联
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '瓶子必须关联一个用户'] 
  },
  
  // 地理位置：符合 MongoDB GeoJSON 规范
  location: {
    type: { 
      type: String, 
      default: 'Point', // 默认为点位
      enum: ['Point']   // 强制类型校验
    },
    coordinates: { 
      type: [Number], // 格式：[经度, 纬度]
      required: [true, '坐标不能为空'] 
    }
  },
  
  // 过期时间：用于 TTL (Time To Live) 机制
  expireAt: { 
    type: Date, 
    required: [true, '必须设置过期时间'] 
  },

  // 已拾取记录：用于实现“已读/未读”闭环。
  // 每个元素代表某个用户在某个时间点已经成功拾取过该瓶子。
  pickedBy: [{
    // 拾取者用户 ID。
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 拾取时间。
    pickedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  // 自动添加 createdAt 和 updatedAt 字段，无需手动管理
  timestamps: true 
});

// 【索引 1】地理空间索引：为了实现“查找附近 50 米”的功能
// 没有这个索引，MongoDB 无法进行高效的空间查询
bottleSchema.index({ location: '2dsphere' });

// 【索引 2】TTL 索引：这是自动化清理机制
// expireAfterSeconds: 0 表示文档会在 expireAt 指定的时间点被数据库准时删除
bottleSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// 导出模型，供 Controller 使用
module.exports = mongoose.model('Bottle', bottleSchema);
