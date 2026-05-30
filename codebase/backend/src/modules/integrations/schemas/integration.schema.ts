import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type IntegrationDocument = HydratedDocument<Integration>;

@Schema({ timestamps: true })
export class Integration extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Workspace', index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, enum: ['linkedin', 'twitter'] })
  platform: string;

  @Prop({ required: true })
  accessToken: string;

  @Prop()
  refreshToken?: string;

  @Prop()
  expiresAt?: Date;

  @Prop({ type: Object })
  profileDetails?: {
    name: string;
    avatarUrl?: string;
    handle?: string;
  };
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);
