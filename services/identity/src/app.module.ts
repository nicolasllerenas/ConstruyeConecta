import { PlatformModule } from '@cc/platform';
import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { databaseProvider } from './database.js';

@Module({
  imports: [PlatformModule.forRoot({ service: 'identity' })],
  controllers: [AuthController],
  providers: [databaseProvider, AuthService],
})
export class AppModule {}
