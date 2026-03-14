export function normalizeScope(scope: string): string {
  const trimmed = scope.trim().toLowerCase();
  return trimmed.startsWith('.') ? trimmed.slice(1) : trimmed;
}

export function matchesScope(scopes: string[], target: string): boolean {
  const normalizedTarget = target.toLowerCase();
  return scopes
    .map((scope) => scope.trim().toLowerCase())
    .filter((scope) => scope.length > 0)
    .map((scope) => (scope.startsWith('.') ? scope.slice(1) : scope))
    .includes(normalizedTarget);
}
