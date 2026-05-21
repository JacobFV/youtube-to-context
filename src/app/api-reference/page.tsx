import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "API reference — yt2ctx",
  description: "POST /api/analyze as buffered JSON or streaming NDJSON for yt2ctx integrations."
};

export default function ApiReferencePage() {
  return <InfoPageView page={infoPages["api-reference"]} />;
}
