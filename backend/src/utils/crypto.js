const crypto = require('crypto');

// 定义加密版本标识，便于未来做算法升级与兼容。
const ENCRYPTION_VERSION = 'v1';
// AES-GCM 推荐 12 字节随机 IV。
const IV_LENGTH = 12;

// 生成指定长度的随机字节码，用于创建 API 秘钥或临时凭证
exports.generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// 解析内容加密密钥：支持 base64 / 原始字符串两种输入。
const resolveContentKey = () => {
  const configured = process.env.CONTENT_ENCRYPTION_KEY;

  if (configured && configured.trim().length > 0) {
    // 优先尝试按 base64 解码。
    const base64Buffer = Buffer.from(configured, 'base64');
    if (base64Buffer.length === 32) {
      return base64Buffer;
    }

    // 兼容直接传入任意字符串的场景，统一散列成 32 字节。
    return crypto.createHash('sha256').update(configured).digest();
  }

  // 生产环境必须显式配置内容加密密钥。
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境缺少 CONTENT_ENCRYPTION_KEY 配置。');
  }

  // 非生产环境使用可复现的本地回退密钥，便于开发测试。
  return crypto.createHash('sha256').update('geobottle-dev-content-key').digest();
};

// 内容加密存储（AES-256-GCM）。
exports.encodeContent = (content = '') => {
  const key = resolveContentKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(String(content), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
};

// 内容解密：优先按 v1 解密，兼容历史 Base64 存量数据。
exports.decodeContent = (encodedContent = '') => {
  const raw = String(encodedContent);

  if (raw.startsWith(`${ENCRYPTION_VERSION}:`)) {
    const [, ivBase64, tagBase64, cipherBase64] = raw.split(':');
    const key = resolveContentKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'));

    decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherBase64, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  // 兼容旧数据：历史实现是 Base64 编码。
  return Buffer.from(raw, 'base64').toString('utf8');
};
