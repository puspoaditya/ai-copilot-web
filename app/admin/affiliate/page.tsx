import type { Metadata } from "next";
import AffiliateAdmin from "./panel";
import "../../affiliate/affiliate.css";
export const metadata: Metadata = {
  title: "Admin Affiliate — IntervAI",
  robots: { index: false, follow: false },
};
export default function AffiliateAdminPage() {
  return <AffiliateAdmin />;
}
