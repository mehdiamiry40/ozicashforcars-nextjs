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
  const business = {
    "@type": ["LocalBusiness", "AutomotiveBusiness"],
    "@id": `${SITE.url}/#business`,
    name: SITE.legalName,
    url: SITE.url,
    telephone: SITE.phoneDisplay,
    email: SITE.email,
    priceRange: "$$",
    areaServed: ["Brisbane", "Logan City", "Ipswich", "Gold Coast"],
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "17:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "08:00", closes: "12:00" },
    ],
  };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      ...(page.path === "/" ? [] : [{ "@type": "ListItem", position: 2, name: page.heading, item: absoluteUrl(page.path) }]),
    ],
  };
  const primary = page.kind === "article"
    ? { "@type": "BlogPosting", headline: page.heading, description: page.description, mainEntityOfPage: absoluteUrl(page.path), author: { "@type": "Organization", name: SITE.name }, publisher: { "@id": `${SITE.url}/#business` } }
    : { "@type": "Service", name: page.heading, description: page.description, provider: { "@id": `${SITE.url}/#business` }, areaServed: page.location || "Greater Brisbane" };

  const faq = ["home", "service", "region", "location", "faq"].includes(page.kind)
    ? {
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "How is a vehicle offer calculated?", acceptedAnswer: { "@type": "Answer", text: "Offers consider the make, model, age, condition, location, completeness and recoverable value of the vehicle." } },
          { "@type": "Question", name: "Is standard vehicle towing included?", acceptedAnswer: { "@type": "Answer", text: "Standard pickup in covered service areas is included. Unusual access or recovery requirements should be disclosed before booking." } },
          { "@type": "Question", name: "Do I have to accept a quote?", acceptedAnswer: { "@type": "Answer", text: "No. Vehicle quotes are free and there is no obligation to proceed." } },
        ],
      }
    : null;

  return { "@context": "https://schema.org", "@graph": [business, primary, breadcrumb, ...(faq ? [faq] : [])] };
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
