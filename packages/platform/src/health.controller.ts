import { Controller, Get, Inject } from '@nestjs/common';
import { PLATFORM_OPTIONS, type PlatformOptions } from './config.js';
import { Open } from './decorators.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(PLATFORM_OPTIONS) private readonly options: PlatformOptions) {}

  @Open()
  @Get()
  check() {
    return { service: this.options.service, status: 'ok' };
  }
}
