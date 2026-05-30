import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { SocialPlatform, PostStatus } from '@contentpilot/shared';
import { AppModule } from './../src/app.module';

describe('Posts & Storage (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;

  let ownerToken: string;
  let outsiderToken: string;
  let workspaceId: string;
  let postId: string;

  const ownerUser = {
    email: 'postsowner@provenpeak.com',
    password: 'Password123!',
    name: 'Posts Owner',
  };

  const outsiderUser = {
    email: 'postsoutsider@provenpeak.com',
    password: 'Password123!',
    name: 'Posts Outsider',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());

    // Clean database collections
    try {
      await mongooseConnection.collection('users').deleteMany({});
      await mongooseConnection.collection('workspaces').deleteMany({});
      await mongooseConnection.collection('posts').deleteMany({});
    } catch (e) {}

    // Register owner & outsider
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(ownerUser);
    ownerToken = ownerRes.body.accessToken;

    const outsiderRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(outsiderUser);
    outsiderToken = outsiderRes.body.accessToken;

    // Create a workspace for the owner explicitly
    const workspaceRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner Workspace' });
    workspaceId = workspaceRes.body._id;
  });

  afterAll(async () => {
    try {
      await mongooseConnection.collection('users').deleteMany({});
      await mongooseConnection.collection('workspaces').deleteMany({});
      await mongooseConnection.collection('posts').deleteMany({});
    } catch (e) {}
    await app.close();
  });

  describe('POST /api/v1/workspaces/:workspaceId/posts', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2); // 2 days in the future

    it('should create a new post successfully in the workspace', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/posts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'My First Post',
          caption: 'ContentPilot is awesome!',
          platforms: [SocialPlatform.LINKEDIN],
          scheduleAt: futureDate.toISOString(),
          hashtags: ['social', 'marketing'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe('My First Post');
      expect(response.body.workspaceId).toBe(workspaceId);
      postId = response.body._id;
    });

    it('should fail to create a post with a past schedule date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // yesterday

      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/posts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Past Post',
          caption: 'This should fail',
          platforms: [SocialPlatform.TWITTER],
          scheduleAt: pastDate.toISOString(),
        })
        .expect(400);
    });

    it('should block non-members from creating posts', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/posts`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          title: 'Outsider Post',
          caption: 'Hack attempt',
          platforms: [SocialPlatform.LINKEDIN],
          scheduleAt: futureDate.toISOString(),
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/workspaces/:workspaceId/posts', () => {
    it('should retrieve all posts inside the workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/posts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(postId);
    });

    it('should block unauthenticated access to posts', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/posts`)
        .expect(401);
    });
  });

  describe('GET /api/v1/workspaces/:workspaceId/posts/:id', () => {
    it('should fetch single post successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/posts/${postId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body._id).toBe(postId);
      expect(response.body.title).toBe('My First Post');
    });
  });

  describe('PATCH /api/v1/workspaces/:workspaceId/posts/:id', () => {
    it('should update post successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/workspaces/${workspaceId}/posts/${postId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'My Updated Post' })
        .expect(200);

      expect(response.body.title).toBe('My Updated Post');
    });
  });

  describe('GET /api/v1/workspaces/:workspaceId/media/presigned', () => {
    it('should return a pre-signed S3 or local development upload URL', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/media/presigned`)
        .query({ filename: 'image.png', mimeType: 'image/png' })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('uploadUrl');
      expect(response.body).toHaveProperty('downloadUrl');
      expect(response.body).toHaveProperty('mode');
    });
  });

  describe('DELETE /api/v1/workspaces/:workspaceId/posts/:id', () => {
    it('should remove post successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/workspaces/${workspaceId}/posts/${postId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Verify it is gone
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/posts/${postId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });
});
