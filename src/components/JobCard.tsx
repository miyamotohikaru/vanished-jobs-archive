"use client";

import Image from "next/image";
import { Job, statusMeta } from "@/data/jobs";
import { useLang } from "@/lib/lang";
import { dict } from "@/lib/dict";
import { enDetails } from "@/data/en";
import { yearSpans, fmtYear, lifespan } from "@/data/years";

/** 収録外用のプレースホルダー：線画のこすくまくん */
function BearPlaceholder() {
  return (
    <svg
      viewBox="0 0 100 110"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-[72%] w-auto opacity-80"
    >
      <circle cx="30" cy="22" r="9" />
      <circle cx="70" cy="22" r="9" />
      <ellipse cx="50" cy="38" rx="26" ry="22" />
      <circle cx="41" cy="35" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="59" cy="35" r="1.6" fill="currentColor" stroke="none" />
      <path d="M47 43 q3 2.5 6 0" />
      <path d="M31 57 q-8 14 -6 30 q1 12 11 15 q6 2 14 2 q8 0 14 -2 q10 -3 11 -15 q2 -16 -6 -30" />
      <ellipse cx="30" cy="72" rx="7" ry="11" transform="rotate(18 30 72)" />
      <ellipse cx="70" cy="72" rx="7" ry="11" transform="rotate(-18 70 72)" />
      <ellipse cx="42" cy="103" rx="8" ry="5" />
      <ellipse cx="58" cy="103" rx="8" ry="5" />
    </svg>
  );
}

/** はみ出し気味に大きく置く画像（現在は該当なし。必要ならパスを追加） */
const OVERSIZED = new Set<string>([]);

/** 画像ごとの位置微調整（絵柄がカード中央に来るように） */
const NUDGE: Record<string, string> = {};

/** ひとこと（カード新デザイン）の1行おさめ設定。単位は cqw / em */
const QUOTE_BASE = 4.8; // 基準の文字サイズ
const QUOTE_MAX_W = 84; // カード内で使える幅
const QUOTE_MIN_TRACK = -0.05; // 字間はここまでしか詰めない
const QUOTE_MIN_SIZE = 4.0; // これ以上小さくするくらいなら折り返す

/** 全角=1・半角=0.5 で実効文字数を数える（長い名前の縮小率計算用） */
function effLen(s: string) {
  let n = 0;
  for (const ch of s) n += ch.charCodeAt(0) > 0xff ? 1 : 0.5;
  return n;
}

export default function JobCard({ job }: { job: Job }) {
  const { lang } = useLang();
  const en = lang === "en";
  const tr = enDetails[job.no];
  const oversized = job.image ? OVERSIZED.has(job.image) : false;

  const name = en ? job.en : job.name;
  const subName = en ? job.name : job.en;
  const quote = en && tr?.quote ? tr.quote : job.quote;
  const badge = en
    ? `${statusMeta[job.status].mark}${dict.status[job.status]}${job.endLabel ? ` ${job.endLabel}` : ""}`
    : `${statusMeta[job.status].mark}${statusMeta[job.status].label}${job.endLabel ? ` ${job.endLabel}` : ""}`;

  // 名前は必ず1行に収める: カード内幅86cqwに対し収まるサイズへ縮小（上限8.8cqw）
  const nameSize = Math.min(8.8, 84 / effLen(name));

  const span = yearSpans[job.no];
  if (span) {
    return (
      <NewCard
        job={job}
        en={en}
        name={name}
        subName={subName}
        quote={quote}
        oversized={oversized}
        reading={span.reading}
        span={span}
      />
    );
  }

  return (
    <div className="@container block h-full w-full">
      <div
        className="relative flex aspect-[34/47] w-full flex-col overflow-hidden rounded-[6cqw] px-[7cqw] pb-[7cqw] pt-[6cqw] shadow-[0_2px_10px_rgba(58,46,34,0.18)]"
        style={{ background: job.color, color: job.textColor }}
      >
        <div className="flex items-start justify-between">
          <span className="font-mono-label text-[3.4cqw] tracking-[0.25em] opacity-90">
            NO.{job.no}
          </span>
          <span
            className="whitespace-nowrap rounded-full px-[3.4cqw] py-[1cqw] text-[3.2cqw] tracking-wider"
            style={{ background: job.textColor, color: job.color }}
          >
            {badge}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center py-[2cqw]">
          {job.image ? (
            <Image
              src={`/${job.image}`}
              alt={job.name}
              width={400}
              height={400}
              className={`h-full w-auto object-contain ${oversized ? "scale-115" : ""}`}
              style={NUDGE[job.image] ? { transform: NUDGE[job.image] } : undefined}
            />
          ) : (
            <BearPlaceholder />
          )}
        </div>

        <div className="text-center">
          <p
            className="whitespace-nowrap font-bold leading-tight"
            style={{ fontSize: `${nameSize}cqw` }}
          >
            {name}
          </p>
          <p className="font-mono-label mt-[1.6cqw] text-[2.9cqw] uppercase tracking-[0.35em] opacity-80">
            {subName}
          </p>
          <p className="mt-[3.4cqw] text-[3.5cqw] leading-snug opacity-90">
            「{quote}」
          </p>
        </div>
      </div>
    </div>
  );
}

