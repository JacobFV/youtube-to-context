import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "Web app — yt2ctx",
  description: "Use yt2ctx in the browser with live NDJSON progress and artifact downloads."
};

export default function WebPage() {
  return <InfoPageView page={infoPages.web} />;
}
