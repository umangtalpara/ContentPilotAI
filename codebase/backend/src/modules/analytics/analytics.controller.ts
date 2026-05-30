import { Controller, Get, Param, UseGuards, Request, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { Integration, IntegrationDocument } from '../integrations/schemas/integration.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PostStatus } from '@contentpilot/shared';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Integration.name) private readonly integrationModel: Model<IntegrationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  @Get()
  async getAnalytics(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    const wsId = new Types.ObjectId(workspaceId);
    const userId: string = req.user?.id ?? req.user?.userId ?? req.user?.sub;

    const [posts, integrations, user] = await Promise.all([
      this.postModel.find({ workspaceId: wsId }).exec(),
      this.integrationModel.find({ workspaceId: wsId }).exec(),
      this.userModel.findById(userId).exec(),
    ]);

    // Status breakdown
    const statusCounts: Record<string, number> = {
      [PostStatus.DRAFT]: 0,
      [PostStatus.SCHEDULED]: 0,
      [PostStatus.PUBLISHING]: 0,
      [PostStatus.PUBLISHED]: 0,
      [PostStatus.FAILED]: 0,
    };
    for (const post of posts) {
      if (statusCounts[post.status] !== undefined) {
        statusCounts[post.status]++;
      }
    }

    // Platform breakdown from all posts
    const platformCounts: Record<string, number> = {};
    for (const post of posts) {
      for (const platform of post.platforms ?? []) {
        platformCounts[platform] = (platformCounts[platform] ?? 0) + 1;
      }
    }

    // Recent activity — last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPosts = posts.filter((p) => {
      const created = (p as any).createdAt as Date | undefined;
      return created && new Date(created) >= thirtyDaysAgo;
    }).length;
    const recentPublished = posts.filter(
      (p) => p.status === PostStatus.PUBLISHED && p.publishedAt && new Date(p.publishedAt) >= thirtyDaysAgo,
    ).length;

    return {
      totalPosts: posts.length,
      statusCounts,
      platformCounts,
      recentActivity: {
        postsCreatedLast30Days: recentPosts,
        postsPublishedLast30Days: recentPublished,
      },
      integrations: {
        total: integrations.length,
        platforms: integrations.map((i) => ({
          platform: i.platform,
          name: i.profileDetails?.name ?? i.platform,
          handle: i.profileDetails?.handle,
        })),
      },
      aiCredits: {
        remaining: user?.aiCreditsRemaining ?? 0,
        subscriptionTier: (user as any)?.subscriptionTier ?? 'free',
        maxCredits:
          (user as any)?.subscriptionTier === 'agency'
            ? 5000
            : (user as any)?.subscriptionTier === 'pro'
            ? 500
            : 20,
      },
    };
  }
}
