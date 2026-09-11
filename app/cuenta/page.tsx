import type { Metadata } from "next";
import { AccountApp } from "@/components/account";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
  alternates: { canonical: "/cuenta" },
};

export default function Page() {
  return <AccountApp />;
}
