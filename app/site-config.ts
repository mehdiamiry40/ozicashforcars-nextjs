export const SITE = {
  name: "Ozi Cash for Cars",
  url: "https://www.ozicashforcars.com.au",
  phoneDisplay: "0421 719 431",
  phoneHref: "tel:0421719431",
  phoneSchema: "+61421719431",
  serviceArea: "Brisbane, Logan, Ipswich, Gold Coast and surrounding areas",
  hours: {
    weekdays: "Monday to Friday, 8am–5pm",
    saturday: "Saturday, 8am–12pm",
  },
} as const;

// 28 November 2026: the homepage no longer opens with "Cash for Cars Brisbane".
// Search Console (26 August to 25 November 2026) showed it at position 9.1 for
// "cash for car brisbane" with 2,700 impressions and no clicks, and the term
// ownership map locked that day gives that search and the plural to other
// sites. The title and heading now open with what the page already said in its
// second half: check the offer and the pickup terms before selling. The brand
// name ends the title, because "Ozi Cash for Cars Brisbane" would put the
// phrase back.
export const HOME_TITLE = "Check Your Pickup Terms in Brisbane | Ozi Cash for Cars";
export const HOME_HEADING = "Check Your Offer and Pickup Terms in Brisbane";

export const HOME_DESCRIPTION =
  "Request a Brisbane vehicle quote with your car's condition and pickup suburb. Review the offer, payment and towing terms before deciding to sell.";

/** Visible privacy-policy sentence: "Last updated: 11 November 2026". */
export const PRIVACY_POLICY_UPDATED_ISO = "2026-11-11";
export const PRIVACY_POLICY_UPDATED_LABEL = "11 November 2026";

export const NON_BRISBANE_REGION_PATHS = new Set<string>([
  "/cash-for-cars-gold-coast/",
  "/cash-for-cars-logan-city-suburbs/",
  "/cash-for-cars-sunshine-coast/",
]);

export const PRIMARY_LINKS = [
  { href: "/sell-my-car/", label: "Sell my car" },
  { href: "/#services", label: "Services" },
  { href: "/#service-areas", label: "Service areas" },
  { href: "/frequently-asked-questions/", label: "FAQs" },
  { href: "/contact-us/", label: "Contact" },
] as const;

// Junk, scrap, old and unwanted car removal are sections of /car-removal-brisbane/
// (merged 19 November 2026), so that one link stands for all of them here.
export const SERVICE_LINKS = [
  { href: "/cash-for-junk-cars/", label: "Junk cars" },
  { href: "/cash-for-damaged-cars/", label: "Damaged cars" },
  { href: "/cash-for-old-cars/", label: "Old cars" },
  { href: "/cash-for-scrap-cars/", label: "Scrap cars" },
  { href: "/cash-for-trucks/", label: "Trucks and commercial vehicles" },
  { href: "/car-removal-brisbane/", label: "Car removal Brisbane" },
  { href: "/cash-for-accident-cars/", label: "Accident cars" },
  { href: "/cash-for-unwanted-cars/", label: "Unwanted cars" },
  { href: "/cash-for-used-cars/", label: "Used cars" },
  { href: "/sell-my-car/", label: "Sell my car" },
  { href: "/car-recycling-brisbane/", label: "Car recycling enquiries" },
  { href: "/free-car-removals/", label: "Included towing terms" },
  { href: "/unwanted-truck-removals/", label: "Unwanted truck removal" },
  { href: "/used-car-removals/", label: "Used car removal" },
] as const;

// The footer lists the first six services. These follow them, so each one is
// also linked from every page of the site.
export const FOOTER_EXTRA_SERVICE_PATHS = new Set<string>(["/cash-for-used-cars/"]);

export const SERVICE_GROUPS = [
  { title: "Vehicle offers", links: SERVICE_LINKS.filter((link) => link.href.startsWith("/cash-for-") && link.href !== "/cash-for-trucks/") },
  { title: "Car collection", links: SERVICE_LINKS.filter((link) => link.href.includes("removal") && link.href !== "/unwanted-truck-removals/") },
  { title: "Selling, trucks and recycling", links: SERVICE_LINKS.filter((link) => ["/sell-my-car/", "/cash-for-trucks/", "/unwanted-truck-removals/", "/car-recycling-brisbane/"].includes(link.href)) },
];

export const REGION_LINKS = [
  { href: "/cash-for-cars-brisbane-northern-suburbs/", label: "Brisbane north" },
  { href: "/cash-for-cars-brisbane-southern-suburbs/", label: "Brisbane south" },
  { href: "/cash-for-cars-brisbane-eastern-suburbs/", label: "Brisbane east" },
  { href: "/cash-for-cars-brisbane-western-suburbs/", label: "Brisbane west" },
  { href: "/cash-for-cars-logan-city-suburbs/", label: "Logan City" },
  { href: "/cash-for-cars-gold-coast/", label: "Gold Coast" },
  { href: "/cash-for-cars-sunshine-coast/", label: "Sunshine Coast enquiries" },
] as const;

// Search Console (15 to 21 November 2026) showed truck searches that name Logan
// and Wynnum. These two regional pages send such a visitor to the trucks page in
// a sentence: "Selling a truck in <place>?".
export const TRUCK_ENQUIRY_PLACES: Record<string, string> = {
  "/cash-for-cars-logan-city-suburbs/": "Logan City",
  "/cash-for-cars-brisbane-eastern-suburbs/": "Wynnum or elsewhere in Brisbane's eastern suburbs",
};

export const INFORMATION_LINKS = [
  { href: "/about-us/", label: "About us" },
  { href: "/vehicles/", label: "Vehicle enquiries" },
  { href: "/blog/", label: "Car selling guides" },
  { href: "/frequently-asked-questions/", label: "Frequently asked questions" },
  { href: "/contact-us/", label: "Contact" },
  { href: "/privacy-policy/", label: "Privacy policy" },
] as const;
