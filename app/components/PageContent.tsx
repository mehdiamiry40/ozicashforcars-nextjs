import Link from "next/link";
import { blogArticles, locationPagesForHub, SitePage } from "../site-data";
import { REGION_LINKS, SERVICE_GROUPS, SERVICE_LINKS, SITE } from "../site-config";
import { ARTICLE_CONTENT } from "../article-content";
import { GENERAL_FAQS, SERVICE_CONTENT, type QuestionAnswer } from "../service-content";
import { QuoteForm } from "./QuoteForm";

const processSteps = [
  { number: "01", title: "Request a quote", text: "Share the vehicle, condition and pickup suburb online or by phone." },
  { number: "02", title: "Review the offer", text: "We confirm the details and explain the offer before you commit." },
  { number: "03", title: "Choose a pickup time", text: "Book a practical collection window. Standard towing is included." },
  { number: "04", title: "Get paid on pickup", text: "Complete the ownership check and receive the agreed payment." },
] as const;

const vehicleTypes = ["Cars", "Utes", "4WDs", "Vans", "Light trucks", "SUVs", "Non-runners", "Accident vehicles"];

function QuoteHero({ page }: { page: SitePage }) {
  const location = page.location ? ` in ${page.location}` : " in Brisbane";
  const service = SERVICE_CONTENT[page.path];
  const isSunshineCoast = page.path === "/cash-for-cars-sunshine-coast/";
  return (
    <section className="hero">
      <div className="shell hero__grid">
        <div className="hero__copy">
          <span className="eyebrow">Vehicle quotes and arranged pickup</span>
          <h1>{page.heading}</h1>
          <p className="hero__lead">
            {service?.intro ?? (isSunshineCoast
              ? "Enquire about a Sunshine Coast pickup before making a booking. Share your suburb, vehicle condition and access details so the team can confirm whether collection is available for your location."
              : `Request a vehicle offer${location}. Tell us the condition and pickup details, then confirm the amount, payment method and towing arrangements before deciding.`)}
          </p>
          <ul className="check-list" aria-label="Service benefits">
            <li>Offers based on the vehicle and collection details</li>
            <li>No roadworthy certificate required for an initial quote</li>
            <li>Cars, utes, vans, 4WDs and light trucks</li>
            <li>No obligation to accept</li>
          </ul>
          <div className="button-row">
            <a className="primary-button" href="#quote">Get a free quote</a>
            <a className="secondary-button" href={SITE.phoneHref}>Call {SITE.phoneDisplay}</a>
          </div>
        </div>
        <div id="quote" className="hero__form">
          <QuoteForm sourcePath={page.path} />
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Service commitments">
      <div className="shell trust-strip__grid">
        <div><strong>Free towing</strong><span>Standard local pickup included</span></div>
        <div><strong>Clear offers</strong><span>Know the amount before booking</span></div>
        <div><strong>Flexible pickup</strong><span>Choose an available collection time</span></div>
        <div><strong>Local support</strong><span>Speak with our Brisbane team</span></div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section className="section section--muted">
      <div className="shell">
        <div className="section-heading">
          <span className="eyebrow">A straightforward process</span>
          <h2>Sell your vehicle in four steps</h2>
          <p>You stay in control from the first quote through to pickup.</p>
        </div>
        <ol className="process-grid">
          {processSteps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section className="section" id="services">
      <div className="shell">
        <div className="section-heading">
          <span className="eyebrow">Find the guidance for your vehicle</span>
          <h2>What we can quote</h2>
          <p>Age, condition and registration status are considered as part of the offer.</p>
        </div>
        <div className="card-grid">
          {SERVICE_LINKS.slice(0, 6).map((service, index) => (
            <Link className="service-card" href={service.href} key={service.href}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h3>{service.label}</h3>
              <p>{SERVICE_CONTENT[service.href].description}</p>
              <strong>View service →</strong>
            </Link>
          ))}
        </div>
        <div className="centered-cta"><h3>Browse all vehicle and collection services</h3><p>Choose the topic that matches the car, truck or pickup you need to discuss.</p></div>
        <div className="utility-grid">
          {SERVICE_GROUPS.map((group) => <section key={group.title}><h3>{group.title}</h3>{group.links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</section>)}
        </div>
      </div>
    </section>
  );
}

function AreaSection({ page }: { page: SitePage }) {
  const locations = page.kind === "region" ? locationPagesForHub(page.path) : [];
  return (
    <section className="section section--dark" id="service-areas">
      <div className="shell area-layout">
        <div>
          <span className="eyebrow">Mobile pickup service</span>
          <h2>{page.location ? `Vehicle pickup enquiries in ${page.location}` : "Pickup enquiries by area"}</h2>
          <p>
            {page.location
              ? `For a pickup in ${page.location}, tell us the exact suburb and whether a collection truck can reach the vehicle safely. Confirm availability and towing terms for your location before accepting an offer.`
              : `We arrange pickups throughout ${SITE.serviceArea}. Availability depends on distance, vehicle access and tow-truck scheduling. Sunshine Coast enquiries require confirmation for the specific suburb.`}
          </p>
          <a className="secondary-button secondary-button--light" href={SITE.phoneHref}>Check pickup availability</a>
        </div>
        <div className="area-list" aria-label="Popular service areas">
          {(locations.length ? locations.map((location) => ({ href: location.path, label: location.location ?? location.heading })) : REGION_LINKS).map((area) => (
            <Link href={area.href} key={area.href}>{area.label}</Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ faqs = GENERAL_FAQS.slice(0, 4), heading = "Common questions" }: { faqs?: QuestionAnswer[]; heading?: string }) {
  return (
    <section className="section">
      <div className="shell faq-layout">
        <div className="section-heading section-heading--left">
          <span className="eyebrow">Helpful details</span>
          <h2>{heading}</h2>
          <p>Call us if your vehicle or pickup situation is unusual.</p>
        </div>
        <div className="faq-list">
          {faqs.map(({ question, answer }) => (
            <details key={question}><summary>{question}</summary><p>{answer}</p></details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicePage({ page }: { page: SitePage }) {
  const content = SERVICE_CONTENT[page.path];
  if (!content) throw new Error(`Missing authored service content: ${page.path}`);
  const guide = blogArticles.find((article) => article.path === content.relatedGuide);
  return (
    <>
      <QuoteHero page={page} />
      <section className="section section--muted"><div className="shell card-grid">
        {content.sections.map((section) => <section className="guide-card" key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
      </div></section>
      <FaqSection faqs={content.faqs} heading="Questions about this service" />
      {guide && <section className="section section--muted"><div className="shell"><h2>Before you book</h2><p>{guide.description}</p><Link href={guide.path}>{guide.heading} →</Link><p><Link href="/#services">Compare other vehicle services</Link> · <Link href="/frequently-asked-questions/">Read all common questions</Link></p></div></section>}
      <AreaSection page={page} />
    </>
  );
}

function FaqPage({ page }: { page: SitePage }) {
  return (
    <>
      <section className="page-hero"><div className="shell page-hero__inner"><span className="eyebrow">Before you sell or book a pickup</span><h1>{page.heading}</h1><p>{page.description}</p></div></section>
      <FaqSection faqs={GENERAL_FAQS} heading="Vehicle quotes, documents and collection" />
      <section className="section section--muted"><div className="shell contact-layout"><div><h2>Discuss your vehicle</h2><p>Include the condition and pickup suburb so the team can assess your enquiry.</p><p>For registration questions, read the <Link href="/blog/selling-your-car-without-a-roadworthy-certificate/">Queensland safety-certificate guide</Link> and check the linked official guidance.</p><a href={SITE.phoneHref}>Call {SITE.phoneDisplay}</a></div><div id="quote"><QuoteForm sourcePath={page.path} /></div></div></section>
    </>
  );
}

function StandardPage({ page }: { page: SitePage }) {
  if (page.path === "/cash-for-cars-sunshine-coast/") {
    return (
      <>
        <QuoteHero page={page} />
        <section className="section"><div className="shell prose-grid"><section><h2>Check your suburb before booking</h2><p>Provide the Sunshine Coast suburb where the vehicle is parked and any preferred collection dates. Wait for the team to confirm whether it can arrange a pickup for that location.</p></section><section><h2>Confirm the full collection terms</h2><p>Describe the vehicle condition, access restrictions and whether it rolls and steers. Ask for the vehicle offer, towing terms and any unusual recovery costs together before deciding.</p></section></div></section>
        <AreaSection page={page} />
        <FaqSection faqs={GENERAL_FAQS.filter(({ question }) => ["How is the offer calculated?", "Do I have to accept the quote?", "When will the vehicle be collected?"].includes(question))} />
      </>
    );
  }
  return (
    <>
      <QuoteHero page={page} />
      <TrustStrip />
      <ProcessSection />
      <ServicesSection />
      <AreaSection page={page} />
      <FaqSection />
    </>
  );
}

function ArticlePage({ page }: { page: SitePage }) {
  const guide = ARTICLE_CONTENT[page.path];
  if (!guide) throw new Error(`Missing authored article content: ${page.path}`);
  return (
    <>
      <section className="page-hero page-hero--article">
        <div className="shell page-hero__inner">
          <span className="eyebrow">Vehicle selling guide</span>
          <h1>{page.heading}</h1>
          <p>{page.description}</p>
        </div>
      </section>
      <article className="article shell article-layout">
        <div className="article__body">
          <p>By <Link href="/about-us/">{SITE.name}</Link></p>
          <p className="article__intro">{guide.intro}</p>
          {guide.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
          {page.path.includes("roadworthy-certificate") && <p className="source-note">Rules can change. Read the current <a href="https://www.qld.gov.au/transport/registration/roadworthy">Queensland Government safety certificate guidance</a> or call Transport and Main Roads on 13 23 80.</p>}
          <div className="article-callout">
            <h2>Ready for a vehicle quote?</h2>
            <p>Tell us about the vehicle and pickup suburb. There is no obligation to accept.</p>
            <Link className="primary-button" href="/sell-my-car/#quote">Request a quote</Link>
          </div>
        </div>
        <aside className="article__aside" aria-label="Related guides">
          <h2>More guides</h2>
          <ul>{blogArticles.filter((article) => article.path !== page.path).map((article) => <li key={article.path}><Link href={article.path}>{article.heading}</Link></li>)}</ul>
        </aside>
      </article>
    </>
  );
}

function BlogPage() {
  return (
    <section className="section page-listing">
      <div className="shell">
        <div className="section-heading section-heading--left">
          <span className="eyebrow">Practical, plain-English information</span>
          <h1>Car selling guides</h1>
          <p>Prepare your vehicle, compare offers and understand the pickup process.</p>
        </div>
        <div className="card-grid">
          {blogArticles.map((article) => (
            <Link className="guide-card" href={article.path} key={article.path}>
              <span>Guide</span><h2>{article.heading}</h2><p>{article.description}</p><strong>Read guide →</strong>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <article className="legal shell">
      <h1>Privacy policy</h1>
      <p className="legal__updated">Last updated: 5 September 2026</p>
      <p>Ozi Cash for Cars collects the information you submit so we can assess your vehicle, contact you about a quote and arrange pickup if you proceed.</p>
      <h2>Information we collect</h2>
      <p>Quote forms may collect your name, phone number, email address, suburb, vehicle details, information about its condition and any price you expect. Our hosting provider may also process standard security and request logs.</p>
      <h2>How we use it</h2>
      <p>We use submitted information only to provide and administer the requested vehicle-buying service, prevent misuse and meet record-keeping obligations.</p>
      <h2>Sharing and storage</h2>
      <p>Information is handled by service providers used for website hosting, database storage and email delivery. We do not sell quote-request information. The website schedules quote details in its database for deletion after 90 days. This database policy does not automatically delete copies in email inboxes, delivery-provider systems, security logs or records created if you proceed with a sale. Contact us to ask about those records or request deletion; any records that must be retained for legal obligations may be kept longer.</p>
      <h2>Your choices</h2>
      <p>You may ask to access or correct your information, or request deletion where we are not required to retain it. Contact <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call <a href={SITE.phoneHref}>{SITE.phoneDisplay}</a>.</p>
    </article>
  );
}

function ThankYouPage() {
  return (
    <section className="confirmation shell">
      <span className="confirmation__icon" aria-hidden="true">✓</span>
      <h1>We received your quote request</h1>
      <p>A team member will review the vehicle details and contact you using the information you provided.</p>
      <div className="button-row"><a className="primary-button" href={SITE.phoneHref}>Call {SITE.phoneDisplay}</a><Link className="secondary-button" href="/">Return home</Link></div>
    </section>
  );
}

function AboutPage({ page }: { page: SitePage }) {
  return (
    <>
      <section className="page-hero"><div className="shell page-hero__inner"><span className="eyebrow">A local, mobile vehicle buyer</span><h1>{page.heading}</h1><p>We help owners sell unwanted vehicles with clear quotes and arranged pickup across greater Brisbane.</p></div></section>
      <section className="section"><div className="shell prose-grid"><div><h2>What you can expect</h2><p>We ask for accurate vehicle details, explain the quote and agree on a pickup time before dispatching a tow truck. There is no obligation to proceed.</p><p>Our mobile service covers {SITE.serviceArea}. Pickup availability depends on location and safe tow-truck access.</p></div><div className="fact-card"><h2>Contact the team</h2><p><strong>Phone</strong><br /><a href={SITE.phoneHref}>{SITE.phoneDisplay}</a></p><p><strong>Email</strong><br /><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p><p><strong>Hours</strong><br />{SITE.hours.weekdays}<br />{SITE.hours.saturday}</p></div></div></section>
    </>
  );
}

function ContactPage({ page }: { page: SitePage }) {
  return (
    <>
      <section className="page-hero">
        <div className="shell page-hero__inner">
          <span className="eyebrow">Talk with our Brisbane team</span>
          <h1>{page.heading}</h1>
          <p>Call, email or send the vehicle details below for a no-obligation quote.</p>
        </div>
      </section>
      <section className="section">
        <div className="shell contact-layout">
          <div className="contact-details">
            <h2>Contact details</h2>
            <p><strong>Phone</strong><br /><a href={SITE.phoneHref}>{SITE.phoneDisplay}</a></p>
            <p><strong>Email</strong><br /><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p><strong>Service hours</strong><br />{SITE.hours.weekdays}<br />{SITE.hours.saturday}</p>
            <p>Our mobile pickup service covers {SITE.serviceArea}. Please tell us about restricted access, missing wheels or other recovery requirements.</p>
          </div>
          <div id="quote" className="contact-form"><QuoteForm sourcePath={page.path} /></div>
        </div>
      </section>
    </>
  );
}

function TestimonialsPage() {
  return (
    <section className="section page-listing"><div className="shell"><div className="section-heading section-heading--left"><span className="eyebrow">Customer feedback</span><h1>Customer reviews and feedback</h1><p>No customer testimonials are currently published on this page.</p></div><div className="prose-grid"><section><h2>Tell us about your experience</h2><p>If you have used the service, you can share feedback or raise a concern directly with the team. Include enough information to identify your enquiry and explain what you would like us to review.</p><p><a href={`mailto:${SITE.email}`}>Email {SITE.email}</a> or <a href={SITE.phoneHref}>call {SITE.phoneDisplay}</a>.</p></section><section className="fact-card"><h2>Considering a vehicle quote?</h2><p>Review the service details, ask about your pickup requirements and confirm the offer before deciding.</p><Link href="/frequently-asked-questions/">Questions to ask before booking</Link><p><Link href="/about-us/">About Ozi Cash for Cars</Link></p></section></div></div></section>
  );
}

function VehiclesPage() {
  return (
    <><section className="page-hero"><div className="shell page-hero__inner"><span className="eyebrow">Vehicle enquiry guide</span><h1>Vehicles you can enquire about</h1><p>Request a quote for passenger, commercial, damaged and non-running vehicles.</p></div></section><section className="section"><div className="shell"><ul className="vehicle-grid">{vehicleTypes.map((vehicle) => <li key={vehicle}><span aria-hidden="true">✓</span>{vehicle}</li>)}</ul><div className="centered-cta"><p>Not sure whether your vehicle qualifies? Describe it in the quote form and we will let you know.</p><Link className="primary-button" href="/sell-my-car/#quote">Request a quote</Link></div></div></section></>
  );
}

function UtilityPage({ page }: { page: SitePage }) {
  return (
    <section className="section page-listing"><div className="shell"><div className="section-heading section-heading--left"><span className="eyebrow">Quick navigation</span><h1>{page.heading}</h1><p>Find the main services, service areas and customer information.</p></div><div className="utility-grid"><section><h2>Services</h2>{SERVICE_LINKS.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</section><section><h2>Areas</h2>{REGION_LINKS.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</section><section><h2>Information</h2><Link href="/about-us/">About us</Link><Link href="/blog/">Guides</Link><Link href="/frequently-asked-questions/">FAQs</Link><Link href="/privacy-policy/">Privacy</Link><Link href="/contact-us/">Contact</Link></section></div></div></section>
  );
}

export function PageContent({ page }: { page: SitePage }) {
  if (page.kind === "service") return <ServicePage page={page} />;
  if (page.kind === "faq") return <FaqPage page={page} />;
  if (page.kind === "article") return <ArticlePage page={page} />;
  if (page.kind === "blog") return <BlogPage />;
  if (page.kind === "privacy") return <PrivacyPage />;
  if (page.kind === "thank-you") return <ThankYouPage />;
  if (page.kind === "about") return <AboutPage page={page} />;
  if (page.kind === "contact") return <ContactPage page={page} />;
  if (page.kind === "testimonials") return <TestimonialsPage />;
  if (page.kind === "vehicles") return <VehiclesPage />;
  if (page.kind === "utility") return <UtilityPage page={page} />;
  return <StandardPage page={page} />;
}
