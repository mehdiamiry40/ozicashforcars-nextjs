import type { Metadata } from "next";
import "./globals.css";
import { HOME_DESCRIPTION, HOME_TITLE } from "./site-config";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ozicashforcars.com.au"),
  title: {
    default: HOME_TITLE,
    template: "%s",
  },
  description: HOME_DESCRIPTION,
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
