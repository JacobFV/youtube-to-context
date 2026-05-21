import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "Legal — yt2ctx",
  description: "Usage, rights, and deployment notes for yt2ctx."
};

export default function LegalPage() {
  return <InfoPageView page={infoPages.legal} />;
}
