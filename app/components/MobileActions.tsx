"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { SITE } from "../site-config";

export function MobileActions({ quoteHref }: { quoteHref: string }) {
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let pendingFrame = 0;

    function keepFocusVisible(event: Event) {
      const target = event.target;
      const bar = barRef.current;
      if (!(target instanceof HTMLElement) || !bar || bar.contains(target)) return;
      if (getComputedStyle(bar).display === "none") return;

      window.cancelAnimationFrame(pendingFrame);
      pendingFrame = window.requestAnimationFrame(() => {
        const targetBottom = target.getBoundingClientRect().bottom;
        const visibleBottom = bar.getBoundingClientRect().top - 12;
        if (targetBottom > visibleBottom) {
          window.scrollBy({ top: targetBottom - visibleBottom, behavior: "auto" });
        }
      });
    }

    document.addEventListener("focusin", keepFocusVisible);
    return () => {
      document.removeEventListener("focusin", keepFocusVisible);
      window.cancelAnimationFrame(pendingFrame);
    };
  }, []);

  return (
    <nav className="mobile-actions" aria-label="Quick quote actions" ref={barRef}>
      <a href={SITE.phoneHref}>Call {SITE.phoneDisplay}</a>
      <Link href={quoteHref}>Get a quote</Link>
    </nav>
  );
}
