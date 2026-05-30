import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;

  const testUser = {
    email: 'test@provenpeak.com',
    password: 'Password123!',
    name: 'ProvenPeak Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());
    // Clear users before testing
    try {
      await mongooseConnection.collection('users').deleteMany({});
    } catch (e) {
      // Ignore if collection doesn't exist
    }
  });

  afterAll(async () => {
    // Clean up database collections and close connections
    try {
      await mongooseConnection.collection('users').deleteMany({});
      await mongooseConnection.collection('workspaces').deleteMany({});
    } catch (e) {
      // Ignore
    }
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email.toLowerCase());
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should fail registration with an existing email and return 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should fail registration with invalid input data formats', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
          name: 'A',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in an existing user and return access & refresh tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should fail login with incorrect credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
      refreshToken = response.body.refreshToken;
    });

    it('should rotate access & refresh tokens using a valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should refuse token refresh requests with an invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token-string' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
      accessToken = response.body.accessToken;
    });

    it('should retrieve the user profile successfully when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.email.toLowerCase());
      expect(response.body.name).toBe(testUser.name);
    });

    it('should block unauthenticated profile retrieval requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });
});
