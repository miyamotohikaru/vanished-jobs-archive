"use client";

/**
 * 戻る動線: 一覧(索引/年表/系譜)から詳細へ飛ぶ時にスクロール位置を保存し、
 * 詳細の「もどる」ボタンで元のページ・元の位置へ復帰する。
 */

const KEY = "vja-return";
/** 束(デッキ)で最後に前に出していたカード番号 */
const AT_KEY = "vja-deck-at";
const LIST_PATHS = ["/", "/timeline", "/lineage"];

export type ReturnInfo = { path: string; y: number };

/** 一覧ページでのみ現在位置を保存（詳細→詳細の移動では上書きしない） */
export function saveReturn() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (!LIST_PATHS.includes(path)) return;
  const info: ReturnInfo = { path, y: window.scrollY };
  sessionStorage.setItem(KEY, JSON.stringify(info));
}

export function readReturn(): ReturnInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReturnInfo) : null;
  } catch {
    return null;
  }
}

export function clearReturn() {
  sessionStorage.removeItem(KEY);
}

/**
 * 束で開いたカードを覚えておく。
 * 一覧のスクロール位置とは別に持つ（戻り先の復帰処理が先に走って
 * 消してしまうと、束の位置だけ失われるため）。
 */
export function saveDeckAt(no: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AT_KEY, no);
  } catch {
    /* 保存できなくても操作は続けられる */
  }
}

export function readDeckAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(AT_KEY);
  } catch {
    return null;
  }
}
