import { PlatformModule } from '@cc/platform';
import { Module } from '@nestjs/common';
import { databaseProvider } from './database.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [PlatformModule.forRoot({ service: 'reputation' })],
  controllers: [ReviewsController],
  providers: [databaseProvider, ReviewsService],
})
export class AppModule {}
