import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UsePipes, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreatePostSchema, UpdatePostSchema, UserRole } from '@contentpilot/shared';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRolesGuard } from '../auth/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../auth/decorators/workspace-roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('workspaces/:workspaceId/posts')
@UseGuards(JwtAuthGuard, WorkspaceRolesGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  @UsePipes(new ZodValidationPipe(CreatePostSchema))
  async create(@Param('workspaceId') workspaceId: string, @Body() body: any) {
    return this.postsService.create(workspaceId, body);
  }

  @Get()
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR, UserRole.VIEWER)
  async findAll(@Param('workspaceId') workspaceId: string) {
    return this.postsService.findAllByWorkspace(workspaceId);
  }

  @Get(':id')
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR, UserRole.VIEWER)
  async findOne(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.postsService.findOne(workspaceId, id);
  }

  @Patch(':id')
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  @UsePipes(new ZodValidationPipe(UpdatePostSchema))
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.postsService.update(workspaceId, id, body);
  }

  @Delete(':id')
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  async remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    await this.postsService.remove(workspaceId, id);
    return { success: true };
  }

  @Post('bulk')
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  async createBulk(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const csvText = file.buffer.toString('utf-8');
    return this.postsService.createBulk(workspaceId, csvText);
  }
}
