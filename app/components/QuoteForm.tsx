"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type SubmitState = "idle" | "submitting" | "error";

export function QuoteForm({ sourcePath }: { sourcePath: string }) {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, sourcePath, startedAt: startedAt.current }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "We could not send your request.");
      }
      router.push("/thank-you/");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not send your request. Please call 0421 719 431.",
      );
    }
  }

  return (
    <form className="quote-form" onSubmit={submitQuote} aria-labelledby="quote-form-title">
      <Image
        className="quote-form__ribbon"
        src="/wp-content/uploads/2022/04/QuickandFree.png"
        width={230}
        height={70}
        alt="Quick and easy — satisfaction guaranteed"
      />
      <div className="quote-form__heading">
        <span className="eyebrow">Free, no-obligation quote</span>
        <h2 id="quote-form-title">Tell us about your vehicle</h2>
        <p>Required fields are marked with an asterisk.</p>
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="quote-name">Name <span aria-hidden="true">*</span></label>
          <input id="quote-name" name="name" autoComplete="name" required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="quote-phone">Phone <span aria-hidden="true">*</span></label>
          <input id="quote-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} />
        </div>
        <div className="field">
          <label htmlFor="quote-email">Email</label>
          <input id="quote-email" name="email" type="email" autoComplete="email" maxLength={160} />
        </div>
        <div className="field">
          <label htmlFor="quote-suburb">Pickup suburb <span aria-hidden="true">*</span></label>
          <input id="quote-suburb" name="suburb" autoComplete="address-level2" required maxLength={100} />
        </div>
        <div className="field field--wide">
          <label htmlFor="quote-vehicle">Make, model and year <span aria-hidden="true">*</span></label>
          <input id="quote-vehicle" name="vehicle" required maxLength={160} placeholder="Example: 2012 Toyota Corolla" />
        </div>
        <div className="field field--wide">
          <label htmlFor="quote-condition">Vehicle condition</label>
          <textarea id="quote-condition" name="condition" rows={3} maxLength={1200} placeholder="Running condition, damage, missing parts or access notes" />
        </div>
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="quote-company">Company</label>
        <input id="quote-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="consent" htmlFor="quote-consent">
        <input id="quote-consent" name="consent" type="checkbox" value="yes" required />
        <span>I agree that Ozi Cash for Cars may contact me about this quote. See the <Link href="/privacy-policy/">privacy policy</Link>.</span>
      </label>

      <button className="primary-button quote-form__submit" type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sending…" : "Get my free quote"}
      </button>
      <p className={`form-status${state === "error" ? " form-status--error" : ""}`} role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
