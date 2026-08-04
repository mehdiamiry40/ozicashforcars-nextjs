export const SITE = {
  name: "Ozi Cash for Cars",
  legalName: "Ozi Cash for Cars",
  url: "https://www.ozicashforcars.com.au",
  phoneDisplay: "0421 719 431",
  phoneHref: "tel:0421719431",
  email: "contact@ozicashforcars.com.au",
  maxOffer: "$19,999",
  serviceArea: "Brisbane, Logan, Ipswich, Gold Coast and surrounding areas",
  hours: {
    weekdays: "Monday to Friday, 8am–5pm",
    saturday: "Saturday, 8am–12pm",
  },
} as const;

export const PRIMARY_LINKS = [
  { href: "/sell-my-car/", label: "Sell my car" },
  { href: "/cash-for-junk-cars/", label: "Services" },
  { href: "/cash-for-cars-brisbane-northern-suburbs/", label: "Service areas" },
  { href: "/frequently-asked-questions/", label: "How it works" },
  { href: "/contact-us/", label: "Contact" },
] as const;

export const SERVICE_LINKS = [
  { href: "/cash-for-junk-cars/", label: "Junk cars" },
  { href: "/cash-for-damaged-cars/", label: "Damaged cars" },
  { href: "/cash-for-old-cars/", label: "Old cars" },
  { href: "/cash-for-scrap-cars/", label: "Scrap cars" },
  { href: "/cash-for-trucks/", label: "Trucks and commercial vehicles" },
  { href: "/car-removal-brisbane/", label: "Free car removal" },
] as const;

export const REGION_LINKS = [
  { href: "/cash-for-cars-brisbane-northern-suburbs/", label: "Brisbane north" },
  { href: "/cash-for-cars-brisbane-southern-suburbs/", label: "Brisbane south" },
  { href: "/cash-for-cars-brisbane-eastern-suburbs/", label: "Brisbane east" },
  { href: "/cash-for-cars-brisbane-western-suburbs/", label: "Brisbane west" },
  { href: "/cash-for-cars-logan-city-suburbs/", label: "Logan City" },
  { href: "/cash-for-cars-gold-coast/", label: "Gold Coast" },
] as const;
