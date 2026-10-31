import type {
  FamilyProfileInput,
  MyProfile,
  PortfolioItemInput,
  SpecialistProfileInput,
} from '@cc/contracts';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { type Database, DB } from '../database.js';
import { portfolioItems, profiles, specialistDetails } from '../schema.js';

const PRO_TRIAL_DAYS = 14;
const DAY_MS = 86_400_000;

function locationValues(input: FamilyProfileInput) {
  return {
    displayName: input.displayName,
    phone: input.phone,
    address: input.address,
    reference: input.reference ?? null,
    district: input.district,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusKm: input.radiusKm,
    updatedAt: new Date(),
  };
}

@Injectable()
export class ProfileService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async get(userId: string): Promise<MyProfile> {
    const [profile] = await this.db.select().from(profiles).where(eq(profiles.userId, userId));
    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }
    const base = {
      role: profile.role,
      displayName: profile.displayName,
      phone: profile.phone,
      address: profile.address,
      reference: profile.reference,
      district: profile.district,
      latitude: profile.latitude,
      longitude: profile.longitude,
      radiusKm: profile.radiusKm,
    };
    if (profile.role === 'family') {
      return { ...base, specialist: null };
    }
    const [details] = await this.db
      .select()
      .from(specialistDetails)
      .where(eq(specialistDetails.userId, userId));
    if (!details) {
      throw new NotFoundException('Perfil no encontrado');
    }
    const portfolio = await this.db
      .select({
        id: portfolioItems.id,
        url: portfolioItems.url,
        caption: portfolioItems.caption,
      })
      .from(portfolioItems)
      .where(eq(portfolioItems.specialistId, userId))
      .orderBy(desc(portfolioItems.createdAt));
    return {
      ...base,
      specialist: {
        kind: details.kind,
        bio: details.bio,
        specialties: details.specialties,
        visitFeeCents: details.visitFeeCents,
        availability: details.availability,
        avatarUrl: details.avatarUrl,
        verified: details.verified,
        plan: details.plan,
        planExpiresAt: details.planExpiresAt?.toISOString() ?? null,
        portfolio,
      },
    };
  }

  async saveFamily(userId: string, input: FamilyProfileInput): Promise<MyProfile> {
    const values = locationValues(input);
    await this.db
      .insert(profiles)
      .values({ userId, role: 'family', ...values })
      .onConflictDoUpdate({ target: profiles.userId, set: values });
    return this.get(userId);
  }

  async saveSpecialist(userId: string, input: SpecialistProfileInput): Promise<MyProfile> {
    const values = locationValues(input);
    const details = {
      kind: input.kind,
      bio: input.bio,
      specialties: input.specialties,
      visitFeeCents: input.visitFeeCents,
      availability: input.availability,
      avatarUrl: input.avatarUrl ?? null,
    };
    await this.db.transaction(async (tx) => {
      await tx
        .insert(profiles)
        .values({ userId, role: 'specialist', ...values })
        .onConflictDoUpdate({ target: profiles.userId, set: values });
      await tx
        .insert(specialistDetails)
        .values({ userId, ...details })
        .onConflictDoUpdate({ target: specialistDetails.userId, set: details });
    });
    return this.get(userId);
  }

  async addPortfolioItem(userId: string, input: PortfolioItemInput): Promise<MyProfile> {
    await this.db.insert(portfolioItems).values({ specialistId: userId, ...input });
    return this.get(userId);
  }

  async removePortfolioItem(userId: string, itemId: string): Promise<MyProfile> {
    await this.db
      .delete(portfolioItems)
      .where(and(eq(portfolioItems.id, itemId), eq(portfolioItems.specialistId, userId)));
    return this.get(userId);
  }

  async activateProTrial(userId: string): Promise<MyProfile> {
    await this.db
      .update(specialistDetails)
      .set({ plan: 'pro', planExpiresAt: new Date(Date.now() + PRO_TRIAL_DAYS * DAY_MS) })
      .where(eq(specialistDetails.userId, userId));
    return this.get(userId);
  }
}
