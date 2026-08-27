"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";

const tabs = [
  { href: "/", ja: "索引", en: "Index" },
  { href: "/timeline", ja: "年表", en: "Timeline" },
  { href: "/lineage", ja: "系譜", en: "Lineage" },
  { href: "/about", ja: "About", en: "About" },
];

export default function TabBar() {
  const pathname = usePathname();
  const { lang } = useLang();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/jobs") : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-vja-line bg-vja-paper md:hidden">
      <div className="flex items-center justify-around py-3">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`text-xs tracking-[0.3em] ${
              isActive(t.href) ? "font-bold" : "text-vja-ink-soft"
            }`}
          >
            {lang === "en" ? t.en : t.ja}
          </Link>
        ))}
      </div>
    </nav>
  );
}
