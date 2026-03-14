export function resolveSnippetsDirFromArgv(argv: string[] = process.argv): string | undefined {
  for (let i = 0; i < argv?.length; i += 1) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }
    if (arg === '--snippets-dir') {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        return next;
      }
    }
    if (arg.startsWith('--snippets-dir=')) {
      const [, value] = arg.split('=', 2);
      if (value && value.length > 0) {
        return value;
      }
    }
  }

  return undefined;
}
