export function normalizeScope(scope: string): string {
  const trimmed = scope.trim().toLowerCase();
  return trimmed.startsWith('.') ? trimmed.slice(1) : trimmed;
}

export function matchesScope(scopes: string[], target: string): boolean {
  const normalizedTarget = normalizeScope(target);
  return scopes
    .filter((scope) => scope.trim().length > 0)
    .map((scope) => normalizeScope(scope))
    .includes(normalizedTarget);
}
