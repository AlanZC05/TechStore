const crypto = require('crypto');

/**
 * In-Memory Refresh Token Repository (DAO Pattern mirroring `refresh_tokens` SQL table)
 * Supports stateful refresh token issuance, single-use rotation, and revocation.
 */
class RefreshTokenRepository {
  constructor() {
    this.tokens = new Map();
  }

  create(userId, ttlMs = 7 * 24 * 60 * 60 * 1000) {
    const token = crypto.randomUUID();
    const record = {
      token,
      userId,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      revoked: false,
      createdAt: new Date().toISOString()
    };
    this.tokens.set(token, record);
    return { ...record };
  }

  findValidToken(token) {
    if (!token || typeof token !== 'string') {
      return null;
    }
    const record = this.tokens.get(token);
    if (!record || record.revoked) {
      return null;
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      record.revoked = true;
      return null;
    }
    return { ...record };
  }

  revoke(token) {
    const record = this.tokens.get(token);
    if (record) {
      record.revoked = true;
      return true;
    }
    return false;
  }

  rotate(oldToken) {
    const existing = this.findValidToken(oldToken);
    if (!existing) {
      return null;
    }
    this.revoke(oldToken);
    return this.create(existing.userId);
  }
}

module.exports = new RefreshTokenRepository();

