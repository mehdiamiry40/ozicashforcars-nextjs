import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageLoaders } from "../../data/page-loaders";
import rawIndex from "../../data/site-index.json";
import { SiteSnapshot } from "../SiteSnapshot";
import type { SiteIndex } from "../site-types";

const siteIndex = rawIndex as SiteIndex;

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

function pathFromSlug(slug?: string[]) {
  return slug?.length ? `/${slug.join("/")}/` : "/";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pathname = pathFromSlug(slug);
  const page = siteIndex.pages[pathname];
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: pathname },
    robots: page.robots || undefined,
    openGraph: {
      type: "website",
      locale: "en_AU",
      siteName: "Ozi Cash for Cars Brisbane Up To $9,999 Plus Free Car Removal",
      title: page.title,
      description: page.description,
      url: pathname,
      images: page.ogImage ? [{ url: page.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: page.ogImage ? [page.ogImage] : undefined,
    },
  };
}

export default async function SnapshotPage({ params }: PageProps) {
  const { slug } = await params;
  const pathname = pathFromSlug(slug);
  const metadata = siteIndex.pages[pathname];
  const loadPage = pageLoaders[pathname];
  if (!metadata || !loadPage) notFound();

  const content = await loadPage();
  const criticalScripts = content.scripts.filter((script) =>
    script.code.includes("var Wpfcll="),
  );
  const deferredScripts = content.scripts.filter(
    (script) => !script.code.includes("var Wpfcll="),
  );
  return (
    <>
      {criticalScripts.map((script, index) => (
        <script
          key={`critical-${index}`}
          dangerouslySetInnerHTML={{ __html: script.code }}
        />
      ))}
      {content.jsonLd.map((json, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
      <SiteSnapshot
        bodyClass={metadata.bodyClass}
        bodyHtml={content.bodyHtml}
        headHtml={content.headHtml}
        scripts={deferredScripts}
      />
    </>
  );
}