/** 年代付きの新デザインカード（yearSpans に登録されたカードのみ） */
function NewCard({
  job,
  en,
  name,
  subName,
  quote,
  oversized,
  reading,
  span,
}: {
  job: Job;
  en: boolean;
  name: string;
  subName: string;
  quote: string;
  oversized: boolean;
  reading: string;
  span: { start: number; end: number };
}) {
  const statusLabel = en ? dict.status[job.status] : statusMeta[job.status].label;
  const nameSize = Math.min(11, 90 / effLen(name));
  // 読みも必ず1行に（字送り0.5emぶんを見込んで1文字=1.5倍幅で計算）
  const readingSize = Math.min(3.4, 56 / Math.max(1, effLen(reading)));
  const years = lifespan(span.start, span.end);

  // 上段の年代表記は桁数に応じて縮小（B.C.3000等の長い年号対応）
  const yearChars = fmtYear(span.start).length + fmtYear(span.end).length;
  const bigSize = Math.min(6.2, 84 / (yearChars + 2));
  const subSize = bigSize * 0.6;
  const tildeSize = bigSize * 0.72;

  // ひとことは1行に収める。まず字間を詰め、詰めきれない分だけ文字を縮める。
  // それでも小さくなりすぎる場合（英語の長い文など）は今まで通り折り返す。
  const quoteText = `「${quote}」`;
  const quoteLen = effLen(quoteText);
  const quoteRaw = quoteLen * QUOTE_BASE;
  let quoteTrack = 0; // 字間(em)
  let quoteSize = QUOTE_BASE;
  if (quoteRaw > QUOTE_MAX_W) {
    quoteTrack = Math.max(QUOTE_MIN_TRACK, QUOTE_MAX_W / quoteRaw - 1);
    quoteSize = QUOTE_MAX_W / (quoteLen * (1 + quoteTrack));
  }
  const quoteOneLine = quoteSize >= QUOTE_MIN_SIZE;

  // ステータス別の締め文言
  const closing = en
    ? {
        extinct: `vanished after ~${years} yrs`,
        transformed: `changed after ~${years} yrs`,
        ongoing: `~${years} yrs, still ongoing`,
      }[job.status]
    : {
        extinct: `およそ${years}年続いて消えた`,
        transformed: `およそ${years}年続いて姿を変えた`,
        ongoing: `およそ${years}年、いまも進行中`,
      }[job.status];

  return (
    <div className="@container block h-full w-full">
      <div
        className="relative flex aspect-[34/47] w-full flex-col overflow-hidden rounded-[6cqw] px-[7cqw] pb-[6cqw] pt-[6cqw] shadow-[0_2px_10px_rgba(58,46,34,0.18)]"
        style={{ background: job.color, color: job.textColor }}
      >
        {/* 上段: NO. と ステータスピル */}
        <div className="flex items-center justify-between">
          <span className="font-futura text-[7.5cqw] font-semibold tracking-[0.08em]">
            NO.{job.no}
          </span>
          <span
            className="ml-[3cqw] shrink-0 whitespace-nowrap rounded-full px-[5.5cqw] py-[2cqw] text-[6cqw] font-bold tracking-[0.15em]"
            style={{ background: job.textColor, color: job.color }}
          >
            {statusLabel}
          </span>
        </div>

        {/* 細い下線（全幅） */}
        {/* 位置合わせは px ではなく cqw（カード幅比例）で。px だと索引の小さいカードで効きすぎてNO.に被る */}
        <div
          className="-mt-[1.5cqw] -ml-[7cqw] w-[60cqw] border-b"
          style={{ borderColor: job.textColor }}
        />

        {/* 年代 */}
        <p className="mt-[0.6cqw] whitespace-nowrap font-bold leading-none">
          {en ? (
            <span style={{ fontSize: `${bigSize}cqw` }}>
              {fmtYear(span.start)} – {fmtYear(span.end)}
            </span>
          ) : (
            <>
              <span style={{ fontSize: `${bigSize}cqw` }}>
                {fmtYear(span.start)}
              </span>
              <span style={{ fontSize: `${subSize}cqw` }}>年</span>
              <span style={{ fontSize: `${tildeSize}cqw` }}>〜</span>
              <span style={{ fontSize: `${bigSize}cqw` }}>
                {fmtYear(span.end)}
              </span>
              <span style={{ fontSize: `${subSize}cqw` }}>年</span>
            </>
          )}
        </p>

        {/* ひとこと */}
        <p
          className={`mt-[2.8cqw] translate-y-[1.5cqw] text-center leading-snug opacity-90 ${
            quoteOneLine ? "whitespace-nowrap" : ""
          }`}
          style={{
            fontSize: `${quoteOneLine ? quoteSize : QUOTE_BASE}cqw`,
            letterSpacing: quoteOneLine ? `${quoteTrack}em` : undefined,
          }}
        >
          {quoteText}
        </p>

        {/* イラスト */}
        <div className="flex min-h-0 flex-1 items-center justify-center py-[1cqw]">
          {job.image ? (
            <Image
              src={`/${job.image}`}
              alt={job.name}
              width={400}
              height={400}
              className="h-full w-auto scale-[1.15] object-contain"
            />
          ) : (
            <BearPlaceholder />
          )}
        </div>

        {/* 読み・名前・英名 */}
        <div className="text-center">
          {!en && (
            <p
              className="whitespace-nowrap font-semibold tracking-[0.5em] opacity-80"
              style={{ fontSize: `${readingSize}cqw` }}
            >
              {reading}
            </p>
          )}
          <p
            className="mt-[1cqw] whitespace-nowrap font-bold leading-none"
            style={{ fontSize: `${nameSize}cqw` }}
          >
            {name}
          </p>
          <p className="font-mono-label mt-[1.8cqw] text-[3.1cqw] uppercase tracking-[0.35em] opacity-80">
            {subName}
          </p>
        </div>

        {/* 締めパネル */}
        <div
          className="mt-[3.4cqw] rounded-full px-[5cqw] py-[2.8cqw] text-center"
          style={{ background: job.textColor, color: job.color }}
        >
          <p className="text-[3.8cqw] font-bold tracking-[0.06em]">{closing}</p>
        </div>
      </div>
    </div>
  );
}
