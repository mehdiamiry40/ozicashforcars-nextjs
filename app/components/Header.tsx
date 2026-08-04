import Link from "next/link";
import { PRIMARY_LINKS, SITE } from "../site-config";

export function Header() {
  return (
    <header className="site-header">
      <div className="shell site-header__top">
        <Link className="brand" href="/">
          <span className="brand__mark" aria-hidden="true">O</span>
          <span>
            <strong>Ozi Cash for Cars</strong>
            <small>Brisbane vehicle buyers</small>
          </span>
        </Link>
        <a className="phone-button" href={SITE.phoneHref}>
          <span aria-hidden="true">☎</span>
          <span>
            <small>Call for a free quote</small>
            <strong>{SITE.phoneDisplay}</strong>
          </span>
        </a>
      </div>
      <nav className="site-nav" aria-label="Primary navigation">
        <div className="shell site-nav__links">
          <Link href="/">Home</Link>
          {PRIMARY_LINKS.map((link) => (
            <Link href={link.href} key={link.href}>{link.label}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
