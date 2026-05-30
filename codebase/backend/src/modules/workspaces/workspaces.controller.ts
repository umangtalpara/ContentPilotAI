import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UsePipes } from '@nestjs/common';
import { CreateWorkspaceSchema, InviteMemberSchema, CreateWorkspaceInput, InviteMemberInput, UserRole } from '@contentpilot/shared';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRolesGuard } from '../auth/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../auth/decorators/workspace-roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.workspacesService.findAllForUser(user.id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateWorkspaceSchema))
  async create(@Body() body: any, @CurrentUser() user: any) {
    return this.workspacesService.create(body.name, user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workspacesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  @UsePipes(new ZodValidationPipe(CreateWorkspaceSchema))
  async updateName(@Param('id') id: string, @Body() body: any) {
    return this.workspacesService.updateName(id, body.name);
  }

  @Post(':id/invite')
  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(InviteMemberSchema))
  async inviteMember(@Param('id') id: string, @Body() body: any) {
    return this.workspacesService.inviteMember(id, body.email, body.role);
  }

  @Delete(':id/members/:userId')
  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(UserRole.OWNER)
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.workspacesService.removeMember(id, userId);
  }
}
