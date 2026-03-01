type LogContext = Record<string, unknown>;

export function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return ' {"context":"unserializable"}';
  }
}

export function logInfo(message: string, context?: LogContext): void {
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toISOString()}] INFO ${message}${formatContext(context)}`);
}

export function logWarn(message: string, context?: LogContext): void {
  // eslint-disable-next-line no-console
  console.warn(`[${new Date().toISOString()}] WARN ${message}${formatContext(context)}`);
}

export function logError(message: string, error?: unknown, context?: LogContext): void {
  const errorPayload =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
  const mergedContext = errorPayload != null ? { ...context, error: errorPayload } : context;

  // eslint-disable-next-line no-console
  console.error(`[${new Date().toISOString()}] ERROR ${message}${formatContext(mergedContext)}`);
}
