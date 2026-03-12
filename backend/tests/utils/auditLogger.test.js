const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const auditLoggerPath = path.resolve(__dirname, '../../src/utils/auditLogger.js');
const loggerPath = path.resolve(__dirname, '../../src/utils/logger.js');

test('auditLogger.recordAuditEvent should emit who/when/where/result fields', () => {
  delete require.cache[auditLoggerPath];

  let captured = null;
  require.cache[loggerPath] = {
    id: loggerPath,
    filename: loggerPath,
    loaded: true,
    exports: {
      info: (message, payload) => {
        captured = { message, payload };
      },
    },
  };

  const { recordAuditEvent } = require(auditLoggerPath);

  const req = {
    method: 'POST',
    originalUrl: '/api/auth/login',
    requestId: 'req-1',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
    user: { id: 'u1', role: 'user' },
  };

  recordAuditEvent(req, {
    action: 'AUTH_LOGIN_FAILED',
    result: 'denied',
    target: { username: 'alice' },
  });

  assert.equal(captured.message, 'AUDIT_EVENT');
  assert.equal(captured.payload.audit.action, 'AUTH_LOGIN_FAILED');
  assert.equal(captured.payload.audit.result, 'denied');
  assert.equal(captured.payload.audit.who.userId, 'u1');
  assert.equal(captured.payload.audit.where.ip, '127.0.0.1');
  assert.equal(typeof captured.payload.audit.at, 'string');
});
