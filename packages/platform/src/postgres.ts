export const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  return candidates.some(
    (candidate) => (candidate as { code?: string } | null)?.code === UNIQUE_VIOLATION,
  );
}
