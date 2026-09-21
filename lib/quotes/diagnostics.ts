type ErrorFields = {
  name?: unknown;
  code?: unknown;
  severity?: unknown;
  routine?: unknown;
  sourceError?: unknown;
  cause?: unknown;
};

// Only short identifiers are accepted, never free text.
function identifier(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 64 ? value : undefined;
}

/**
 * Describes why a quote store call failed, using only enum-like identifiers: a
 * PostgreSQL SQLSTATE, an error class name, a Node syscall code. Messages are
 * deliberately excluded, so a connection string, a credential or a customer
 * detail cannot reach the log. `JSON.stringify` drops the absent fields.
 *
 * Neon wraps a transport failure in `sourceError`, whose own `cause` carries
 * the syscall code for a DNS, TLS or connection error.
 */
export function describeQuoteStoreError(error: unknown) {
  const thrown = (error ?? {}) as ErrorFields;
  const source = (thrown.sourceError ?? {}) as ErrorFields;
  const cause = (source.cause ?? thrown.cause ?? {}) as ErrorFields;
  return {
    errorName: identifier(thrown.name) ?? typeof error,
    sqlState: identifier(thrown.code),
    severity: identifier(thrown.severity),
    routine: identifier(thrown.routine),
    sourceName: identifier(source.name),
    syscallCode: identifier(source.code) ?? identifier(cause.code),
  };
}
