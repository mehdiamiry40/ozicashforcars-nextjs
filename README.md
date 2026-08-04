# Ozi Cash for Cars — Next.js migration

This private project is a full-route Next.js migration of
[ozicashforcars.com.au](https://www.ozicashforcars.com.au). It preserves all
282 URLs published in the original WordPress sitemaps, along with page copy,
SEO metadata, structured data, forms, responsive styling, scripts, and locally
mirrored first-party visual assets.

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
```

## Vercel

Import this repository as a Next.js project in Vercel. The included
`vercel.json` selects the standard Next.js build automatically, so no custom
build or output settings are required.

The separate `dev:sites`, `build:sites`, and `start:sites` scripts retain
compatibility with the existing private Sites preview.

## Refreshing the source snapshot

Run `npm run snapshot` to recapture the public WordPress pages and their
first-party assets. The generated route index and page modules are stored in
`data/`; mirrored assets are stored below `public/wp-content/`.

The original WordPress scripts continue to power legacy integrations such as
Contact Form 7 and reCAPTCHA, while all public page rendering and routing is
handled by Next.js.
