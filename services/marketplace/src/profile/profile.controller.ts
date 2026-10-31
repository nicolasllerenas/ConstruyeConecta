import {
  activatePlanSchema,
  type FamilyProfileInput,
  familyProfileSchema,
  type PortfolioItemInput,
  portfolioItemSchema,
  type SpecialistProfileInput,
  specialistProfileSchema,
} from '@cc/contracts';
import { CurrentUser, RateLimit, Roles, type UserClaims, ZodPipe } from '@cc/platform';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ProfileService } from './profile.service.js';

@Controller()
export class ProfileController {
  constructor(@Inject(ProfileService) private readonly profiles: ProfileService) {}

  @Get('profile/me')
  me(@CurrentUser() user: UserClaims) {
    return this.profiles.get(user.id);
  }

  @Roles('family')
  @Put('profile/family')
  saveFamily(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(familyProfileSchema)) input: FamilyProfileInput,
  ) {
    return this.profiles.saveFamily(user.id, input);
  }

  @Roles('specialist')
  @Put('profile/specialist')
  saveSpecialist(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(specialistProfileSchema)) input: SpecialistProfileInput,
  ) {
    return this.profiles.saveSpecialist(user.id, input);
  }

  @Roles('specialist')
  @RateLimit({ limit: 40, windowSeconds: 3600 })
  @Post('portfolio')
  addPortfolioItem(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(portfolioItemSchema)) input: PortfolioItemInput,
  ) {
    return this.profiles.addPortfolioItem(user.id, input);
  }

  @Roles('specialist')
  @Delete('portfolio/:id')
  removePortfolioItem(@CurrentUser() user: UserClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.removePortfolioItem(user.id, id);
  }

  @Roles('specialist')
  @Post('plan/activate')
  activatePlan(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(activatePlanSchema)) _input: { plan: 'pro' },
  ) {
    return this.profiles.activateProTrial(user.id);
  }
}
