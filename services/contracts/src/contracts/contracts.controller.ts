import {
  type ProgressUpdateInput,
  progressUpdateSchema,
  rejectStageSchema,
  submitStageSchema,
} from '@cc/contracts';
import { CurrentUser, InternalOnly, Roles, type UserClaims, ZodPipe } from '@cc/platform';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ContractsService } from './contracts.service.js';

@Controller()
export class ContractsController {
  constructor(@Inject(ContractsService) private readonly contracts: ContractsService) {}

  @Get('contracts/mine')
  mine(@CurrentUser() user: UserClaims) {
    return this.contracts.listForUser(user.id);
  }

  @Get('contracts/:id')
  get(@CurrentUser() user: UserClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.contracts.getForUser(user.id, id);
  }

  @Roles('specialist')
  @Post('contracts/:id/updates')
  addUpdate(
    @CurrentUser() user: UserClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(progressUpdateSchema)) input: ProgressUpdateInput,
  ) {
    return this.contracts.addUpdate(user.id, id, input);
  }

  @Roles('specialist')
  @HttpCode(200)
  @Post('contracts/:id/stages/:stageId/submit')
  submitStage(
    @CurrentUser() user: UserClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body(new ZodPipe(submitStageSchema)) input: ProgressUpdateInput,
  ) {
    return this.contracts.submitStage(user.id, id, stageId, input);
  }

  @Roles('family')
  @HttpCode(200)
  @Post('contracts/:id/stages/:stageId/approve')
  approveStage(
    @CurrentUser() user: UserClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.contracts.approveStage(user.id, id, stageId);
  }

  @Roles('family')
  @HttpCode(200)
  @Post('contracts/:id/stages/:stageId/reject')
  rejectStage(
    @CurrentUser() user: UserClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body(new ZodPipe(rejectStageSchema)) input: { message: string },
  ) {
    return this.contracts.rejectStage(user.id, id, stageId, input.message);
  }

  @InternalOnly()
  @Get('internal/contracts/:id')
  participants(@Param('id', ParseUUIDPipe) id: string) {
    return this.contracts.participants(id);
  }
}
