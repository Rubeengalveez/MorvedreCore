type ErrorContext = Record<string, unknown>;

function sanitizeContext(context?: ErrorContext): ErrorContext | undefined {
  if (!context) return undefined;
  const sanitized: ErrorContext = {};
  const sensitiveKeys = new Set(["password", "token", "secret", "cookie", "authorization"]);

  for (const [key, value] of Object.entries(context)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function captureException(error: unknown, context?: ErrorContext): void {
  const timestamp = new Date().toISOString();
  const safeContext = sanitizeContext(context);

  const errorDetails =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          digest: (error as Error & { digest?: string }).digest,
        }
      : { message: String(error) };

  // Logging estructurado en consola (capturado por Cloud Logging / Vercel Logs)
  console.error(
    JSON.stringify({
      level: "error",
      timestamp,
      ...errorDetails,
      context: safeContext,
    }),
  );

  // Integración condicional con Sentry si el SDK está disponible en runtime y hay DSN configurado
  const dsn =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_SENTRY_DSN ?? "")
      : (process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "");

  if (dsn && typeof window !== "undefined" && (window as unknown as { Sentry?: { captureException: (e: unknown) => void } }).Sentry) {
    try {
      (window as unknown as { Sentry: { captureException: (e: unknown) => void } }).Sentry.captureException(error);
    } catch {
      // Ignorar fallos de transporte de telemetría
    }
  }
}
