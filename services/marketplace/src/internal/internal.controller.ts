import { InternalOnly, ZodPipe } from '@cc/platform';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { type Database, DB } from '../database.js';
import { matches, projects, specialistDetails, swipes } from '../schema.js';

const contractedSchema = z.object({ specialistId: z.string().uuid() });

@InternalOnly()
@Controller('internal')
export class InternalController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get('matches/:id')
  async match(@Param('id', ParseUUIDPipe) id: string) {
    const [row] = await this.db
      .select({ match: matches, project: projects, details: specialistDetails })
      .from(matches)
      .innerJoin(projects, eq(projects.id, matches.projectId))
      .innerJoin(specialistDetails, eq(specialistDetails.userId, matches.specialistId))
      .where(eq(matches.id, id));
    if (!row) {
      throw new NotFoundException('Match no encontrado');
    }
    return {
      id: row.match.id,
      projectId: row.project.id,
      projectTitle: row.project.title,
      projectStatus: row.project.status,
      familyId: row.match.familyId,
      specialistId: row.match.specialistId,
      specialistPro:
        row.details.plan === 'pro' && (row.details.planExpiresAt?.getTime() ?? 0) > Date.now(),
    };
  }

  @HttpCode(200)
  @Post('projects/:id/contracted')
  async markContracted(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(contractedSchema)) input: { specialistId: string },
  ) {
    await this.db.transaction(async (tx) => {
      await tx.update(projects).set({ status: 'contracted' }).where(eq(projects.id, id));
      await tx
        .insert(swipes)
        .values({
          projectId: id,
          specialistId: input.specialistId,
          actor: 'family',
          decision: 'like',
        })
        .onConflictDoUpdate({
          target: [swipes.projectId, swipes.specialistId, swipes.actor],
          set: { decision: 'like' },
        });
    });
    return { ok: true };
  }

  @HttpCode(200)
  @Post('specialists/:id/completed-job')
  async recordCompletedJob(@Param('id', ParseUUIDPipe) id: string) {
    await this.db
      .update(specialistDetails)
      .set({ completedJobs: sql`${specialistDetails.completedJobs} + 1` })
      .where(eq(specialistDetails.userId, id));
    return { ok: true };
  }
}
