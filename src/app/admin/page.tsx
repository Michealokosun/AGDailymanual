import type { Metadata } from "next";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminStudio } from "@/components/AdminStudio";
import { getAllReadings } from "@/data/readings";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Reading CMS | Evangel Daily Meal",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return <AdminLogin />;
  const readings = await getAllReadings();
  return <AdminStudio initialReadings={readings} />;
}
