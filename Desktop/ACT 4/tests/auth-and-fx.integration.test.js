const request = require('supertest');
const jwt = require('jsonwebtoken');
const authApp = require('../services/auth-service/src/app');
const fxApp = require('../services/fx-microservice/src/app');

describe('TechStore MX — Evidence 3 & Evidence 4 Integration Test Suite (Auth & FX Microservice)', () => {
  let adminAccessToken = '';
  let customerAccessToken = '';

  // 1. Login 200 OK
  test('1. POST /api/v1/auth/login with valid admin credentials returns 200 OK, HS256 JWT, and HttpOnly refreshToken cookie', async () => {
    const res = await request(authApp)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.demo@techstore.test',
        password: 'AdminPass123!'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.expiresIn).toBe(900);
    expect(res.body.user).toEqual({
      id: 'usr_9f8a7d6c5b4e',
      email: 'admin.demo@techstore.test',
      role: 'admin'
    });

    // Verify Set-Cookie header contains HttpOnly, SameSite=Strict, Path=/api/v1/auth
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/refreshToken=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
    expect(cookies[0]).toMatch(/SameSite=Strict/i);
    expect(cookies[0]).toMatch(/Path=\/api\/v1\/auth/);

    // Verify JWT header & payload claims
    const decoded = jwt.decode(res.body.accessToken, { complete: true });
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.payload.sub).toBe('usr_9f8a7d6c5b4e');
    expect(decoded.payload.role).toBe('admin');
    expect(decoded.payload.iss).toBe('techstore-auth-service');
    expect(decoded.payload.aud).toEqual(
      expect.arrayContaining(['techstore-main-backend', 'techstore-fx-microservice'])
    );

    adminAccessToken = res.body.accessToken;
  });

  // 2. Wrong password 401 Unauthorized
  test('2. POST /api/v1/auth/login with wrong password returns 401 Unauthorized without leaking stack traces', async () => {
    const res = await request(authApp)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.demo@techstore.test',
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: 'Invalid credentials'
    });
    expect(res.body.stack).toBeUndefined();
  });

  // 3. Current rate 200 OK
  test('3. GET /api/v1/rates/current returns 200 OK with USD/MXN exchange rate payload', async () => {
    const res = await request(fxApp).get('/api/v1/rates/current?base=USD&target=MXN');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pair', 'USD/MXN');
    expect(typeof res.body.rate).toBe('number');
    expect(res.body.rate).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('updatedAt');
    expect(res.body).toHaveProperty('stale', false);
  });

  // 4. Negative amount 400 Bad Request
  test('4. POST /api/v1/rates/convert with negative amount (-100) returns 400 Bad Request ValidationError', async () => {
    const res = await request(fxApp)
      .post('/api/v1/rates/convert')
      .send({
        amount: -100,
        from: 'EUR',
        to: 'USD'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        {
          field: 'amount',
          message: 'Amount must be a positive number greater than 0'
        },
        {
          field: 'from',
          message: 'Currency code must be a valid 3-letter ISO 4217 string (MXN, USD)'
        }
      ])
    );
  });

  // 5. Refresh without token 401 Unauthorized
  test('5. POST /api/v1/rates/refresh without Authorization header returns 401 Unauthorized', async () => {
    const res = await request(fxApp)
      .post('/api/v1/rates/refresh')
      .send({ currency: 'USD' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization Bearer header'
    });
  });

  // 6. Refresh with tampered token 401 Unauthorized
  test('6. POST /api/v1/rates/refresh with tampered JWT signature returns 401 Unauthorized', async () => {
    const tamperedToken = `${adminAccessToken.slice(0, -8)}tampered`;

    const res = await request(fxApp)
      .post('/api/v1/rates/refresh')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .send({ currency: 'USD' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: 'Unauthorized',
      message: 'Invalid token signature or expired credential'
    });
  });

  // 7. Refresh with customer role 403 Forbidden
  test('7. POST /api/v1/rates/refresh with valid customer role token returns 403 Forbidden (RBAC)', async () => {
    const loginRes = await request(authApp)
      .post('/api/v1/auth/login')
      .send({
        email: 'customer.demo@techstore.test',
        password: 'CustomerPass123!'
      });

    expect(loginRes.status).toBe(200);
    customerAccessToken = loginRes.body.accessToken;

    const res = await request(fxApp)
      .post('/api/v1/rates/refresh')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({ currency: 'USD' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'Forbidden',
      message: 'Insufficient permissions: admin role required'
    });
  });

  // 8. Refresh with admin role 201 Created
  test('8. POST /api/v1/rates/refresh with valid admin role token returns 201 Created with Banxico-SF43718 rate', async () => {
    const res = await request(fxApp)
      .post('/api/v1/rates/refresh')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ currency: 'USD' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('pair', 'USD/MXN');
    expect(typeof res.body.rate).toBe('number');
    expect(res.body.rate).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('source', 'Banxico-SF43718');
    expect(res.body).toHaveProperty('updatedAt');
  });

  // 9. Upstream failure fallback 502 Bad Gateway
  test('9. POST /api/v1/rates/refresh?simulateDown=true handles upstream Banxico failure gracefully with 502 Bad Gateway and stale cache', async () => {
    const res = await request(fxApp)
      .post('/api/v1/rates/refresh?simulateDown=true')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ currency: 'USD' });

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error', 'BadGateway');
    expect(res.body).toHaveProperty('stale', true);
    expect(typeof res.body.cachedRate).toBe('number');
    expect(res.body.stack).toBeUndefined();
  });
});

