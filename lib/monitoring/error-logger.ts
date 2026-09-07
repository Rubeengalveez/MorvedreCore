type ErrorContext = Record<string, unknown>;

const ERROR_NAMES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AggregateError",
]);
const AREAS = new Set(["app-error-boundary", "root-global-error"]);
const ROUTES = new Set(["treasury-closure-export"]);

function readProperty(value: unknown, key: string): unknown {
  try {
    return value !== null && typeof value === "object" ? Reflect.get(value, key) : undefined;
  } catch {
    return undefined;
  }
}

function safeDigest(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{1,10}$/.test(value) ? value : undefined;
}

export function captureException(error: unknown, context?: ErrorContext): void {
  const name = readProperty(error, "name");
  const area = readProperty(context, "area");
  const route = readProperty(context, "route");
  const digest =
    safeDigest(readProperty(error, "digest")) ?? safeDigest(readProperty(context, "digest"));
  const diagnostic = {
    level: "error",
    timestamp: new Date().toISOString(),
    event: "application_exception",
    name: typeof name === "string" && ERROR_NAMES.has(name) ? name : "Error",
    digest,
    context: {
      area: typeof area === "string" && AREAS.has(area) ? area : undefined,
      route: typeof route === "string" && ROUTES.has(route) ? route : undefined,
    },
  };
  try {
    console.error(JSON.stringify(diagnostic));
  } catch {
    return;
  }
}
