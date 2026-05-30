import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  @Get('posts/:postId/comments')
  async getComments(@Param('postId') postId: string) {
    return this.collaborationService.getComments(postId);
  }

  @Post('posts/:postId/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('postId') postId: string,
    @Body() body: { content: string },
    @Request() req: any,
  ) {
    if (!body?.content?.trim()) {
      throw new BadRequestException('Comment content cannot be empty');
    }
    const userId: string = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    const authorName: string = req.user?.name ?? req.user?.email ?? 'Anonymous';
    return this.collaborationService.addComment(postId, userId, authorName, body.content.trim());
  }

  @Delete('posts/:postId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Param('commentId') commentId: string,
    @Request() req: any,
  ) {
    const userId: string = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    await this.collaborationService.deleteComment(commentId, userId);
  }

  // ---------------------------------------------------------------------------
  // Activity Feed
  // ---------------------------------------------------------------------------

  @Get('activities')
  async getActivities(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 50, 200) : 50;
    return this.collaborationService.getActivities(workspaceId, parsedLimit);
  }
}
