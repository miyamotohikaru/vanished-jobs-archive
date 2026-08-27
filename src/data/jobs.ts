import raw from "./jobs_data.json";

export type JobStatus = "extinct" | "transformed" | "ongoing";

export type Job = {
  no: string;
  name: string;
  reading: string;
  en: string;
  status: JobStatus;
  endYear: string;
  activeYears: string;
  region: string;
  category: string;
  cause: number;
  causeAll: number[];
  color: string;
  quote: string;
  summary: string;
  successor: string;
  lineageId: string | null;
  image: string | null;
  hasFullBody: boolean;
  endLabel: string;
  textColor: string;
};

export const jobs: Job[] = raw as Job[];

export const jobByNo = new Map(jobs.map((j) => [j.no, j]));

/* ---- ステータス 3分類 ---- */

export const statusMeta: Record<
  JobStatus,
  { mark: string; label: string; desc: string }
> = {
  extinct: { mark: "◆", label: "絶滅", desc: "その仕事をする人が、もういない。" },
  transformed: { mark: "◇", label: "変質", desc: "名前や形を変えて、まだ生きている。" },
  ongoing: { mark: "▲", label: "進行中", desc: "いま、まさに消えつつある。書きかけ。" },
};

export function statusBadge(j: Job): string {
  const m = statusMeta[j.status];
  return j.endLabel ? `${m.mark}${m.label} ${j.endLabel}` : `${m.mark}${m.label}`;
}

/* ---- 消えた理由 7分類 ---- */

export const causeLabels: Record<number, string> = {
  1: "電化・機械化",
  2: "通信・デジタル化",
  3: "AI・アルゴリズム",
  4: "生活様式・インフラ",
  5: "制度・法律",
  6: "医学・科学の更新",
  7: "メディア・娯楽の交代",
};

const circled = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦"];
export function causeLabel(n: number): string {
  return `${circled[n]} ${causeLabels[n]}`;
}

/* ---- 章（年代） ---- */

export const categories = [
  "前近代の世界",
  "江戸の日本",
  "産業革命の世界",
  "明治〜昭和の日本",
  "20世紀の世界",
  "平成の日本",
  "消滅進行中",
] as const;

export const categorySubtitles: Record<string, string> = {
  前近代の世界: "手わざが当たり前だった時代",
  江戸の日本: "町のすみずみに仕事があった時代",
  産業革命の世界: "機械がはじめて仕事を奪った時代",
  "明治〜昭和の日本": "もっとも密集した空白域",
  "20世紀の世界": "電気・通信・映像が入れ替えた",
  平成の日本: "自動化が日常に入りこんだ時代",
  消滅進行中: "AIの時代",
};

/* ---- 地域 8分類 ---- */

export const regionTagList = [
  "日本",
  "英",
  "欧",
  "米",
  "世界",
  "中東",
  "北欧",
  "中南米",
] as const;

export function regionTags(j: Job): string[] {
  const tags = new Set<string>();
  const s = j.region;
  if (s.includes("日本") || s.includes("日")) tags.add("日本");
  if (s.includes("英")) tags.add("英");
  if (
    s.includes("欧") ||
    s.includes("愛") ||
    s.includes("蘭") ||
    s.includes("ポーランド")
  )
    tags.add("欧");
  if (s.includes("米") || s.includes("北米")) tags.add("米");
  if (s.includes("世界")) tags.add("世界");
  if (s.includes("中東")) tags.add("中東");
  if (s.includes("北欧")) tags.add("北欧");
  if (s.includes("キューバ")) tags.add("中南米");
  if (tags.size === 0) tags.add("世界");
  return [...tags];
}

/* ---- 統計（動的計算） ---- */

export const stats = {
  total: jobs.length,
  extinct: jobs.filter((j) => j.status === "extinct").length,
  transformed: jobs.filter((j) => j.status === "transformed").length,
  ongoing: jobs.filter((j) => j.status === "ongoing").length,
  regions: regionTagList.filter((t) => jobs.some((j) => regionTags(j).includes(t)))
    .length,
  lineages: new Set(jobs.map((j) => j.lineageId).filter(Boolean)).size,
  yearSpan: "紀元前〜2026",
};
