"use client";

import { useState } from "react";
import {
  jobs,
  stats,
  statusMeta,
  categories,
  categorySubtitles,
  JobStatus,
} from "@/data/jobs";
import ArtChip from "@/components/ArtChip";
import { useLang, dict } from "@/lib/lang";

/** 中央軸に置く「機械・技術・制度」のできごと(章ごと) */
const events: Record<string, string[]> = {
  前近代の世界: ["1450s 活版印刷"],
  江戸の日本: ["1657 明暦の大火"],
  産業革命の世界: ["1832 解剖法", "1876 廃刀令"],
  "明治〜昭和の日本": ["1927 トーキー", "1946 ENIAC"],
  "20世紀の世界": ["1967 自動改札", "1979 電話自動化"],
  平成の日本: ["1999 東証立会場閉鎖"],
  消滅進行中: ["2022 生成AI"],
};

const subtitleEn: Record<string, string> = {
  前近代の世界: "when handwork was the default",
  江戸の日本: "a job on every street corner",
  産業革命の世界: "when machines first took work away",
  "明治〜昭和の日本": "the densest blank zone",
  "20世紀の世界": "replaced by electricity, telecom, and film",
  平成の日本: "when automation entered daily life",
  消滅進行中: "the age of AI",
};

function JobChip({ job, en }: { job: (typeof jobs)[number]; en: boolean }) {
  const m = statusMeta[job.status];
  const name = en ? job.en : job.name;
  const long = name.length > (en ? 16 : 8);
  return (
    <ArtChip job={job} href={`/jobs/${job.no}`} ongoing={job.status === "ongoing"}>
      <span className={long ? "text-[8.5px] md:text-[11px]" : "text-[9.5px] md:text-xs"}>
        <span className="font-semibold">{name}</span>{" "}
        <span className="text-[8px] opacity-85 md:text-[10px]">
          {m.mark}
          {job.endLabel}
        </span>
      </span>
    </ArtChip>
  );
}

export default function TimelineView() {
  const { lang } = useLang();
  const en = lang === "en";
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const filtered = status === "all" ? jobs : jobs.filter((j) => j.status === status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <header className="text-center">
        <p className="font-mono-label text-[10px] tracking-[0.6em] text-vja-ink-soft">
          TIMELINE
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-[0.15em] md:text-4xl">
          {en ? (
            "In the order they vanished."
          ) : (
            <>
              仕事が消えた順に、
              <br className="md:hidden" />
              ならべる。
            </>
          )}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed tracking-wider text-vja-ink-soft">
          {en ? (
            "From antiquity to today. The center band marks events of machines, technology, and institutions — many jobs took their last breath beside them."
          ) : (
            <>
              古代から現在まで。
              <br className="md:hidden" />
              中央の帯は「機械・技術・制度」のできごと——
              <br className="md:hidden" />
              多くの職業は、この隣で息を止めた。
            </>
          )}
        </p>
      </header>

      {/* フィルタ */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {(
          [
            ["all", en ? "All" : "すべて", stats.total],
            ["extinct", `◆${en ? dict.status.extinct : "絶滅"}`, stats.extinct],
            ["transformed", `◇${en ? dict.status.transformed : "変質"}`, stats.transformed],
            ["ongoing", `▲${en ? dict.status.ongoing : "進行中"}`, stats.ongoing],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setStatus(key as JobStatus | "all")}
            className={`rounded-full border px-4 py-1.5 text-xs tracking-wider ${
              status === key
                ? "border-vja-ink bg-vja-ink text-vja-cream"
                : "border-vja-line bg-vja-paper text-vja-ink-soft hover:border-vja-ink-soft"
            }`}
          >
            {label} {count}
          </button>
        ))}
      </div>

      {/* 年表本体 */}
      <div className="relative mt-12">
        {/* 中央軸 */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-vja-line" />

        {categories.map((cat) => {
          const list = filtered.filter((j) => j.category === cat);
          if (list.length === 0) return null;
          const subtitle = en ? subtitleEn[cat] : categorySubtitles[cat];
          return (
            <section key={cat} className="relative py-8">
              <h2 className="relative z-10 text-center">
                <span className="bg-vja-bg px-4 text-sm font-bold tracking-[0.3em]">
                  {en ? dict.category[cat] : cat}
                  <span className="ml-3 hidden font-normal text-vja-ink-soft md:inline">
                    — {subtitle}
                  </span>
                </span>
              </h2>
              <p className="relative z-10 mt-1 text-center text-[11px] tracking-[0.2em] text-vja-ink-soft md:hidden">
                <span className="bg-vja-bg px-3">{subtitle}</span>
              </p>

              {/* できごとマーカー */}
              <div className="relative z-10 mt-5 flex flex-wrap justify-center gap-2">
                {(events[cat] ?? []).map((e) => (
                  <span
                    key={e}
                    className="font-mono-label rounded border border-vja-line bg-vja-paper px-3 py-1 text-[10px] tracking-wider text-vja-ink-soft"
                  >
                    {e}
                  </span>
                ))}
              </div>

              {/* 職業チップ:中央軸の左右(携帯でも2列を維持) */}
              <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-3 md:gap-x-16">
                <div className="flex flex-col items-end gap-4">
                  {list
                    .filter((_, i) => i % 2 === 0)
                    .map((j) => (
                      <JobChip key={j.no} job={j} en={en} />
                    ))}
                </div>
                <div className="flex flex-col items-start gap-4">
                  {list
                    .filter((_, i) => i % 2 === 1)
                    .map((j) => (
                      <JobChip key={j.no} job={j} en={en} />
                    ))}
                </div>
              </div>
            </section>
          );
        })}

        <p className="relative z-10 py-8 text-center text-xs tracking-[0.3em] text-vja-ink-soft">
          <span className="bg-vja-bg px-4">
            {en
              ? "Now —— the rest is not yet written"
              : "現在 —— この先は、まだ書かれていない"}
          </span>
        </p>
      </div>
    </div>
  );
}
