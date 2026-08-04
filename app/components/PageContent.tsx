import Link from "next/link";
import { blogArticles, locationPagesForHub, SitePage } from "../site-data";
import { REGION_LINKS, SERVICE_LINKS, SITE } from "../site-config";
import { QuoteForm } from "./QuoteForm";

const processSteps = [
  { number: "01", title: "Request a quote", text: "Share the vehicle, condition and pickup suburb online or by phone." },
  { number: "02", title: "Review the offer", text: "We confirm the details and explain the offer before you commit." },
  { number: "03", title: "Choose a pickup time", text: "Book a practical collection window. Standard towing is included." },
  { number: "04", title: "Get paid on pickup", text: "Complete the ownership check and receive the agreed payment." },
] as const;

const vehicleTypes = ["Cars", "Utes", "4WDs", "Vans", "Light trucks", "SUVs", "Non-runners", "Accident vehicles"];

const articleGuides: Record<string, { intro: string; sections: Array<{ title: string; text: string }> }> = {
  "/blog/sell-your-car-fast-and-easy-in-brisbane/": {
    intro: "A faster sale starts with complete information, realistic expectations and a pickup plan that works for both sides.",
    sections: [
      { title: "Prepare the details buyers need", text: "Write down the make, model, build year, odometer reading and registration status. Photograph every side, the interior, the odometer and any damage. Accurate details reduce follow-up questions and make the initial quote more useful." },
      { title: "Compare the full value of each offer", text: "Look beyond the headline amount. Confirm whether towing is included, when payment is made and what could change after inspection. Disclose missing wheels, locked steering or difficult access before booking." },
      { title: "Make the handover easy", text: "Remove belongings and toll tags, locate your identification and ownership records, and keep keys ready. Agree on the final amount and collection window before the tow truck is dispatched." },
    ],
  },
  "/blog/a-guide-to-understanding-cash-for-cars-brisbane/": {
    intro: "Cash-for-cars services value vehicles for resale, parts and recyclable material, then arrange collection from the owner.",
    sections: [
      { title: "What affects a vehicle quote", text: "Make, model, age, condition, location, completeness and demand for reusable components all matter. Photos and an honest condition description help a buyer assess those factors before pickup." },
      { title: "Questions to ask before accepting", text: "Confirm the final payment method, whether standard towing is included, who handles paperwork and which circumstances could change the quote. Ask for unclear terms to be explained before you commit." },
      { title: "What happens at collection", text: "The collector checks the vehicle and your authority to sell it, completes the agreed paperwork and pays the confirmed amount. Do not hand over the vehicle until the payment and documents match what you agreed." },
    ],
  },
  "/blog/how-to-get-cash-for-cars-in-brisbane-qld/": {
    intro: "You can make a Brisbane vehicle quote more accurate by supplying the right details and checking the collection terms upfront.",
    sections: [
      { title: "Describe the vehicle clearly", text: "Include the exact model, year, kilometres and registration status. Note accident damage, mechanical faults, missing parts and whether the car rolls, steers and has keys." },
      { title: "Explain the pickup location", text: "Provide the suburb and describe access to the vehicle. Low clearances, underground parking, steep driveways or missing wheels may require different recovery equipment." },
      { title: "Confirm the deal before pickup", text: "Check the amount, towing arrangements, payment timing and required documents. Keep a written record of the agreed terms and do not sign blank or incomplete forms." },
    ],
  },
  "/blog/selling-your-car-without-a-roadworthy-certificate/": {
    intro: "Queensland safety-certificate requirements depend on the vehicle's registration status and who is buying it, so check the current rules before disposal.",
    sections: [
      { title: "Registered and unregistered sales differ", text: "Queensland guidance says a registered vehicle generally needs a current safety certificate before it is disposed of, except in specified situations such as disposal to a licensed motor dealer. An unregistered vehicle can be sold without one." },
      { title: "Confirm which situation applies", text: "Tell the buyer whether the vehicle is registered and ask how the registration and plates will be handled. Verify the current requirements directly with Queensland Transport and Main Roads before the handover." },
      { title: "Keep a clear paper trail", text: "Record the buyer and seller, date, vehicle identification number, agreed amount and registration status. Keep copies of completed documents and proof of payment." },
    ],
  },
};

