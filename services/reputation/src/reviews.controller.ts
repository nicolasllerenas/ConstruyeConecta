import { type CreateReviewInput, createReviewSchema } from '@cc/contracts';
import { CurrentUser, InternalOnly, RateLimit, type UserClaims, ZodPipe } from '@cc/platform';
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
import { z } from 'zod';
import { ReviewsService } from './reviews.service.js';

const summariesSchema = z.object({ userIds: z.array(z.string().uuid()).max(100) });

@Controller()
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviews: ReviewsService) {}

  @RateLimit({ limit: 30, windowSeconds: 3600 })
  @Post('reviews')
  create(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(createReviewSchema)) input: CreateReviewInput,
  ) {
    return this.reviews.create(user, input);
  }

  @Get('reviews/contract/:id')
  contractState(@CurrentUser() user: UserClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.contractState(user.id, id);
  }

  @Get('reviews/user/:id')
  listForUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.listForUser(id);
  }

  @InternalOnly()
  @HttpCode(200)
  @Post('internal/summaries')
  summaries(@Body(new ZodPipe(summariesSchema)) input: { userIds: string[] }) {
    return this.reviews.summaries(input.userIds);
  }
}
