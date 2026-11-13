import { PlatformModule } from '@cc/platform';
import { Module } from '@nestjs/common';
import { ContractsController } from './contracts/contracts.controller.js';
import { ContractsService } from './contracts/contracts.service.js';
import { databaseProvider } from './database.js';
import { QuotesController } from './quotes/quotes.controller.js';
import { QuotesService } from './quotes/quotes.service.js';

@Module({
  imports: [PlatformModule.forRoot({ service: 'contracts' })],
  controllers: [QuotesController, ContractsController],
  providers: [databaseProvider, QuotesService, ContractsService],
})
export class AppModule {}
