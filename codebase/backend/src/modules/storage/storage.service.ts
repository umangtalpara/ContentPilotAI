import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private isS3Configured = false;
  private uploadsDir: string;

  constructor(private configService: ConfigService) {
    // Check if S3 credentials exist in configuration
    const accessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET');
    
    if (accessKey && secretKey && bucketName) {
      this.isS3Configured = true;
    }

    // Set up local uploads directory for development fallback
    const rootPath = path.resolve(__dirname, '..', '..', '..');
    this.uploadsDir = path.join(rootPath, 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async getPresignedUploadUrl(
    workspaceId: string,
    filename: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; downloadUrl: string; mode: 's3' | 'local' }> {
    const fileExtension = path.extname(filename);
    const uniqueFilename = `${workspaceId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExtension}`;

    if (this.isS3Configured) {
      // In a real S3 integration, we would load @aws-sdk/client-s3 here
      // and generate a pre-signed URL.
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
      return {
        uploadUrl: `https://${bucket}.s3.${region}.amazonaws.com/${uniqueFilename}?AWSAccessKeyId=mock&Expires=mock`,
        downloadUrl: `https://${bucket}.s3.${region}.amazonaws.com/${uniqueFilename}`,
        mode: 's3',
      };
    }

    // Fallback: Local Development Mode
    const port = this.configService.get<number>('PORT') || 3001;
    return {
      uploadUrl: `http://localhost:${port}/api/v1/workspaces/${workspaceId}/media/upload?filename=${uniqueFilename}`,
      downloadUrl: `http://localhost:${port}/uploads/${uniqueFilename}`,
      mode: 'local',
    };
  }

  async saveLocalFile(filename: string, fileBuffer: Buffer): Promise<string> {
    const filePath = path.join(this.uploadsDir, filename);
    await fs.promises.writeFile(filePath, fileBuffer);
    return `/uploads/${filename}`;
  }
}
