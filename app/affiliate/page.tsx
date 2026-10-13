import type { Metadata } from "next";
import AffiliatePortal from "./portal";
import "./affiliate.css";

export const metadata: Metadata = {
  title: "Affiliate IntervAI — Dapatkan Komisi 30%",
  description:
    "Bagikan IntervAI dan dapatkan komisi 30% dari pembelian melalui tautan referral Anda. Pantau hasil dan ajukan pencairan.",
};
export default function AffiliatePage() {
  return <AffiliatePortal />;
}
