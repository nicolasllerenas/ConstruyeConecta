import { type CreateProjectInput, createProjectSchema } from '@cc/contracts';
import { CurrentUser, RateLimit, Roles, type UserClaims, ZodPipe } from '@cc/platform';
import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ProjectService } from './project.service.js';

@Roles('family')
@Controller('projects')
export class ProjectController {
  constructor(@Inject(ProjectService) private readonly projects: ProjectService) {}

  @RateLimit({ limit: 20, windowSeconds: 3600 })
  @Post()
  create(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(createProjectSchema)) input: CreateProjectInput,
  ) {
    return this.projects.create(user.id, input);
  }

  @Get('mine')
  listMine(@CurrentUser() user: UserClaims) {
    return this.projects.listMine(user.id);
  }
}
