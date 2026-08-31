import Image from "next/image";
import Link from "next/link";
import { PRIMARY_LINKS, SITE } from "../site-config";
import { MobileActions } from "./MobileActions";
import { MobileNavigation } from "./MobileNavigation";

function NavigationLinks({ className }: { className: string }) {
  return (
    <div className={className}>
      <Link href="/">Home</Link>
      {PRIMARY_LINKS.map((link) => (
        <Link href={link.href} key={link.href}>{link.label}</Link>
      ))}
    </div>
  );
}

export function Header({ quoteHref = "/sell-my-car/#quote" }: { quoteHref?: string }) {
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
          <NavigationLinks className="site-nav__links" />
          <MobileNavigation />
        </nav>
        <a className="phone-button" href={SITE.phoneHref}>
          <span aria-hidden="true">☎</span>
          <span>
            <small>Call for a free quote</small>
            <strong>{SITE.phoneDisplay}</strong>
          </span>
        </a>
      </div>
      <MobileActions quoteHref={quoteHref} />
    </header>
  );
}
