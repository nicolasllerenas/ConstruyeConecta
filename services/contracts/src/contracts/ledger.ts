import type { StageStatus } from '@cc/contracts';

export interface LedgerStage {
  amountCents: number;
  status: StageStatus;
}

export function summarizeLedger(stages: LedgerStage[]) {
  const sum = (statuses: StageStatus[]) =>
    stages
      .filter((stage) => statuses.includes(stage.status))
      .reduce((total, stage) => total + stage.amountCents, 0);
  return {
    releasedCents: sum(['approved']),
    heldCents: sum(['in_progress', 'submitted']),
    pendingCents: sum(['pending']),
  };
}
