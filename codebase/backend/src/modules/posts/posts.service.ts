import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePostInput, UpdatePostInput, PostStatus } from '@contentpilot/shared';
import { Post, PostDocument } from './schemas/post.schema';
import { QueueService } from '../queue/queue.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { ActivityAction } from '../collaboration/schemas/activity-log.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private queueService: QueueService,
    private collaborationService: CollaborationService,
  ) {}

  async create(
    workspaceId: string,
    input: CreatePostInput,
    actorCtx?: { userId?: string; actorName?: string },
  ): Promise<PostDocument> {
    const scheduleDate = new Date(input.scheduleAt);
    if (scheduleDate <= new Date()) {
      throw new BadRequestException('Schedule date must be in the future');
    }

    const post = new this.postModel({
      ...input,
      workspaceId: new Types.ObjectId(workspaceId),
      scheduleAt: scheduleDate,
      status: PostStatus.SCHEDULED,
    });

    const saved = await post.save();
    await this.queueService.addPublishJob(saved._id.toString(), saved.scheduleAt);

    void this.collaborationService.logActivity({
      workspaceId,
      userId: actorCtx?.userId,
      actorName: actorCtx?.actorName,
      action: ActivityAction.POST_CREATED,
      details: `Post "${saved.title}" scheduled for ${saved.scheduleAt.toISOString()}`,
    });

    return saved;
  }

  async findAllByWorkspace(workspaceId: string): Promise<PostDocument[]> {
    return this.postModel
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .sort({ scheduleAt: 1 })
      .exec();
  }

  async findOne(workspaceId: string, id: string): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Post not found');
    }

    const post = await this.postModel.findOne({
      _id: new Types.ObjectId(id),
      workspaceId: new Types.ObjectId(workspaceId),
    }).exec();

    if (!post) {
      throw new NotFoundException('Post not found in this workspace');
    }

    return post;
  }

  async update(
    workspaceId: string,
    id: string,
    input: UpdatePostInput,
    actorCtx?: { userId?: string; actorName?: string },
  ): Promise<PostDocument> {
    const post = await this.findOne(workspaceId, id);
    const wasRescheduled = !!input.scheduleAt;

    if (input.scheduleAt) {
      const scheduleDate = new Date(input.scheduleAt);
      if (scheduleDate <= new Date()) {
        throw new BadRequestException('Schedule date must be in the future');
      }
      post.scheduleAt = scheduleDate;
    }

    if (input.title !== undefined) post.title = input.title;
    if (input.caption !== undefined) post.caption = input.caption;
    if (input.description !== undefined) post.description = input.description;
    if (input.hashtags !== undefined) post.hashtags = input.hashtags;
    if (input.mediaUrls !== undefined) post.mediaUrls = input.mediaUrls;
    if (input.platforms !== undefined) post.platforms = input.platforms;
    if ((input as any).status !== undefined) post.status = (input as any).status;
    if (input.isRecurring !== undefined) post.isRecurring = input.isRecurring;
    if (input.recurrenceRule !== undefined) post.recurrenceRule = input.recurrenceRule;

    const saved = await post.save();
    if (wasRescheduled) {
      await this.queueService.cancelPublishJob(saved._id.toString());
      await this.queueService.addPublishJob(saved._id.toString(), saved.scheduleAt);

      void this.collaborationService.logActivity({
        workspaceId,
        userId: actorCtx?.userId,
        actorName: actorCtx?.actorName,
        action: ActivityAction.POST_RESCHEDULED,
        details: `Post "${saved.title}" rescheduled to ${saved.scheduleAt.toISOString()}`,
      });
    }
    return saved;
  }

  async remove(
    workspaceId: string,
    id: string,
    actorCtx?: { userId?: string; actorName?: string },
  ): Promise<void> {
    const post = await this.findOne(workspaceId, id);
    const title = post.title;
    await this.queueService.cancelPublishJob(post._id.toString());
    await post.deleteOne();

    void this.collaborationService.logActivity({
      workspaceId,
      userId: actorCtx?.userId,
      actorName: actorCtx?.actorName,
      action: ActivityAction.POST_DELETED,
      details: `Post "${title}" was deleted`,
    });
  }

  async retryFailedPost(workspaceId: string, id: string): Promise<PostDocument> {
    const post = await this.findOne(workspaceId, id);
    if (post.status !== PostStatus.FAILED) {
      throw new BadRequestException('Only failed posts can be retried');
    }

    const minRetryDate = new Date(Date.now() + 60 * 1000);
    const retryScheduleAt = post.scheduleAt > minRetryDate ? post.scheduleAt : minRetryDate;

    post.scheduleAt = retryScheduleAt;
    post.status = PostStatus.SCHEDULED;
    post.errorMessage = undefined;

    const saved = await post.save();
    await this.queueService.cancelPublishJob(saved._id.toString());
    await this.queueService.addPublishJob(saved._id.toString(), saved.scheduleAt);

    void this.collaborationService.logActivity({
      workspaceId,
      action: ActivityAction.POST_RESCHEDULED,
      details: `Failed post "${saved.title}" retried for ${saved.scheduleAt.toISOString()}`,
    });

    return saved;
  }

  async createBulk(workspaceId: string, csvText: string): Promise<{ createdCount: number; errors: string[] }> {
    const rows = this.parseCsv(csvText);
    if (rows.length < 2) {
      throw new BadRequestException('CSV file is empty or missing data rows');
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const titleIdx = headers.indexOf('title');
    const captionIdx = headers.indexOf('caption');
    const scheduleAtIdx = headers.indexOf('scheduleat');
    const platformsIdx = headers.indexOf('platforms');
    const hashtagsIdx = headers.indexOf('hashtags');

    if (titleIdx === -1 || captionIdx === -1 || scheduleAtIdx === -1) {
      throw new BadRequestException('CSV must contain title, caption, and scheduleAt columns');
    }

    let createdCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < Math.max(titleIdx, captionIdx, scheduleAtIdx) + 1) {
        errors.push(`Row ${i + 1}: incomplete column count`);
        continue;
      }

      const title = row[titleIdx]?.trim();
      const caption = row[captionIdx]?.trim();
      const scheduleAtRaw = row[scheduleAtIdx]?.trim();

      if (!title || !caption || !scheduleAtRaw) {
        errors.push(`Row ${i + 1}: missing required values (title, caption, scheduleAt)`);
        continue;
      }

      const scheduleDate = new Date(scheduleAtRaw);
      if (isNaN(scheduleDate.getTime())) {
        errors.push(`Row ${i + 1}: invalid scheduleAt date format`);
        continue;
      }

      if (scheduleDate <= new Date()) {
        errors.push(`Row ${i + 1}: scheduleAt date must be in the future`);
        continue;
      }

      // Platforms parsing
      const platformsRaw = platformsIdx !== -1 ? row[platformsIdx]?.trim() : '';
      const platforms = platformsRaw
        ? platformsRaw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean) as any[]
        : ['linkedin'];

      // Hashtags parsing
      const hashtagsRaw = hashtagsIdx !== -1 ? row[hashtagsIdx]?.trim() : '';
      const hashtags = hashtagsRaw
        ? hashtagsRaw.split(',').map((t) => t.trim().replace('#', '')).filter(Boolean)
        : [];

      try {
        await this.create(workspaceId, {
          title,
          caption,
          scheduleAt: scheduleDate.toISOString(),
          platforms,
          hashtags,
          mediaUrls: [],
          isRecurring: false,
        });
        createdCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message || 'Creation failed'}`);
      }
    }

    return { createdCount, errors };
  }

  private parseCsv(csvText: string): string[][] {
    const result: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(field);
        field = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(field);
        if (row.length > 0 && row.some((f) => f.trim() !== '')) {
          result.push(row);
        }
        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    if (field || row.length > 0) {
      row.push(field);
      if (row.some((f) => f.trim() !== '')) {
        result.push(row);
      }
    }

    return result;
  }
}
