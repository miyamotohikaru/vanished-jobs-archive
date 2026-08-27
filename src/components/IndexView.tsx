"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import JobCard from "@/components/JobCard";
import TiltCard from "@/components/TiltCard";
import DeckView from "@/components/DeckView";
import {
  jobs,
  stats,
  statusMeta,
  categories,
  causeLabels,
  regionTagList,
  regionTags,
  JobStatus,
} from "@/data/jobs";
import { useLang, dict } from "@/lib/lang";
import { saveDeckAt, saveReturn } from "@/lib/returnNav";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-xs tracking-wider transition-colors ${
        active
          ? "border-vja-accent bg-vja-accent/10 font-semibold text-vja-accent"
          : "border-vja-line bg-vja-paper text-vja-ink-soft hover:border-vja-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono-label text-[10px] tracking-[0.35em] text-vja-accent">
        − {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** 複数選択トグル用のヘルパー */
function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export default function IndexView() {
  const { lang } = useLang();
  const en = lang === "en";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<JobStatus[]>([]);
  const [category, setCategory] = useState<string[]>([]);
  const [region, setRegion] = useState<string[]>([]);
  const [cause, setCause] = useState<number[]>([]);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  /**
   * 一覧(グリッド) か 束(デッキ) か。
   * **開いた直後は束。** この図鑑の入口はカードを1枚ずつめくるところなので、
   * 何もしていない人にはまず束を見せる。一覧は自分で押したときだけ。
   * いちど選んだ表示は次回も引き継ぐ（localStorage の vja-view）。
   */
  const [mode, setMode] = useState<"grid" | "deck">("deck");

  useEffect(() => {
    const saved = localStorage.getItem("vja-view");
    if (saved === "deck" || saved === "grid") setMode(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("vja-view", mode);
    // ヒーローは page.tsx 側にあってここからは触れないので、
    // いまの表示を html に貼っておいて、詰めるのは CSS にやらせる。
    // 束のときは版面を詰めないと、カードが一画面に収まらない
    document.documentElement.dataset.vjaView = mode;
    return () => {
      delete document.documentElement.dataset.vjaView;
    };
  }, [mode]);

  const filtered = useMemo(() => {
    let list = jobs.filter(
      (j) =>
        (status.length === 0 || status.includes(j.status)) &&
        (category.length === 0 || category.includes(j.category)) &&
        (region.length === 0 ||
          regionTags(j).some((r) => region.includes(r))) &&
        (cause.length === 0 || j.causeAll.some((c) => cause.includes(c)))
    );
    if (order === "desc") list = [...list].reverse();
    return list;
  }, [status, category, region, cause, order]);

  const activeCount =
    status.length + category.length + region.length + cause.length;

  const reset = () => {
    setStatus([]);
    setCategory([]);
    setRegion([]);
    setCause([]);
    setOrder("asc");
  };

  const ALL = en ? "All" : "すべて";

  return (
    <>
      {/* 絞り込みバー
          罫線で区切った枡目にする。枡目にすると押せる範囲が枡ぜんたいに広がり、
          どこを押すのかが分かる（文字だけだと当たりが見えない）。 */}
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="vja-bar">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="vja-bar-cell vja-bar-sort"
          >
            <span className="vja-bar-label">SORT</span>
            <span className="vja-bar-mark" aria-hidden>
              {open ? "∧" : "∨"}
            </span>
            {activeCount > 0 && (
              <span className="vja-bar-badge">{activeCount}</span>
            )}
          </button>
          {/* 表示の切り替え（索引グリッドはそのまま残し、カード表示を足す） */}
          <div className="vja-bar-cell">
            <div className="vja-modes" role="group" aria-label={en ? "view" : "表示"}>
              <button
                onClick={() => setMode("deck")}
                aria-pressed={mode === "deck"}
                className={mode === "deck" ? "is-on" : ""}
              >
                {en ? "CARDS" : "カード"}
              </button>
              <button
                onClick={() => setMode("grid")}
                aria-pressed={mode === "grid"}
                className={mode === "grid" ? "is-on" : ""}
              >
                {en ? "GRID" : "一覧"}
              </button>
            </div>
          </div>
        </div>

        {open && (
          <div className="rounded-b-lg border border-t-0 border-vja-line bg-vja-paper/60 p-6 md:p-8">
            <div className="grid gap-7 md:grid-cols-2">
              <Group label={en ? "Sort" : "並び替え"}>
                <Chip active={order === "asc"} onClick={() => setOrder("asc")}>
                  {en ? "By NO." : "NO.順"}
                </Chip>
                <Chip active={order === "desc"} onClick={() => setOrder("desc")}>
                  {en ? "Reverse" : "NO.逆順"}
                </Chip>
              </Group>
              <Group label={en ? "Status" : "ステータス"}>
                <Chip active={status.length === 0} onClick={() => setStatus([])}>
                  {ALL}
                </Chip>
                {(Object.keys(statusMeta) as JobStatus[]).map((s) => (
                  <Chip
                    key={s}
                    active={status.includes(s)}
                    onClick={() => setStatus((v) => toggle(v, s))}
                  >
                    {statusMeta[s].mark}
                    {en ? dict.status[s] : statusMeta[s].label} {stats[s]}
                  </Chip>
                ))}
              </Group>
              <Group label={en ? "Era (chapter)" : "年代(章)"}>
                <Chip active={category.length === 0} onClick={() => setCategory([])}>
                  {ALL}
                </Chip>
                {categories.map((c) => (
                  <Chip
                    key={c}
                    active={category.includes(c)}
                    onClick={() => setCategory((v) => toggle(v, c))}
                  >
                    {en ? dict.category[c] : c}
                  </Chip>
                ))}
              </Group>
              <Group label={en ? "Region" : "発祥地域"}>
                <Chip active={region.length === 0} onClick={() => setRegion([])}>
                  {ALL}
                </Chip>
                {regionTagList.map((r) => (
                  <Chip
                    key={r}
                    active={region.includes(r)}
                    onClick={() => setRegion((v) => toggle(v, r))}
                  >
                    {en ? dict.region[r] : r}
                  </Chip>
                ))}
              </Group>
              <Group label={en ? "Why it vanished" : "消えた理由"}>
                <Chip active={cause.length === 0} onClick={() => setCause([])}>
                  {ALL}
                </Chip>
                {Object.entries(causeLabels).map(([n, label]) => (
                  <Chip
                    key={n}
                    active={cause.includes(Number(n))}
                    onClick={() => setCause((v) => toggle(v, Number(n)))}
                  >
                    {en ? dict.cause[Number(n)] : label}
                  </Chip>
                ))}
              </Group>
            </div>
            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={reset}
                className="rounded-full border border-vja-line px-6 py-2 text-xs tracking-[0.2em] text-vja-ink-soft hover:border-vja-ink"
              >
                {en ? "Reset" : "リセット"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-vja-ink px-6 py-2 text-xs tracking-[0.2em] text-vja-cream hover:opacity-85"
              >
                {en
                  ? `Show results · ${filtered.length}`
                  : `結果を見る・${filtered.length}件`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* カードグリッド / 束 */}
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-8">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-vja-ink-soft">
            {en
              ? "No cards match these filters."
              : "この条件のカードは、見つかりませんでした。"}
          </p>
        ) : mode === "deck" ? (
          <DeckView
            key={filtered.map((j) => j.no).join(",")}
            jobs={filtered}
            // 引き出しが開いているあいだは束の大きさを測らせない
            // （開いたぶん下へ押し下げられた位置を測ってしまう）
            canMeasure={!open}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-5">
            {filtered.map((j, i) => (
              <Link
                key={j.no}
                href={`/jobs/${j.no}`}
                onClick={() => {
                  saveReturn();
                  // 一覧から開いた場合も覚えておき、束に切り替えたときに揃える
                  saveDeckAt(j.no);
                }}
                // 1枚ずつ配られるように少しずつ遅らせる。
                // 151枚すべてを動かすとレイヤーが増えるので最初の12枚だけにする
                className={i < 12 ? "vja-rise block" : "block"}
                style={i < 12 ? { animationDelay: `${i * 45}ms` } : undefined}
              >
                <TiltCard variant="index">
                  <JobCard job={j} />
                </TiltCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
