import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "About — yt2ctx",
  description: "About the yt2ctx cinematic context compiler."
};

export default function AboutPage() {
  return <InfoPageView page={infoPages.about} />;
}
