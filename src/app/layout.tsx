import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Evangel Daily Meal | Daily Readings",
  description: "Read, reflect, and grow in faith with Evangel Daily Meal.",
  applicationName: "Evangel Daily Meal",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
