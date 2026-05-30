import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from './../src/app.module';

describe('Billing, Collaboration & Analytics (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;

  let ownerToken: string;
  let ownerId: string;
  let workspaceId: string;
  let postId: string;

  const ownerUser = {
    email: 'billing-owner@provenpeak.com',
    password: 'Password123!',
    name: 'Billing Owner',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());

    // Clean test collections
    try {
      await mongooseConnection.collection('users').deleteMany({ email: ownerUser.email });
      await mongooseConnection.collection('workspaces').deleteMany({ name: 'Billing Workspace' });
      await mongooseConnection.collection('comments').deleteMany({});
      await mongooseConnection.collection('activitylogs').deleteMany({});
    } catch (e) {}

    // Register and login owner
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(ownerUser);
    expect(regRes.status).toBe(201);
    ownerToken = regRes.body.accessToken;
    ownerId = regRes.body.user?._id ?? regRes.body.user?.id;

    // Create workspace
    const wsRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Billing Workspace' });
    expect(wsRes.status).toBe(201);
    workspaceId = wsRes.body._id;
  });

  afterAll(async () => {
    try {
      await mongooseConnection.collection('users').deleteMany({ email: ownerUser.email });
      await mongooseConnection.collection('workspaces').deleteMany({ name: 'Billing Workspace' });
      await mongooseConnection.collection('comments').deleteMany({});
      await mongooseConnection.collection('activitylogs').deleteMany({});
    } catch (e) {}
    await app.close();
  });

  // -------------------------------------------------------------------------
  // 1. BILLING — Mock Webhook Subscription Upgrade
  // -------------------------------------------------------------------------
  describe('1. Billing — Mock Webhook Upgrade', () => {
    it('should reject mock-webhook with missing fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/mock-webhook')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject mock-webhook with invalid plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/mock-webhook')
        .send({ userId: ownerId, plan: 'enterprise' });
      expect(res.status).toBe(400);
    });

    it('should upgrade user to Pro via mock-webhook and replenish 500 credits', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/mock-webhook')
        .send({ userId: ownerId, plan: 'pro' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should verify Pro subscription tier reflects in analytics', async () => {
      // Give a small delay for write to settle
      await new Promise((r) => setTimeout(r, 100));

      const analyticsRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/analytics`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(analyticsRes.body.aiCredits.subscriptionTier).toBe('pro');
      expect(analyticsRes.body.aiCredits.remaining).toBe(500);
      expect(analyticsRes.body.aiCredits.maxCredits).toBe(500);
    });

    it('should upgrade user to Agency plan and replenish 5000 credits', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/billing/mock-webhook')
        .send({ userId: ownerId, plan: 'agency' })
        .expect(200);

      await new Promise((r) => setTimeout(r, 100));

      const analyticsRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/analytics`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(analyticsRes.body.aiCredits.subscriptionTier).toBe('agency');
      expect(analyticsRes.body.aiCredits.remaining).toBe(5000);
    });
  });

  // -------------------------------------------------------------------------
  // 2. POSTS — Create post for collaboration tests
  // -------------------------------------------------------------------------
  describe('2. Posts — Create post for collaboration', () => {
    it('should create a post for collaboration testing', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 5);
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/posts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Collaboration Test Post',
          caption: 'Testing comments and activity logs',
          platforms: ['linkedin'],
          scheduleAt: futureDate.toISOString(),
        })
        .expect(201);

      postId = res.body._id;
      expect(postId).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. COLLABORATION — Comments
  // -------------------------------------------------------------------------
  describe('3. Collaboration — Comments', () => {
    let commentId: string;

    it('should reject empty comment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ content: '   ' });
      expect(res.status).toBe(400);
    });

    it('should add a comment to a post', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ content: 'Great post idea! Let us refine the caption.' })
        .expect(201);

      commentId = res.body._id;
      expect(commentId).toBeDefined();
      expect(res.body.content).toBe('Great post idea! Let us refine the caption.');
      expect(res.body.authorName).toBe(ownerUser.name);
    });

    it('should retrieve comments for a post', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const found = res.body.find((c: any) => c._id === commentId);
      expect(found).toBeDefined();
    });

    it('should delete a comment', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/workspaces/${workspaceId}/posts/${postId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const found = res.body.find((c: any) => c._id === commentId);
      expect(found).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 4. COLLABORATION — Activity Feed
  // -------------------------------------------------------------------------
  describe('4. Collaboration — Activity Feed', () => {
    it('should return a workspace activity feed', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/activities`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // At minimum the post_created event should be logged
      const actions = res.body.map((a: any) => a.action);
      expect(actions).toContain('post_created');
    });

    it('should respect the limit query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/activities?limit=1`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 5. ANALYTICS — Dashboard Aggregates
  // -------------------------------------------------------------------------
  describe('5. Analytics — Dashboard Metrics', () => {
    it('should return aggregated workspace analytics', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/analytics`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalPosts');
      expect(res.body).toHaveProperty('statusCounts');
      expect(res.body).toHaveProperty('platformCounts');
      expect(res.body).toHaveProperty('recentActivity');
      expect(res.body).toHaveProperty('integrations');
      expect(res.body).toHaveProperty('aiCredits');
      expect(res.body.totalPosts).toBeGreaterThanOrEqual(1);
    });

    it('should reflect correct platform counts in analytics', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/analytics`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.platformCounts).toHaveProperty('linkedin');
      expect(res.body.platformCounts['linkedin']).toBeGreaterThanOrEqual(1);
    });

    it('should reject analytics request without auth token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/analytics`)
        .expect(401);
    });
  });
});
