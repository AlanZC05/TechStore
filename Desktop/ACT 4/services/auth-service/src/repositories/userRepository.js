const bcrypt = require('bcryptjs');
const config = require('../config/env');

/**
 * In-Memory User Repository (DAO Pattern mirroring `users` SQL table in database/schema.sql)
 * Seeds Admin and Customer accounts at startup using bcrypt cost factor 12.
 */
class UserRepository {
  constructor() {
    this.users = new Map();
    this.dummyHash = bcrypt.hashSync('DummyTimingProtectionPass123!', config.bcryptSaltRounds);
    this.seed();
  }

  seed() {
    const cost = config.bcryptSaltRounds; // 12 rounds
    const seededUsers = [
      {
        id: 'usr_9f8a7d6c5b4e',
        email: 'admin.demo@techstore.test',
        passwordHash: bcrypt.hashSync('AdminPass123!', cost),
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_1a2b3c4d5e6f',
        email: 'customer.demo@techstore.test',
        passwordHash: bcrypt.hashSync('CustomerPass123!', cost),
        role: 'customer',
        createdAt: new Date().toISOString()
      }
    ];

    for (const user of seededUsers) {
      this.users.set(user.id, user);
    }
  }

  findByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  findById(id) {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  getDummyHash() {
    return this.dummyHash;
  }
}

module.exports = new UserRepository();

