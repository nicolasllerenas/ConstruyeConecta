import type { ReputationSummary } from '@cc/contracts';
import { ServiceClient } from '@cc/platform';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReputationClient {
  private readonly logger = new Logger(ReputationClient.name);

  constructor(@Inject(ServiceClient) private readonly services: ServiceClient) {}

  async summaries(userIds: string[]): Promise<Map<string, ReputationSummary>> {
    if (userIds.length === 0) {
      return new Map();
    }
    try {
      const summaries = await this.services.post<ReputationSummary[]>(
        'reputation',
        '/internal/summaries',
        { userIds },
      );
      return new Map(summaries.map((summary) => [summary.userId, summary]));
    } catch (error) {
      this.logger.warn(`Reputation unavailable: ${(error as Error).message}`);
      return new Map();
    }
  }
}
