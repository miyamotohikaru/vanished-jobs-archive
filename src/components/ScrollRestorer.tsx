"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { readReturn, clearReturn } from "@/lib/returnNav";

/** 一覧ページに戻ってきた時、保存済みのスクロール位置へ瞬時に復帰する */
export default function ScrollRestorer() {
  const pathname = usePathname();

  useEffect(() => {
    const info = readReturn();
    if (info && info.path === pathname) {
      window.scrollTo({ top: info.y, behavior: "instant" as ScrollBehavior });
      clearReturn();
    }
  }, [pathname]);

  return null;
}
