import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteName} | Daily Bible Readings`, template: `%s | ${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  category: "religion",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName,
    title: `${siteName} | Daily Bible Readings`,
    description: siteDescription,
    url: "/",
    images: [{ url: "/ag-logo.png", width: 430, height: 403, alt: "Assemblies of God logo" }],
  },
  twitter: {
    card: "summary",
    title: `${siteName} | Daily Bible Readings`,
    description: siteDescription,
    images: ["/ag-logo.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/ag-logo.png",
    shortcut: "/ag-logo.png",
    apple: "/ag-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#17243b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
