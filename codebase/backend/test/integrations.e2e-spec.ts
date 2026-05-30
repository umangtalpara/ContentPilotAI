import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from './../src/app.module';
import { IntegrationsService } from '../src/modules/integrations/integrations.service';

describe('Social Integrations & Bulk Scheduling (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let integrationsService: IntegrationsService;

  let ownerToken: string;
  let workspaceId: string;

  const ownerUser = {
    email: 'integrationsowner@provenpeak.com',
    password: 'Password123!',
    name: 'Integrations Owner',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());
    integrationsService = app.get<IntegrationsService>(IntegrationsService);

    // Clean database collections
    try {
      await mongooseConnection.collection('users').deleteMany({});
      await mongooseConnection.collection('workspaces').deleteMany({});
      await mongooseConnection.collection('posts').deleteMany({});
      await mongooseConnection.collection('integrations').deleteMany({});
    } catch (e) {}

    // Register owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(ownerUser);
    ownerToken = ownerRes.body.accessToken;

    // Create a workspace explicitly
    const workspaceRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Integration Workspace' });
    workspaceId = workspaceRes.body._id;
  });

  afterAll(async () => {
    try {
      await mongooseConnection.collection('users').deleteMany({});
      await mongooseConnection.collection('workspaces').deleteMany({});
      await mongooseConnection.collection('posts').deleteMany({});
      await mongooseConnection.collection('integrations').deleteMany({});
    } catch (e) {}
    await app.close();
  });

  describe('OAuth Redirect Callbacks & CRUD', () => {
    it('should complete LinkedIn mock callback successfully and save integration', async () => {
      // Direct callback request (redirect action)
      await request(app.getHttpServer())
        .get('/api/v1/integrations/linkedin/callback')
        .query({
          code: 'mock-code',
          state: workspaceId,
        })
        .expect(302)
        .expect('Location', 'http://localhost:3000/workspaces?connected=linkedin');

      // Check listing workspace integrations
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/integrations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].platform).toBe('linkedin');
      expect(listRes.body[0].profileDetails.name).toBe('ProvenPeak LinkedIn');
    });

    it('should complete Twitter mock callback successfully and save integration', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/integrations/twitter/callback')
        .query({
          code: 'mock-code',
          state: workspaceId,
        })
        .expect(302)
        .expect('Location', 'http://localhost:3000/workspaces?connected=twitter');

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/integrations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(listRes.body.length).toBe(2);
      const platforms = listRes.body.map((i: any) => i.platform);
      expect(platforms).toContain('linkedin');
      expect(platforms).toContain('twitter');
    });

    it('should delete workspace integration successfully', async () => {
      // Get all integrations
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/integrations`)
        .set('Authorization', `Bearer ${ownerToken}`);

      const deleteId = listRes.body.find((i: any) => i.platform === 'twitter').id;

      // Delete twitter integration
      await request(app.getHttpServer())
        .delete(`/api/v1/workspaces/${workspaceId}/integrations/${deleteId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Re-verify list has only linkedin
      const listResAfter = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/integrations`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(listResAfter.body.length).toBe(1);
      expect(listResAfter.body[0].platform).toBe('linkedin');
    });
  });

  describe('Post Auto-Publishing Queue Consumer', () => {
    it('should auto-publish post through in-memory queue consumer after scheduled delay', async () => {
      // 1. Create a post scheduled 150ms in the future
      const nearFutureDate = new Date(Date.now() + 150);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/posts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Immediate Auto-Publish Campaign',
          caption: 'Hello, world! This is my automatically published post.',
          platforms: ['linkedin'],
          scheduleAt: nearFutureDate.toISOString(),
        })
        .expect(201);

      const postId = response.body._id;
      expect(response.body.status).toBe('scheduled');

      // 2. Wait 300ms for queue worker consumer to fire and publish post
      await new Promise((res) => setTimeout(res, 350));

      // 3. Re-fetch post and verify status is 'published'!
      const checkRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/posts/${postId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(checkRes.body.status).toBe('published');
      expect(checkRes.body).toHaveProperty('publishedAt');
    });
  });

  describe('CSV Bulk Scheduler Parser', () => {
    it('should bulk parse CSV file and create posts successfully', async () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 5);
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 6);

      const csvContent = 
        `title,caption,scheduleAt,platforms,hashtags\n` +
        `"Bulk Post 1","Exciting bulk post 1","${futureDate1.toISOString()}","linkedin","marketing,saas"\n` +
        `"Bulk Post 2","Exciting bulk post 2","${futureDate2.toISOString()}","twitter","dev,cool"`;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/posts/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(csvContent, 'utf-8'), 'posts.csv')
        .expect(201);

      expect(response.body.createdCount).toBe(2);
      expect(response.body.errors.length).toBe(0);

      // Verify posts exist in calendar/list
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/posts`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // We should have the auto-published post from previous test + 2 new bulk posts = 3 total!
      expect(listRes.body.length).toBe(3);
    });
  });
});
