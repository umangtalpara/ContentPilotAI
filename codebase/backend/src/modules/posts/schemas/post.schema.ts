import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { SocialPlatform, PostStatus } from '@contentpilot/shared';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  caption: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  hashtags: string[];

  @Prop({ type: [String], default: [] })
  mediaUrls: string[];

  @Prop({ required: true, type: [String], enum: Object.values(SocialPlatform) })
  platforms: SocialPlatform[];

  @Prop({ required: true, type: String, enum: Object.values(PostStatus), default: PostStatus.DRAFT })
  status: PostStatus;

  @Prop({ required: true, type: Date, index: true })
  scheduleAt: Date;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop()
  recurrenceRule?: string;
}

export const PostSchema = SchemaFactory.createForClass(Post);
