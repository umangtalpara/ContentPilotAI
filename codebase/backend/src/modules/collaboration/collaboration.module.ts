import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
