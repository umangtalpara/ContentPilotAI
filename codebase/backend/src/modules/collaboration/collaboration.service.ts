import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { ActivityLog, ActivityLogDocument, ActivityAction } from './schemas/activity-log.schema';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<CommentDocument>,
    @InjectModel(ActivityLog.name) private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  async getComments(postId: string): Promise<CommentDocument[]> {
    return this.commentModel
      .find({ postId: new Types.ObjectId(postId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  async addComment(
    postId: string,
    userId: string,
    authorName: string,
    content: string,
  ): Promise<CommentDocument> {
    const comment = new this.commentModel({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
      authorName,
      content,
    });
    return comment.save();
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId.toString() !== userId) {
      throw new NotFoundException('Comment not found');
    }
    await comment.deleteOne();
  }

  // ---------------------------------------------------------------------------
  // Activity Logs
  // ---------------------------------------------------------------------------

  async logActivity(params: {
    workspaceId: string;
    userId?: string;
    actorName?: string;
    action: ActivityAction;
    details?: string;
  }): Promise<void> {
    try {
      const entry = new this.activityLogModel({
        workspaceId: new Types.ObjectId(params.workspaceId),
        userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
        actorName: params.actorName,
        action: params.action,
        details: params.details,
      });
      await entry.save();
    } catch (err: any) {
      // Fire-and-forget: never block primary operations for logging
      this.logger.error(`[CollaborationService] Failed to log activity: ${err.message}`);
    }
  }

  async getActivities(workspaceId: string, limit = 50): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
