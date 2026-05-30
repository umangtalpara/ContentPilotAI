import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { UserRole } from '@contentpilot/shared';

export type WorkspaceDocument = HydratedDocument<Workspace>;

@Schema()
export class WorkspaceMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: Object.values(UserRole) })
  role: UserRole;
}

const WorkspaceMemberSchema = SchemaFactory.createForClass(WorkspaceMember);

@Schema({ timestamps: true })
export class Workspace extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ type: [WorkspaceMemberSchema], default: [] })
  members: WorkspaceMember[];
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
