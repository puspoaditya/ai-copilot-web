import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import Landing from "./landing/landing";
import "./landing/landing.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-intervai-body",
  display: "swap",
});
const headingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-intervai-heading",
  display: "swap",
});

export default function Home() {
  return <Landing className={`${bodyFont.variable} ${headingFont.variable}`} />;
}
