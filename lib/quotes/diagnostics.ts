type ErrorFields = {
  name?: unknown;
  code?: unknown;
  message?: unknown;
  severity?: unknown;
  routine?: unknown;
  sourceError?: unknown;
  cause?: unknown;
};

// Only short identifiers are accepted, never free text.
function identifier(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 64 ? value : undefined;
}

// The fixed prefixes @neondatabase/serverless builds its own errors from. A
// NeonDbError that carries no SQLSTATE and no sourceError came from one of
// these, and which one narrows the cause to a layer. Matching a prefix emits
// the constant label below, never any part of the message.
const NEON_FAULTS = [
  { prefix: "Server error (HTTP status ", label: "neon-http-error" },
  { prefix: "Error connecting to database:", label: "neon-connect-error" },
  { prefix: "Neon internal error:", label: "neon-unexpected-result" },
  { prefix: "Error getting auth token", label: "neon-auth-token-error" },
] as const;

// Neon puts the status of a non-2xx, non-400 response in its message and
// nowhere else. Only the three digits are captured; the response body that
// follows them is discarded.
const HTTP_STATUS = /^Server error \(HTTP status (\d{3})\)/;

/**
 * Describes why a quote store call failed, using only enum-like identifiers: a
 * PostgreSQL SQLSTATE, an error class name, a Node syscall code, a fixed label
 * for a Neon driver fault, an HTTP status. Error messages are deliberately
 * excluded, so a connection string, a credential or a customer detail cannot
 * reach the log. `JSON.stringify` drops the absent fields.
 *
 * Neon wraps a transport failure in `sourceError`, whose own `cause` carries
 * the syscall code for a DNS, TLS or connection error.
 */
export function describeQuoteStoreError(error: unknown) {
  const thrown = (error ?? {}) as ErrorFields;
  const source = (thrown.sourceError ?? {}) as ErrorFields;
  const cause = (source.cause ?? thrown.cause ?? {}) as ErrorFields;
  const message = typeof thrown.message === "string" ? thrown.message : "";
  return {
    errorName: identifier(thrown.name) ?? typeof error,
    sqlState: identifier(thrown.code),
    severity: identifier(thrown.severity),
    routine: identifier(thrown.routine),
    driverFault: NEON_FAULTS.find(({ prefix }) => message.startsWith(prefix))?.label,
    httpStatus: HTTP_STATUS.exec(message)?.[1],
    sourceName: identifier(source.name),
    syscallCode: identifier(source.code) ?? identifier(cause.code),
  };
}
