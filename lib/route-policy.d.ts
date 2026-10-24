export function redirectRules(projectRoot?: string): Array<{
  source: string;
  destination: string;
  statusCode: 301;
}>;
