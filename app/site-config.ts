export const SITE = {
  name: "Ozi Cash for Cars",
  url: "https://www.ozicashforcars.com.au",
  phoneDisplay: "0421 719 431",
  phoneHref: "tel:0421719431",
  email: "contact@ozicashforcars.com.au",
  serviceArea: "Brisbane, Logan, Ipswich, Gold Coast and surrounding areas",
  hours: {
    weekdays: "Monday to Friday, 8am–5pm",
    saturday: "Saturday, 8am–12pm",
  },
} as const;

export const PRIMARY_LINKS = [
  { href: "/sell-my-car/", label: "Sell my car" },
  { href: "/#services", label: "Services" },
  { href: "/#service-areas", label: "Service areas" },
  { href: "/frequently-asked-questions/", label: "FAQs" },
  { href: "/contact-us/", label: "Contact" },
] as const;

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
  { href: "/junk-car-removals/", label: "Junk car removal" },
  { href: "/old-car-removals/", label: "Old car removal" },
  { href: "/scrap-car-removals/", label: "Scrap car removal" },
  { href: "/unwanted-car-removals/", label: "Unwanted car removal" },
  { href: "/unwanted-truck-removals/", label: "Unwanted truck removal" },
  { href: "/used-car-removals/", label: "Used car removal" },
] as const;

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

export const INFORMATION_LINKS = [
  { href: "/about-us/", label: "About us" },
  { href: "/vehicles/", label: "Vehicle enquiries" },
  { href: "/blog/", label: "Car selling guides" },
  { href: "/frequently-asked-questions/", label: "Frequently asked questions" },
  { href: "/testimonials/", label: "Reviews and feedback" },
  { href: "/contact-us/", label: "Contact" },
  { href: "/privacy-policy/", label: "Privacy policy" },
] as const;
