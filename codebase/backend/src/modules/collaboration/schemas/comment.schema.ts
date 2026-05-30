import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId: Types.ObjectId;

  /** Display name snapshot at time of comment — avoids join for list rendering */
  @Prop({ required: true, trim: true })
  authorName: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  content: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
