import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  AGENCY = 'agency',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verificationToken?: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop({ default: 20 })
  aiCreditsRemaining: number;

  @Prop({ type: String, enum: SubscriptionTier, default: SubscriptionTier.FREE })
  subscriptionTier: SubscriptionTier;

  @Prop()
  stripeCustomerId?: string;

  @Prop()
  stripeSubscriptionId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