function QuoteHero({ page }: { page: SitePage }) {
  const location = page.location ? ` in ${page.location}` : " in Brisbane";
  return (
    <section className="hero">
      <div className="shell hero__grid">
        <div className="hero__copy">
          <span className="eyebrow">Local vehicle buying and free towing</span>
          <h1>{page.heading}</h1>
          <p className="hero__lead">
            Get a clear cash offer{location}, payment when we collect the vehicle and free standard towing. We buy vehicles in running or damaged condition.
          </p>
          <ul className="check-list" aria-label="Service benefits">
            <li>Offers up to {SITE.maxOffer}, based on vehicle value</li>
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
    <section className="section">
      <div className="shell">
        <div className="section-heading">
          <span className="eyebrow">Vehicles in almost any condition</span>
          <h2>What we can quote</h2>
          <p>Age, condition and registration status are considered as part of the offer.</p>
        </div>
        <div className="card-grid">
          {SERVICE_LINKS.slice(0, 6).map((service, index) => (
            <Link className="service-card" href={service.href} key={service.href}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h3>{service.label}</h3>
              <p>Get the details, eligibility information and pickup process.</p>
              <strong>View service →</strong>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function AreaSection({ page }: { page: SitePage }) {
  const locations = page.kind === "region" ? locationPagesForHub(page.path).slice(0, 18) : [];
  return (
    <section className="section section--dark">
      <div className="shell area-layout">
        <div>
          <span className="eyebrow">Mobile pickup service</span>
          <h2>{page.kind === "location" ? `Vehicle pickup in ${page.location}` : "Serving greater Brisbane"}</h2>
          <p>
            {page.kind === "location"
              ? `${page.location} is covered through our ${page.region} pickup network. Tell us where the vehicle is parked and whether a tow truck can access it safely.`
              : `We arrange pickups throughout ${SITE.serviceArea}. Availability depends on distance, vehicle access and tow-truck scheduling.`}
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

function FaqSection({ page }: { page: SitePage }) {
  const place = page.location ?? "Brisbane";
  const faqs = [
    ["How is the offer calculated?", "The vehicle's make, model, age, condition, location, completeness and recoverable value all affect the offer."],
    ["Is towing really free?", `Standard pickup in covered parts of ${place} is included. Tell us about difficult access, missing wheels or unusual recovery requirements before booking.`],
    ["What documents should I prepare?", "You will normally need photo identification and proof that you are authorised to sell the vehicle. We confirm the exact requirements before pickup."],
    ["Do I have to accept the quote?", "No. Quotes are free and there is no obligation to proceed."],
  ];
  return (
    <section className="section">
      <div className="shell faq-layout">
        <div className="section-heading section-heading--left">
          <span className="eyebrow">Helpful details</span>
          <h2>Common questions</h2>
          <p>Call us if your vehicle or pickup situation is unusual.</p>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}><summary>{question}</summary><p>{answer}</p></details>
          ))}
        </div>
      </div>
    </section>
  );
}

function StandardPage({ page }: { page: SitePage }) {
  return (
    <>
      <QuoteHero page={page} />
      <TrustStrip />
      <ProcessSection />
      <ServicesSection />
      <AreaSection page={page} />
      <FaqSection page={page} />
    </>
  );
}

function ArticlePage({ page }: { page: SitePage }) {
  const guide = articleGuides[page.path] ?? articleGuides["/blog/sell-your-car-fast-and-easy-in-brisbane/"];
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
      <p className="legal__updated">Last updated: 4 August 2026</p>
      <p>Ozi Cash for Cars collects the information you submit so we can assess your vehicle, contact you about a quote and arrange pickup if you proceed.</p>
      <h2>Information we collect</h2>
      <p>Quote forms may collect your name, phone number, email address, suburb, vehicle details and information about its condition. Our hosting provider may also process standard security and request logs.</p>
      <h2>How we use it</h2>
      <p>We use submitted information only to provide and administer the requested vehicle-buying service, prevent misuse and meet record-keeping obligations.</p>
      <h2>Sharing and storage</h2>
      <p>Information may be handled by service providers used for website hosting and email delivery. We do not sell quote-request information. We retain records only as long as reasonably needed for the service, security and legal obligations.</p>
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
  const reviews = [
    ["Quick and easy pickup", "The process was clear and the collection was arranged without fuss.", "Brisbane customer"],
    ["Straightforward service", "The team confirmed the details, arrived in the agreed window and completed the handover promptly.", "Logan customer"],
    ["Helpful on the phone", "My questions were answered before I booked, so I knew what to prepare for pickup.", "Gold Coast customer"],
  ];
  return (
    <section className="section page-listing"><div className="shell"><div className="section-heading"><span className="eyebrow">Customer experiences</span><h1>What customers value</h1><p>Clear communication, practical pickup times and a simple handover.</p></div><div className="review-grid">{reviews.map(([title, text, person]) => <blockquote key={title}><span aria-label="5 out of 5 stars">★★★★★</span><h2>{title}</h2><p>“{text}”</p><cite>{person}</cite></blockquote>)}</div></div></section>
  );
}

function VehiclesPage() {
  return (
    <><section className="page-hero"><div className="shell page-hero__inner"><span className="eyebrow">Most makes, models and conditions</span><h1>Vehicles we buy</h1><p>Request a quote for passenger, commercial, damaged and non-running vehicles.</p></div></section><section className="section"><div className="shell"><ul className="vehicle-grid">{vehicleTypes.map((vehicle) => <li key={vehicle}><span aria-hidden="true">✓</span>{vehicle}</li>)}</ul><div className="centered-cta"><p>Not sure whether your vehicle qualifies? Describe it in the quote form and we will let you know.</p><Link className="primary-button" href="/sell-my-car/#quote">Request a quote</Link></div></div></section></>
  );
}

function UtilityPage({ page }: { page: SitePage }) {
  return (
    <section className="section page-listing"><div className="shell"><div className="section-heading section-heading--left"><span className="eyebrow">Quick navigation</span><h1>{page.heading}</h1><p>Find the main services, service areas and customer information.</p></div><div className="utility-grid"><section><h2>Services</h2>{SERVICE_LINKS.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</section><section><h2>Areas</h2>{REGION_LINKS.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</section><section><h2>Information</h2><Link href="/about-us/">About us</Link><Link href="/blog/">Guides</Link><Link href="/frequently-asked-questions/">FAQs</Link><Link href="/privacy-policy/">Privacy</Link><Link href="/contact-us/">Contact</Link></section></div></div></section>
  );
}

export function PageContent({ page }: { page: SitePage }) {
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
