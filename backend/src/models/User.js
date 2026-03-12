const mongoose = require('mongoose'); // 引入 Mongoose 库
const bcrypt = require('bcryptjs');   // 引入加密库，用于哈希密码

// 定义用户数据结构
const userSchema = new mongoose.Schema({
  // 用户名：必填，去空格，唯一索引
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    trim: true,
    unique: true,
    minlength: [2, '用户名至少2个字符']
  },
  // 密码：必填，查询时默认隐藏（安全性）
  password: {
    type: String,
    required: [true, '密码不能为空'],
    select: false // 在执行 find 查询时，默认不返回此字段
  },
  // 注册时间：自动生成
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 会话版本号：用于服务端主动失效历史 JWT。
  tokenVersion: {
    type: Number,
    default: 0,
  }
}, {
  // 自动管理 updatedAt 和 createdAt 字段
  timestamps: true 
});

// 【中间件】在保存用户信息到数据库之前，自动加密密码
userSchema.pre('save', async function(next) {
  // 如果密码没有被修改，直接跳过加密步骤
  if (!this.isModified('password')) return next();
  
  // 生成盐值（Salt）并进行哈希处理，强度为 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 【实例方法】校验用户输入的密码是否正确
userSchema.methods.comparePassword = async function(candidatePassword, userPassword) {
  // 使用 bcrypt 安全地比对明文和密文
  return await bcrypt.compare(candidatePassword, userPassword);
};

// 导出模型
module.exports = mongoose.model('User', userSchema);