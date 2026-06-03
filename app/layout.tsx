import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "SA Trademark Scraper",
  description: "Daily scraper for South Africa trademark PDFs"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial, sans-serif", margin: 24 }}>{children}</body>
    </html>
  );
}
