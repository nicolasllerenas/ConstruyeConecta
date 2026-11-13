import { PlatformModule } from '@cc/platform';
import { Module } from '@nestjs/common';
import { databaseProvider } from './database.js';
import { InternalController } from './internal/internal.controller.js';
import { MatchingController } from './matching/matching.controller.js';
import { MatchingService } from './matching/matching.service.js';
import { ProfileController } from './profile/profile.controller.js';
import { ProfileService } from './profile/profile.service.js';
import { ProjectController } from './project/project.controller.js';
import { ProjectService } from './project/project.service.js';
import { ReputationClient } from './reputation.client.js';

@Module({
  imports: [PlatformModule.forRoot({ service: 'marketplace' })],
  controllers: [ProfileController, ProjectController, MatchingController, InternalController],
  providers: [databaseProvider, ProfileService, ProjectService, MatchingService, ReputationClient],
})
export class AppModule {}
