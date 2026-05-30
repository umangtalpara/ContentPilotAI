import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

export enum ActivityAction {
  POST_CREATED = 'post_created',
  POST_RESCHEDULED = 'post_rescheduled',
  POST_PUBLISHED = 'post_published',
  POST_FAILED = 'post_failed',
  POST_DELETED = 'post_deleted',
  MEMBER_INVITED = 'member_invited',
  COMMENT_ADDED = 'comment_added',
  PLAN_UPGRADED = 'plan_upgraded',
}

@Schema({ timestamps: true })
export class ActivityLog extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  /** Snapshot of the actor name so the feed renders without joins */
  @Prop({ trim: true })
  actorName?: string;

  @Prop({ type: String, enum: ActivityAction, required: true })
  action: ActivityAction;

  @Prop({ trim: true, maxlength: 512 })
  details?: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
