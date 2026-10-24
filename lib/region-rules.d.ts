export const REGION_RULES: readonly {
  prefix: string;
  hubPath: string;
  region: string;
}[];

export const REGION_HUB_NAMES: Readonly<Record<string, string>>;

export function hubForPath(pathname: string): string | null;

export function classifyPaths(paths: readonly string[]): {
  redirects: Map<string, string>;
  content: string[];
};
