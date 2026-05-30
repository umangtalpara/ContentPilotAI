import { Controller, Get, Post, Query, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRolesGuard } from '../auth/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../auth/decorators/workspace-roles.decorator';
import { UserRole } from '@contentpilot/shared';

@Controller('workspaces/:workspaceId/media')
@UseGuards(JwtAuthGuard, WorkspaceRolesGuard)
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get('presigned')
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  async getPresignedUrl(
    @Param('workspaceId') workspaceId: string,
    @Query('filename') filename: string,
    @Query('mimeType') mimeType: string,
  ) {
    if (!filename || !mimeType) {
      throw new BadRequestException('filename and mimeType are required parameters');
    }
    return this.storageService.getPresignedUploadUrl(workspaceId, filename, mimeType);
  }

  @Post('upload')
  @WorkspaceRoles(UserRole.OWNER, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('workspaceId') workspaceId: string,
    @Query('filename') filename: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!filename) {
      throw new BadRequestException('filename is required');
    }
    
    const downloadPath = await this.storageService.saveLocalFile(filename, file.buffer);
    return {
      success: true,
      downloadUrl: downloadPath,
    };
  }
}
