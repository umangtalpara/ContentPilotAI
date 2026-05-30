import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@contentpilot/shared';
import { AiService } from './ai.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRolesGuard } from '../auth/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../auth/decorators/workspace-roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('workspaces/:workspaceId/ai')
@UseGuards(JwtAuthGuard, WorkspaceRolesGuard)
export class AiController {
  constructor(
    private aiService: AiService,
    private usersService: UsersService,
  ) {}

  @Post('generate-caption')
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  async generateCaption(
    @CurrentUser() user: any,
    @Body('topic') topic: string,
    @Body('tone') tone: string,
    @Body('platform') platform: string,
  ) {
    // 1. Consume 1 AI credit from user balance
    await this.usersService.decrementCredits(user.id);
    
    // 2. Perform the generation
    return this.aiService.generateCaption(topic, tone, platform);
  }

  @Post('generate-hashtags')
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  async generateHashtags(
    @CurrentUser() user: any,
    @Body('topic') topic: string,
    @Body('industry') industry?: string,
  ) {
    await this.usersService.decrementCredits(user.id);
    return this.aiService.generateHashtags(topic, industry);
  }
}
