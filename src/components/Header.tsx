"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { stats } from "@/data/jobs";
import { useLang } from "@/lib/lang";

const nav = [
  { href: "/", ja: "索引", en: "Index" },
  { href: "/timeline", ja: "年表", en: "Timeline" },
  { href: "/lineage", ja: "系譜", en: "Lineage" },
  { href: "/about", ja: "About", en: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/jobs") : pathname.startsWith(href);

  const langToggle = (
    <span className="font-mono-label flex items-center overflow-hidden rounded-full border border-vja-line text-[11px] tracking-widest">
      {(["ja", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-4 py-2 uppercase md:px-3 md:py-1.5 ${
            lang === l ? "bg-vja-ink text-vja-cream" : "text-vja-ink-soft hover:text-vja-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </span>
  );

  return (
    // 95%不透明の背景の裏でぼかしても見えず、スクロール毎の再合成だけが残るのでぼかしは持たない
    <header className="sticky top-0 z-40 border-b border-vja-line bg-vja-bg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-lg font-bold tracking-wide md:text-xl">
            {lang === "en" ? (
              <span className="font-logo italic">Vanished Jobs Archive.</span>
            ) : (
              "消滅職業図鑑"
            )}
          </span>
          <span className="font-mono-label hidden text-[10px] tracking-[0.2em] text-vja-ink-soft sm:inline">
            ARCHIVE · {stats.total} ENTRIES
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`pb-0.5 text-sm tracking-[0.3em] ${
                isActive(n.href)
                  ? "border-b border-vja-ink font-semibold"
                  : "text-vja-ink-soft hover:text-vja-ink"
              }`}
            >
              {lang === "en" ? n.en : n.ja}
            </Link>
          ))}
          {langToggle}
        </nav>
        {/* 携帯: 右上に言語切替のみ（ナビは下部タブ） */}
        <div className="md:hidden">{langToggle}</div>
      </div>
    </header>
  );
}
