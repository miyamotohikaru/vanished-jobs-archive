import type { Metadata } from "next";
import TimelineView from "@/components/TimelineView";

export const metadata: Metadata = { title: "年表 | 消滅職業図鑑" };

export default function TimelinePage() {
  return <TimelineView />;
}
