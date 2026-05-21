import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "CLI — yt2ctx",
  description: "Run yt2ctx from the terminal for local jobs, scripts, and batch processing."
};

export default function CliPage() {
  return <InfoPageView page={infoPages.cli} />;
}
