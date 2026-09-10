import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ozicashforcars.com.au"),
  title: {
    default: "Cash for Cars Brisbane | Free Car Removal",
    template: "%s",
  },
  description:
    "Sell your vehicle in Brisbane with a fast quote, payment on pickup and free standard towing from Ozi Cash for Cars.",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: "/wp-content/uploads/2019/07/cropped-favicon-32x32.png",
    shortcut: "/wp-content/uploads/2019/07/cropped-favicon-32x32.png",
    apple: "/wp-content/uploads/2019/07/cropped-favicon-180x180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
