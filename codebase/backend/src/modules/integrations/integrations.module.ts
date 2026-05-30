import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Integration, IntegrationSchema } from './schemas/integration.schema';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Integration.name, schema: IntegrationSchema }]),
    WorkspacesModule,
    UsersModule,
  ],
  providers: [IntegrationsService],
  controllers: [IntegrationsController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
