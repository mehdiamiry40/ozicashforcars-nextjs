import Link from "next/link";
import { REGION_LINKS, SERVICE_LINKS, SITE } from "../site-config";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <section aria-labelledby="footer-about">
          <h2 id="footer-about">Ozi Cash for Cars</h2>
          <p>
            Fast vehicle quotes, payment on pickup and free towing across {SITE.serviceArea}.
            Final offers depend on the vehicle&apos;s condition, location and recoverable value.
          </p>
          <a href={SITE.phoneHref}>{SITE.phoneDisplay}</a><br />
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </section>
        <nav aria-labelledby="footer-services">
          <h2 id="footer-services">Services</h2>
          <ul>
            {SERVICE_LINKS.map((link) => (
              <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
            ))}
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
          <Link href="/privacy-policy/">Privacy policy</Link>
        </section>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} {SITE.name}</span>
        <span>Brisbane, Queensland</span>
      </div>
    </footer>
  );
}
