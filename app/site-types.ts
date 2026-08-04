export type LegacyScript = {
  src: string;
  type: string;
  id: string;
  code: string;
};

export type PageContent = {
  bodyHtml: string;
  headHtml: string;
  scripts: LegacyScript[];
  jsonLd: string[];
};

export type PageMetadata = {
  path: string;
  title: string;
  description: string;
  robots: string;
  ogImage: string;
  bodyClass: string;
};

export type SiteIndex = {
  source: string;
  capturedAt: string;
  pages: Record<string, PageMetadata>;
};
