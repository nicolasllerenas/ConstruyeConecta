import type { CreateProjectInput, ProjectCard } from '@cc/contracts';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { type Database, DB } from '../database.js';
import { profiles, projects } from '../schema.js';

const HIGHLIGHT_DAYS = 7;
const DAY_MS = 86_400_000;

export function toProjectCard(
  project: typeof projects.$inferSelect,
  familyName: string,
  extra: Partial<ProjectCard> = {},
): ProjectCard {
  return {
    id: project.id,
    familyId: project.familyId,
    familyName,
    kind: project.kind,
    title: project.title,
    description: project.description,
    photoUrls: project.photoUrls,
    voiceNoteUrl: project.voiceNoteUrl,
    budgetMinCents: project.budgetMinCents,
    budgetMaxCents: project.budgetMaxCents,
    timing: project.timing,
    district: project.district,
    distanceKm: null,
    highlighted: (project.highlightedUntil?.getTime() ?? 0) > Date.now(),
    invited: false,
    status: project.status,
    demo: project.demo,
    familyRating: null,
    familyReviewCount: 0,
    createdAt: project.createdAt.toISOString(),
    ...extra,
  };
}

@Injectable()
export class ProjectService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(familyId: string, input: CreateProjectInput): Promise<ProjectCard> {
    const [family] = await this.db.select().from(profiles).where(eq(profiles.userId, familyId));
    if (!family) {
      throw new ConflictException('Completa tu dirección antes de publicar tu obra');
    }
    const [project] = await this.db
      .insert(projects)
      .values({
        familyId,
        kind: input.kind,
        title: input.title,
        description: input.description ?? null,
        photoUrls: input.photoUrls,
        voiceNoteUrl: input.voiceNoteUrl ?? null,
        budgetMinCents: input.budgetMinCents,
        budgetMaxCents: input.budgetMaxCents,
        timing: input.timing,
        district: family.district,
        latitude: family.latitude,
        longitude: family.longitude,
        radiusKm: family.radiusKm,
        highlightedUntil: input.highlight ? new Date(Date.now() + HIGHLIGHT_DAYS * DAY_MS) : null,
      })
      .returning();
    return toProjectCard(project as typeof projects.$inferSelect, family.displayName);
  }

  async listMine(familyId: string): Promise<ProjectCard[]> {
    const [family] = await this.db.select().from(profiles).where(eq(profiles.userId, familyId));
    if (!family) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.familyId, familyId))
      .orderBy(desc(projects.createdAt));
    return rows.map((row) => toProjectCard(row, family.displayName));
  }

  async getOwned(familyId: string, projectId: string): Promise<typeof projects.$inferSelect> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
    if (!project || project.familyId !== familyId) {
      throw new NotFoundException('Obra no encontrada');
    }
    return project;
  }
}
