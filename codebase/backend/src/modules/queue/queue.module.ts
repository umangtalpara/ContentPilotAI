import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueueService } from './queue.service';
import { Post, PostSchema } from '../posts/schemas/post.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
