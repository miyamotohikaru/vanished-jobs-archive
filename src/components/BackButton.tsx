"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readReturn } from "@/lib/returnNav";
import { useLang } from "@/lib/lang";

const LABELS: Record<string, { ja: string; en: string }> = {
  "/": { ja: "索引にもどる", en: "Back to index" },
  "/timeline": { ja: "年表にもどる", en: "Back to timeline" },
  "/lineage": { ja: "系譜にもどる", en: "Back to lineage" },
};

/** 詳細ページの戻るボタン: 来た一覧ページ(索引/年表/系譜)へ戻る */
export default function BackButton() {
  const { lang } = useLang();
  const [path, setPath] = useState("/");

  useEffect(() => {
    const info = readReturn();
    if (info && LABELS[info.path]) setPath(info.path);
  }, []);

  const label = LABELS[path] ?? LABELS["/"];

  return (
    <Link
      href={path}
      className="inline-flex items-center gap-2 rounded-full border border-vja-ink bg-vja-paper px-5 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:bg-vja-ink hover:text-vja-cream"
    >
      ← {lang === "en" ? label.en : label.ja}
    </Link>
  );
}
