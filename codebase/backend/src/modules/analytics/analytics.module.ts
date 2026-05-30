import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { Integration, IntegrationSchema } from '../integrations/schemas/integration.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Integration.name, schema: IntegrationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
