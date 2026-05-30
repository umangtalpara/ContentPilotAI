import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { UserRole } from '@contentpilot/shared';
import { AppModule } from './../src/app.module';

describe('WorkspacesController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;

  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;

  let ownerId: string;
  let memberId: string;
  let workspaceId: string;

  const ownerUser = {
    email: 'workspaceowner@provenpeak.com',
    password: 'Password123!',
    name: 'Workspace Owner',
  };

  const memberUser = {
    email: 'workspacemember@provenpeak.com',
    password: 'Password123!',
    name: 'Workspace Member',
  };

  const outsiderUser = {
    email: 'outsider@provenpeak.com',
    password: 'Password123!',
    name: 'Outsider User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());

    // Clean up
    try {
      await mongooseConnection.collection('users').deleteMany({});
      await mongooseConnection.collection('workspaces').deleteMany({});
    } catch (e) {}

    // 1. Register users and get tokens
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(ownerUser);
    ownerToken = ownerRes.body.accessToken;
    ownerId = ownerRes.body.user.id;

    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(memberUser);
    memberToken = memberRes.body.accessToken;
    memberId = memberRes.body.user.id;

    const outsiderRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(outsiderUser);
    outsiderToken = outsiderRes.body.accessToken;
  });

  afterAll(async () => {
    try {
      await mongooseConnection.collection('users').deleteMany({});
      await mongooseConnection.collection('workspaces').deleteMany({});
    } catch (e) {}
    await app.close();
  });

  describe('POST /api/v1/workspaces', () => {
    it('should create a new workspace successfully for owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'ProvenPeak Workspace' })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe('ProvenPeak Workspace');
      expect(response.body.ownerId).toBe(ownerId);
      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0].userId).toBe(ownerId);
      expect(response.body.members[0].role).toBe(UserRole.OWNER);

      workspaceId = response.body._id;
    });

    it('should prevent workspace creation without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/workspaces')
        .send({ name: 'Unauthenticated Workspace' })
        .expect(401);
    });
  });

  describe('GET /api/v1/workspaces', () => {
    it('should return workspaces that the user owns or belongs to', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(workspaceId);
    });
  });

  describe('GET /api/v1/workspaces/:id', () => {
    it('should retrieve workspace details successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body._id).toBe(workspaceId);
      expect(response.body.name).toBe('ProvenPeak Workspace');
    });
  });

  describe('PATCH /api/v1/workspaces/:id', () => {
    it('should allow owner to update workspace name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'ProvenPeak Solutions Workspace' })
        .expect(200);

      expect(response.body.name).toBe('ProvenPeak Solutions Workspace');
    });

    it('should block non-members from updating workspace name', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ name: 'Hacked Workspace' })
        .expect(403);
    });
  });

  describe('POST /api/v1/workspaces/:id/invite', () => {
    it('should allow owner to invite members to the workspace', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/invite`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: memberUser.email,
          role: UserRole.EDITOR,
        })
        .expect(201);

      expect(response.body.members).toHaveLength(2);
      expect(response.body.members[1].userId).toBe(memberId);
      expect(response.body.members[1].role).toBe(UserRole.EDITOR);
    });

    it('should block non-owners from inviting members', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/invite`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          email: outsiderUser.email,
          role: UserRole.VIEWER,
        })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/workspaces/:id/members/:userId', () => {
    it('should block non-owners from removing members', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/workspaces/${workspaceId}/members/${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('should allow owner to remove members from the workspace', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/workspaces/${workspaceId}/members/${memberId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.members).toHaveLength(1);
    });

    it('should block removing the owner of the workspace', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/workspaces/${workspaceId}/members/${ownerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(409);
    });
  });
});
