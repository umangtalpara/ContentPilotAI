import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Serve static uploads
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
  
  // Enable Cross-Origin Resource Sharing (CORS) for frontend client
  app.enableCors({
    origin: '*', // In production, replace with specific domain coordinates
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Prefix all endpoints with /api/v1/
  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;

  await app.listen(port);
  console.log(`Backend API Monolith running on: http://localhost:${port}/api/v1`);
}
bootstrap();
