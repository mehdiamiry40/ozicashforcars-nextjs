import Link from "next/link";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { SITE } from "./site-config";

export default function NotFound() {
  return (
    <><Header /><main id="main-content"><section className="confirmation shell"><span className="confirmation__code">404</span><h1>We couldn&apos;t find that page</h1><p>The address may have changed. Use the links below or call us for help.</p><div className="button-row"><Link className="primary-button" href="/">Go to homepage</Link><a className="secondary-button" href={SITE.phoneHref}>Call {SITE.phoneDisplay}</a></div></section></main><Footer /></>
  );
}
