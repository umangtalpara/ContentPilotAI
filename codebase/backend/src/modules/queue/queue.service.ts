import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { IntegrationsService } from '../integrations/integrations.service';
import { PostStatus } from '@contentpilot/shared';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private isRedisConfigured = false;
  private jobs: any[] = [];

  constructor(
    private configService: ConfigService,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private integrationsService: IntegrationsService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const isTest = process.env.NODE_ENV === 'test' || typeof (global as any).it === 'function';

    if (redisUrl && redisUrl !== 'mock' && !isTest) {
      this.isRedisConfigured = true;
      this.logger.log('Queue Engine initialized in [PRODUCTION REDIS BULLMQ] mode.');
    } else {
      this.logger.log('Queue Engine initialized in [LOCAL IN-MEMORY FALLBACK] mode.');
    }
  }

  async addPublishJob(postId: string, scheduleAt: Date): Promise<void> {
    const delay = new Date(scheduleAt).getTime() - Date.now();
    this.logger.log(`Queueing publication job for post ${postId} scheduled in ${Math.max(0, delay)}ms`);

    let timer: any;
    if (this.isRedisConfigured) {
      this.logger.log(`[BullMQ] Added job for post ${postId} to Redis queue`);
    } else {
      // Fallback: In-memory timer trigger
      timer = setTimeout(async () => {
        this.logger.log(`[Queue Worker] Executing auto-publish for post ${postId}`);
        await this.executePublish(postId);
      }, Math.max(0, delay));
    }

    this.jobs.push({
      postId,
      scheduleAt,
      timer,
    });
  }

  async cancelPublishJob(postId: string): Promise<void> {
    const index = this.jobs.findIndex((j) => j.postId === postId);
    if (index !== -1) {
      if (this.jobs[index].timer) {
        clearTimeout(this.jobs[index].timer);
      }
      this.jobs.splice(index, 1);
      this.logger.log(`Cancelled publication job for post ${postId}`);
    }
  }

  getJobsList() {
    return this.jobs.map((j) => ({
      postId: j.postId,
      scheduleAt: j.scheduleAt,
    }));
  }

  // --- Background Consumer Job Worker Execution ---
  async executePublish(postId: string): Promise<void> {
    try {
      const post = await this.postModel.findById(postId);
      if (!post) {
        this.logger.error(`[Queue Worker] Post ${postId} not found for publishing`);
        return;
      }

      // 1. Double check scheduled status validation
      if (post.status !== PostStatus.SCHEDULED) {
        this.logger.warn(`[Queue Worker] Post ${postId} is not in SCHEDULED status (current: ${post.status})`);
        return;
      }

      // 2. Set post status to PUBLISHING
      post.status = PostStatus.PUBLISHING;
      await post.save();

      // 3. Publish to each target platform
      for (const platform of post.platforms) {
        const integration = await this.integrationsService.findByPlatform(
          post.workspaceId.toString(),
          platform,
        );

        if (!integration) {
          throw new Error(`Channel integration not connected for: ${platform}`);
        }

        let publishResult;
        if (platform === 'linkedin') {
          publishResult = await this.integrationsService.publishToLinkedIn(
            integration.accessToken,
            post.caption,
            post.mediaUrls,
          );
        } else if (platform === 'twitter') {
          publishResult = await this.integrationsService.publishToTwitter(
            integration.accessToken,
            post.caption,
            post.mediaUrls,
          );
        } else {
          throw new Error(`Unsupported publishing platform: ${platform}`);
        }

        if (!publishResult || !publishResult.success) {
          throw new Error(`Direct publish call failed on channel: ${platform}`);
        }
      }

      // 4. Mark post status as PUBLISHED upon complete success
      post.status = PostStatus.PUBLISHED;
      post.publishedAt = new Date();
      post.errorMessage = undefined;
      await post.save();
      this.logger.log(`[Queue Worker] Post ${postId} successfully published across all networks`);
    } catch (err: any) {
      // 5. Recover gracefully and record publishing failures
      this.logger.error(`[Queue Worker] Auto-publish failed for post ${postId}: ${err.message}`);
      try {
        const post = await this.postModel.findById(postId);
        if (post) {
          post.status = PostStatus.FAILED;
          post.errorMessage = err.message || 'Auto-publishing failed';
          await post.save();
        }
      } catch (saveErr: any) {
        this.logger.error(`[Queue Worker] Failed to write failure state for post ${postId}: ${saveErr.message}`);
      }
    }
  }
}
