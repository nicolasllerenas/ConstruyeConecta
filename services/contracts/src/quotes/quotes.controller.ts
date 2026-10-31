import {
  type CreateQuoteInput,
  createQuoteSchema,
  type QuoteVersionInput,
  quoteVersionSchema,
  requestAdjustmentSchema,
} from '@cc/contracts';
import { CurrentUser, RateLimit, Roles, type UserClaims, ZodPipe } from '@cc/platform';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { QuotesService } from './quotes.service.js';

@Controller('quotes')
export class QuotesController {
  constructor(@Inject(QuotesService) private readonly quotes: QuotesService) {}

  @Roles('specialist')
  @RateLimit({ limit: 30, windowSeconds: 3600 })
  @Post()
  create(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(createQuoteSchema)) input: CreateQuoteInput,
  ) {
    return this.quotes.create(user.id, input);
  }

  @Roles('specialist')
  @Get('mine')
  mine(@CurrentUser() user: UserClaims) {
    return this.quotes.listForSpecialist(user.id);
  }

  @Roles('family')
  @Get()
  forProject(
    @CurrentUser() user: UserClaims,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.quotes.listForProject(user.id, projectId);
  }

  @Get(':id')
  get(@CurrentUser() user: UserClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.getForUser(user.id, id);
  }

  @Roles('specialist')
  @Post(':id/versions')
  revise(
    @CurrentUser() user: UserClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(quoteVersionSchema)) input: QuoteVersionInput,
  ) {
    return this.quotes.revise(user.id, id, input);
  }

  @Roles('family')
  @HttpCode(200)
  @Post(':id/adjustment')
  requestAdjustment(
    @CurrentUser() user: UserClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(requestAdjustmentSchema)) input: { message: string },
  ) {
    return this.quotes.requestAdjustment(user.id, id, input.message);
  }

  @Roles('family')
  @HttpCode(200)
  @Post(':id/select')
  select(@CurrentUser() user: UserClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.select(user.id, id);
  }
}
