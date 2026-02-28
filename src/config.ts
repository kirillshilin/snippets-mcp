import { join } from 'node:path';

export interface Config {
  port: number;
  host: string;
  environment: string;
  snippetsDir: string;
  authToken: string | undefined;
}

export const config: Config = {
  port: Number(process.env['PORT'] ?? '') || 3003,
  host: (process.env['HOST'] ?? '').length > 0 ? (process.env['HOST'] as string) : '127.0.0.1',
  environment:
    (process.env['NODE_ENV'] ?? '').length > 0
      ? (process.env['NODE_ENV'] as string)
      : 'development',
  snippetsDir:
    (process.env['SNIPPETS_DIR'] ?? '').length > 0
      ? (process.env['SNIPPETS_DIR'] as string)
      : join(process.cwd(), 'snippets'),
  authToken:
    (process.env['AUTH_TOKEN'] ?? '').length > 0
      ? (process.env['AUTH_TOKEN'] as string)
      : undefined,
};

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
