export const REGION_RULES: readonly {
  prefix: string;
  hubPath: string;
  region: string;
}[];

export const REGION_HUB_NAMES: Readonly<Record<string, string>>;

export const MERGED_PAGES: Readonly<Record<string, string>>;

export function mergedInto(pathname: string): string | null;

export function hubForPath(pathname: string): string | null;

export function classifyPaths(paths: readonly string[]): {
  redirects: Map<string, string>;
  merged: Map<string, string>;
  content: string[];
};
