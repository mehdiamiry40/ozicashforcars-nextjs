export const CSP_HASH_PLACEHOLDER: string;
export function buildContentSecurityPolicy(scriptHashes?: readonly string[]): string;
export function buildDevContentSecurityPolicy(): string;
export function buildResourceContentSecurityPolicy(): string;
