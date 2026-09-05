import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PageContent } from "../components/PageContent";
import {
  absoluteUrl,
  getPage,
  pagePathFromSlug,
  staticParams,
  type SitePage,
} from "../site-data";
import { SITE } from "../site-config";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return staticParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage(pagePathFromSlug(slug));
  if (!page) return {};

  const image = page.ogImage || "/wp-content/uploads/2020/02/ozi-cash-for-car-buyer-banner-half2.jpg";

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.canonicalPath },
    robots: page.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: page.kind === "article" ? "article" : "website",
      locale: "en_AU",
      siteName: SITE.name,
      title: page.title,
      description: page.description,
      url: page.canonicalPath,
      images: [{ url: image, alt: page.heading }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [image],
    },
  };
}

function structuredData(page: SitePage) {
  const businessId = `${SITE.url}/#business`;
  const pageId = `${absoluteUrl(page.path)}#webpage`;
  const business = {
    "@type": "Organization",
    "@id": businessId,
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl("/wp-content/uploads/2022/04/logo.png"),
    telephone: SITE.phoneDisplay,
    email: SITE.email,
  };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      ...(page.path === "/" ? [] : [{ "@type": "ListItem", position: 2, name: page.heading, item: absoluteUrl(page.path) }]),
    ],
  };
  const pageType = page.kind === "about" ? "AboutPage"
    : page.kind === "contact" ? "ContactPage"
      : ["blog", "vehicles", "utility"].includes(page.kind) ? "CollectionPage" : "WebPage";
  const isService = ["service", "region", "location"].includes(page.kind);
  const primaryEntityId = `${absoluteUrl(page.path)}#${page.kind === "article" ? "article" : "service"}`;
  const webpage = {
    "@type": pageType,
    "@id": pageId,
    url: absoluteUrl(page.path),
    name: page.heading,
    description: page.description,
    inLanguage: "en-AU",
    about: { "@id": businessId },
    ...(page.kind === "article" || isService ? { mainEntity: { "@id": primaryEntityId } } : {}),
  };
  const article = page.kind === "article" ? {
    "@type": "BlogPosting",
    "@id": primaryEntityId,
    headline: page.heading,
    description: page.description,
    mainEntityOfPage: { "@id": pageId },
    author: { "@type": "Organization", name: SITE.name, url: absoluteUrl("/about-us/") },
    publisher: { "@id": businessId },
    ...(page.ogImage ? { image: absoluteUrl(page.ogImage) } : {}),
    // Publication/review dates are omitted until authentic editorial dates are recorded.
  } : null;
  const service = isService ? {
    "@type": "Service",
    "@id": primaryEntityId,
    name: page.heading,
    description: page.description,
    provider: { "@id": businessId },
    mainEntityOfPage: { "@id": pageId },
    // An enquiry page does not establish confirmed coverage for an unverified region.
    ...(page.path === "/cash-for-cars-sunshine-coast/" ? {} : { areaServed: page.location || SITE.serviceArea }),
  } : null;
  return { "@context": "https://schema.org", "@graph": [business, webpage, breadcrumb, ...(article ? [article] : []), ...(service ? [service] : [])] };
}

export default async function SitePageRoute({ params }: PageProps) {
  const { slug } = await params;
  const page = getPage(pagePathFromSlug(slug));
  if (!page) notFound();
  const jsonLd = JSON.stringify(structuredData(page)).replace(/</g, "\\u003c");
  const pageHasQuote = ["home", "service", "region", "location", "faq", "contact"].includes(page.kind);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header quoteHref={pageHasQuote ? "#quote" : "/sell-my-car/#quote"} />
      <main id="main-content"><PageContent page={page} /></main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
