import Link from "next/link";
import { INFORMATION_LINKS, NON_BRISBANE_REGION_PATHS, REGION_LINKS, SERVICE_LINKS, SITE } from "../site-config";

export function Footer({ pathname = "/" }: { pathname?: string }) {
  const services = NON_BRISBANE_REGION_PATHS.has(pathname)
    ? SERVICE_LINKS.filter((link) => !/brisbane/i.test(link.label))
    : SERVICE_LINKS;
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <section aria-labelledby="footer-about">
          <h2 id="footer-about">Ozi Cash for Cars</h2>
          <p>
            Vehicle quotes and arranged pickup across {SITE.serviceArea}.
            Confirm availability, the final offer and towing terms for your vehicle before booking.
          </p>
          <a href={SITE.phoneHref}>{SITE.phoneDisplay}</a><br />
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </section>
        <nav aria-labelledby="footer-services">
          <h2 id="footer-services">Services</h2>
          <ul>
            {services.slice(0, 6).map((link) => (
              <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
            ))}
            <li><Link href="/#services">Browse all services</Link></li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-areas">
          <h2 id="footer-areas">Service areas</h2>
          <ul>
            {REGION_LINKS.map((link) => (
              <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
        <section aria-labelledby="footer-hours">
          <h2 id="footer-hours">Contact hours</h2>
          <p>{SITE.hours.weekdays}<br />{SITE.hours.saturday}</p>
          <p>Mobile pickup service. Please call before visiting or arranging a handover.</p>
          <nav aria-label="Customer information"><ul>{INFORMATION_LINKS.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul></nav>
        </section>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} {SITE.name}</span>
        <span>Brisbane, Queensland</span>
      </div>
    </footer>
  );
}
