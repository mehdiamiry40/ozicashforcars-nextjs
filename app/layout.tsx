import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ozicashforcars.com.au"),
  title: {
    default: "Cash for Cars Brisbane with FREE Brisbane-wide Car Removal",
    template: "%s",
  },
  description:
    "Ozi Cash for Cars Brisbane is the #1 cash for car buyer in Brisbane. We pay top dollar for scrap cars in Brisbane and provide free towing.",
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
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
