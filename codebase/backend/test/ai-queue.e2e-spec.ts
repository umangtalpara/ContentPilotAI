import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from './../src/app.module';
import { QueueService } from '../src/modules/queue/queue.service';

describe('AI & Background Queue (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let queueService: QueueService;

  let ownerToken: string;
  let workspaceId: string;
  let ownerId: string;

  const ownerUser = {
    email: 'aiowner@provenpeak.com',
    password: 'Password123!',
    name: 'AI Owner',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());
    queueService = app.get<QueueService>(QueueService);

    // Clean database collections
    try {
      await mongooseConnection.collection('users').deleteMany({});
      await mongooseConnection.collection('workspaces').deleteMany({});
      await mongooseConnection.collection('posts').deleteMany({});
    } catch (e) {}

    // Register owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(ownerUser);
    ownerToken = ownerRes.body.accessToken;
    ownerId = ownerRes.body.user.id;

    // Create a workspace explicitly
    const workspaceRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'AI Owner Workspace' });
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

  describe('POST /api/v1/workspaces/:workspaceId/ai/generate-caption', () => {
    it('should generate a funny tone caption and consume 1 credit', async () => {
      // 1. Get initial credit count
      const profileBefore = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);
      
      const initialCredits = profileBefore.body.aiCreditsRemaining || 20;

      // 2. Request generation
      const response = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/ai/generate-caption`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          topic: 'Programming bugs',
          tone: 'funny',
          platform: 'linkedin',
        })
        .expect(201);

      expect(response.body).toHaveProperty('caption');
      expect(typeof response.body.caption).toBe('string');

      // 3. Get updated credit count
      const profileAfter = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(profileAfter.body.aiCreditsRemaining).toBe(initialCredits - 1);
    });

    it('should reject requests once user AI credits reach 0', async () => {
      // Set user's credits to 0 manually
      const user = await mongooseConnection.collection('users').findOne({});
      if (user) {
        await mongooseConnection
          .collection('users')
          .updateOne({ _id: user._id }, { $set: { aiCreditsRemaining: 0 } });
      }

      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/ai/generate-caption`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          topic: 'No credits left',
          tone: 'casual',
          platform: 'twitter',
        })
        .expect(400);
    });
  });

  describe('Posts automated Queue publications integration', () => {
    beforeAll(async () => {
      // Reset user's credits to allow post creation if checked
      await mongooseConnection
        .collection('users')
        .updateOne({}, { $set: { aiCreditsRemaining: 20 } });
    });

    it('should automatically queue a background publication job when a post is created', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3); // 3 days in future

      const response = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/posts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Scheduled Queue Post',
          caption: 'Auto-publish test campaign',
          platforms: ['linkedin'],
          scheduleAt: futureDate.toISOString(),
        })
        .expect(201);

      const createdPostId = response.body._id;

      // Verify that the job is listed inside the Queue service's job registry list!
      const jobs = queueService.getJobsList();
      const matchedJob = jobs.find((j) => j.postId === createdPostId);

      expect(matchedJob).toBeDefined();
      expect(matchedJob?.postId).toBe(createdPostId);
    });
  });
});
