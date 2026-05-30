import { Controller, Get, Delete, Query, Res, Param, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@contentpilot/shared';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRolesGuard } from '../auth/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../auth/decorators/workspace-roles.decorator';

@Controller()
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  // --- Global OAuth Callback Handlers (Public Redirects) ---
  @Get('integrations/linkedin/callback')
  async linkedinCallback(
    @Query('code') code: string,
    @Query('state') workspaceId: string,
    @Res() res: Response,
  ) {
    if (!code || !workspaceId) {
      return res.redirect('http://localhost:3000/workspaces?error=missing_oauth_params');
    }
    try {
      await this.integrationsService.handleLinkedInCallback(workspaceId, code);
      return res.redirect(`http://localhost:3000/workspaces?connected=linkedin`);
    } catch {
      return res.redirect(`http://localhost:3000/workspaces?error=linkedin_oauth_failed`);
    }
  }

  @Get('integrations/twitter/callback')
  async twitterCallback(
    @Query('code') code: string,
    @Query('state') workspaceId: string,
    @Res() res: Response,
  ) {
    if (!code || !workspaceId) {
      return res.redirect('http://localhost:3000/workspaces?error=missing_oauth_params');
    }
    try {
      await this.integrationsService.handleTwitterCallback(workspaceId, code);
      return res.redirect(`http://localhost:3000/workspaces?connected=twitter`);
    } catch {
      return res.redirect(`http://localhost:3000/workspaces?error=twitter_oauth_failed`);
    }
  }

  // --- Workspace Connection Manager Endpoints (Secure API) ---
  @Get('workspaces/:workspaceId/integrations')
  @UseGuards(JwtAuthGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR, UserRole.VIEWER)
  async findAll(@Param('workspaceId') workspaceId: string) {
    const integrations = await this.integrationsService.findAllByWorkspace(workspaceId);
    return integrations.map((i) => ({
      id: i._id.toString(),
      platform: i.platform,
      profileDetails: i.profileDetails,
      expiresAt: i.expiresAt,
      createdAt: (i as any).createdAt,
    }));
  }

  @Delete('workspaces/:workspaceId/integrations/:id')
  @UseGuards(JwtAuthGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.integrationsService.remove(workspaceId, id);
    return { success: true };
  }
}
