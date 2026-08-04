"use client";

import { useEffect } from "react";
import type { LegacyScript } from "./site-types";

type SiteSnapshotProps = {
  bodyClass: string;
  bodyHtml: string;
  headHtml: string;
  scripts: LegacyScript[];
};

function installScript(definition: LegacyScript, parent: HTMLElement) {
  return new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.dataset.legacySnapshot = "true";
    if (definition.id) script.id = definition.id;
    if (definition.type) script.type = definition.type;
    if (definition.code) script.text = definition.code;
    if (definition.src) {
      script.src = definition.src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      parent.appendChild(script);
      window.setTimeout(resolve, 8_000);
      return;
    }
    parent.appendChild(script);
    resolve();
  });
}

export function SiteSnapshot({
  bodyClass,
  bodyHtml,
  headHtml,
  scripts,
}: SiteSnapshotProps) {
  useEffect(() => {
    const previousClass = document.body.className;
    document.body.className = bodyClass;
    const routeKey = window.location.pathname;
    if (document.documentElement.dataset.legacyScriptsLoaded === routeKey) {
      return () => {
        document.body.className = previousClass;
      };
    }
    document.documentElement.dataset.legacyScriptsLoaded = routeKey;

    async function hydrateLegacyFeatures() {
      for (const definition of scripts) {
        await installScript(definition, document.body);
      }
    }

    void hydrateLegacyFeatures();
    return () => {
      document.body.className = previousClass;
    };
  }, [bodyClass, scripts]);

  return (
    <>
      <div className="snapshot-head" dangerouslySetInnerHTML={{ __html: headHtml }} />
      <div className="snapshot-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
