import {
  type FamilySwipeInput,
  familySwipeSchema,
  type SpecialistSwipeInput,
  specialistSwipeSchema,
} from '@cc/contracts';
import { CurrentUser, Roles, type UserClaims, ZodPipe } from '@cc/platform';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { MatchingService } from './matching.service.js';

const idsSchema = z.array(z.string().uuid()).max(30);

@Controller()
export class MatchingController {
  constructor(@Inject(MatchingService) private readonly matching: MatchingService) {}

  @Roles('family')
  @Get('projects/:id/candidates')
  candidates(@CurrentUser() user: UserClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.matching.candidates(user.id, id);
  }

  @Get('specialists')
  specialists(@Query('ids') ids = '') {
    const parsed = idsSchema.safeParse(ids.split(',').filter(Boolean));
    if (!parsed.success) {
      throw new BadRequestException('Identificadores inválidos');
    }
    return this.matching.specialistsByIds(parsed.data);
  }

  @Roles('specialist')
  @Get('feed')
  feed(@CurrentUser() user: UserClaims) {
    return this.matching.feed(user.id);
  }

  @Roles('family')
  @Post('swipes/family')
  swipeAsFamily(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(familySwipeSchema)) input: FamilySwipeInput,
  ) {
    return this.matching.swipeAsFamily(user.id, input);
  }

  @Roles('specialist')
  @Post('swipes/specialist')
  swipeAsSpecialist(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(specialistSwipeSchema)) input: SpecialistSwipeInput,
  ) {
    return this.matching.swipeAsSpecialist(user.id, input);
  }

  @Get('matches')
  matches(@CurrentUser() user: UserClaims) {
    return this.matching.listMatches(user.id);
  }

  @Get('matches/:id')
  match(@CurrentUser() user: UserClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.matching.getMatch(user.id, id);
  }
}
