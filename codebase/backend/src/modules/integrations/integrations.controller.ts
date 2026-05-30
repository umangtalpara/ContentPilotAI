import { Controller, Get, Delete, Query, Res, Param, UseGuards, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@contentpilot/shared';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRolesGuard } from '../auth/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../auth/decorators/workspace-roles.decorator';
import { ConfigService } from '@nestjs/config';

@Controller()
export class IntegrationsController {
  constructor(
    private integrationsService: IntegrationsService,
    private configService: ConfigService,
  ) {}

  private getFrontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private getBackendApiBaseUrl(): string {
    return this.configService.get<string>('BACKEND_API_BASE_URL') || 'http://localhost:3001/api/v1';
  }

  @Get('workspaces/:workspaceId/integrations/:platform/start')
  @UseGuards(JwtAuthGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  async startOAuth(
    @Param('workspaceId') workspaceId: string,
    @Param('platform') platform: string,
    @Res() res: Response,
  ) {
    const normalized = platform.toLowerCase();
    const backendApiBase = this.getBackendApiBaseUrl();
    const callbackBase = `${backendApiBase}/integrations`;

    if (normalized === 'linkedin') {
      const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
      const redirectUri = this.configService.get<string>('LINKEDIN_REDIRECT_URI') || `${callbackBase}/linkedin/callback`;
      if (!clientId || clientId === 'mock-linkedin-client-id') {
        return res.redirect(`${callbackBase}/linkedin/callback?code=mock-code&state=${workspaceId}`);
      }
      const authUrl =
        `https://www.linkedin.com/oauth/v2/authorization` +
        `?response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(workspaceId)}` +
        `&scope=${encodeURIComponent('openid profile email w_member_social')}`;
      return res.redirect(authUrl);
    }

    if (normalized === 'twitter') {
      const clientId = this.configService.get<string>('TWITTER_CLIENT_ID');
      const redirectUri = this.configService.get<string>('TWITTER_REDIRECT_URI') || `${callbackBase}/twitter/callback`;
      if (!clientId || clientId === 'mock-twitter-client-id') {
        return res.redirect(`${callbackBase}/twitter/callback?code=mock-code&state=${workspaceId}`);
      }
      const authUrl =
        `https://twitter.com/i/oauth2/authorize` +
        `?response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('tweet.read tweet.write users.read offline.access')}` +
        `&state=${encodeURIComponent(workspaceId)}` +
        `&code_challenge=${encodeURIComponent('challenge')}` +
        `&code_challenge_method=plain`;
      return res.redirect(authUrl);
    }

    throw new BadRequestException('Unsupported platform');
  }

  // --- Global OAuth Callback Handlers (Public Redirects) ---
  @Get('integrations/linkedin/callback')
  async linkedinCallback(
    @Query('code') code: string,
    @Query('state') workspaceId: string,
    @Res() res: Response,
  ) {
    if (!code || !workspaceId) {
      return res.redirect(`${this.getFrontendUrl()}/workspaces?error=missing_oauth_params`);
    }
    try {
      await this.integrationsService.handleLinkedInCallback(workspaceId, code);
      return res.redirect(`${this.getFrontendUrl()}/workspaces?connected=linkedin`);
    } catch {
      return res.redirect(`${this.getFrontendUrl()}/workspaces?error=linkedin_oauth_failed`);
    }
  }

  @Get('integrations/twitter/callback')
  async twitterCallback(
    @Query('code') code: string,
    @Query('state') workspaceId: string,
    @Res() res: Response,
  ) {
    if (!code || !workspaceId) {
      return res.redirect(`${this.getFrontendUrl()}/workspaces?error=missing_oauth_params`);
    }
    try {
      await this.integrationsService.handleTwitterCallback(workspaceId, code);
      return res.redirect(`${this.getFrontendUrl()}/workspaces?connected=twitter`);
    } catch {
      return res.redirect(`${this.getFrontendUrl()}/workspaces?error=twitter_oauth_failed`);
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
