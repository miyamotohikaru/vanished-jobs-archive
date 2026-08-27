import { stats } from "@/data/jobs";

export default function Footer() {
  return (
    <footer className="border-t border-vja-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-[11px] tracking-[0.15em] text-vja-ink-soft md:flex-row md:items-center md:justify-between md:px-8">
        <span className="font-mono-label">消滅職業図鑑 — VANISHED JOBS ARCHIVE</span>
        <span className="font-mono-label">
          {stats.total} ENTRIES · illustrated by こすくまくん
        </span>
      </div>
    </footer>
  );
}
