import Image from "next/image";
import Link from "next/link";
import { PRIMARY_LINKS, SITE } from "../site-config";

export function Header() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="brand" href="/">
          <Image
            src="/wp-content/uploads/2022/04/logo.png"
            width={258}
            height={70}
            priority
            alt="Ozi Cash for Cars"
          />
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          <div className="site-nav__links">
            <Link href="/">Home</Link>
            {PRIMARY_LINKS.map((link) => (
              <Link href={link.href} key={link.href}>{link.label}</Link>
            ))}
          </div>
        </nav>
        <a className="phone-button" href={SITE.phoneHref}>
          <span aria-hidden="true">☎</span>
          <span>
            <small>Call for a free quote</small>
            <strong>{SITE.phoneDisplay}</strong>
          </span>
        </a>
      </div>
    </header>
  );
}
