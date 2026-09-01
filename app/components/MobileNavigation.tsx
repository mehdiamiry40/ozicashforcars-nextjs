"use client";

import Link from "next/link";
import { KeyboardEvent, useRef } from "react";
import { PRIMARY_LINKS } from "../site-config";

export function MobileNavigation() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key !== "Escape" || !detailsRef.current?.open) return;
    event.preventDefault();
    closeMenu();
    detailsRef.current.querySelector("summary")?.focus();
  }

  return (
    <details className="mobile-nav" ref={detailsRef} onKeyDown={handleKeyDown}>
      <summary>Menu</summary>
      <div className="mobile-nav__links">
        <Link href="/" onClick={closeMenu}>Home</Link>
        {PRIMARY_LINKS.map((link) => (
          <Link href={link.href} key={link.href} onClick={closeMenu}>{link.label}</Link>
        ))}
      </div>
    </details>
  );
}
