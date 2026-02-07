export interface Config {
  port: number;
  host: string;
  environment: string;
}

export const config: Config = {
  port: Number(process.env['PORT'] ?? '') || 3000,
  host: (process.env['HOST'] ?? '').length > 0 ? (process.env['HOST'] as string) : '0.0.0.0',
  environment:
    (process.env['NODE_ENV'] ?? '').length > 0
      ? (process.env['NODE_ENV'] as string)
      : 'development',
};
