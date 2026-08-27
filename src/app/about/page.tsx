import type { Metadata } from "next";
import JobCard from "@/components/JobCard";
import { jobByNo, stats, statusMeta, causeLabel } from "@/data/jobs";

export const metadata: Metadata = { title: "About | 消滅職業図鑑" };

export default function AboutPage() {
  const sampleCard = jobByNo.get("015")!;

  return (
    <div>
      {/* ヒーロー */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <h1 className="text-3xl font-bold leading-relaxed tracking-[0.1em] md:text-4xl">
          「コンピュータ」は、
          <br />
          かつて人間の職業だった。
        </h1>
        <p className="mt-6 text-sm tracking-wider text-vja-ink-soft">
          それを知ると、いまの自分の仕事の見え方が、一瞬だけ変わる。
        </p>
        <div className="mx-auto mt-10 h-px w-12 bg-vja-ink-soft" />
        <div className="mt-10 space-y-5 text-left leading-loose">
          <p>
            このサイトは、歴史上たしかに存在し、いまは
            <strong>消えた/姿を変えた/消えつつある</strong>職業{stats.total}
            種を収録したアーカイブです。集めて完成させる図鑑ではなく、はじめから
            {stats.total}
            件すべてがそろっています。過去を懐かしむためではなく、「仕事が消える」というできごとが、ずっと昔からくり返されてきた、ごくふつうのことだと知るためのものです。
          </p>
          <p>
            案内役は、白いクマの<strong>こすくまくん</strong>
            。それぞれの職業に扮したイラストとともに、一枚ずつ記録していきます。
          </p>
        </div>
      </section>

      {/* ステータス3分類 */}
      <section className="bg-vja-panel py-14">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <p className="font-mono-label text-center text-[10px] tracking-[0.5em] text-vja-ink-soft">
            ステータス 3分類
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-vja-accent bg-vja-paper p-6">
              <p className="font-bold text-vja-accent">
                ◆ 絶滅 <span className="font-logo">{stats.extinct}</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-vja-ink-soft">
                {statusMeta.extinct.desc}
              </p>
            </div>
            <div className="rounded-lg border border-vja-line bg-vja-paper p-6">
              <p className="font-bold">
                ◇ 変質 <span className="font-logo">{stats.transformed}</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-vja-ink-soft">
                {statusMeta.transformed.desc}
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-vja-blue bg-vja-paper p-6">
              <p className="font-bold text-vja-blue">
                ▲ 進行中 <span className="font-logo">{stats.ongoing}</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-vja-ink-soft">
                {statusMeta.ongoing.desc}
              </p>
            </div>
          </div>

          <p className="font-mono-label mt-12 text-center text-[10px] tracking-[0.5em] text-vja-ink-soft">
            消えた理由 7分類
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <span
                key={n}
                className="rounded bg-vja-paper px-4 py-1.5 text-xs tracking-wider"
              >
                {causeLabel(n)}
              </span>
            ))}
          </div>

          {/* 統計(jobs_data.json から動的計算) */}
          <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-stretch justify-center">
            {[
              { n: String(stats.total), label: "項目" },
              { n: stats.yearSpan, label: "年代スパン" },
              { n: String(stats.regions), label: "地域" },
              { n: String(stats.lineages), label: "系譜ライン" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`px-6 py-2 text-center ${i > 0 ? "border-l border-vja-line" : ""}`}
              >
                <p className="font-logo text-2xl font-bold md:text-3xl">{s.n}</p>
                <p className="font-mono-label mt-1 text-[10px] tracking-[0.3em] text-vja-ink-soft">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 物理カード */}
      <section className="mx-auto max-w-4xl px-4 py-16 md:px-8">
        <div className="grid items-center gap-10 md:grid-cols-[240px_1fr]">
          <div className="mx-auto w-full max-w-[240px] rotate-[-3deg]">
            <JobCard job={sampleCard} />
          </div>
          <div>
            <p className="font-mono-label text-[10px] tracking-[0.4em] text-vja-ink-soft">
              最初から、{stats.total}枚ぜんぶある。
            </p>
            <p className="mt-4 leading-loose">
              この図鑑は、集めて育てるものではありません。ひらいた瞬間から、{stats.total}
              の記録がすべてそろっています。どの職業も、はじめからそこに在る——あとから加わるのは、これから消えていく仕事だけ。
            </p>
            <p className="mt-4 text-sm leading-loose text-vja-ink-soft">
              各ページには物理トレカ版のカードイメージ(表:こすくまくんのイラスト、裏:記録)を掲載。デジタルと同じ一枚を、手にとれる資料として並べています。
            </p>
          </div>
        </div>
      </section>

      {/* クレジット */}
      <section className="border-t border-vja-line">
        <div className="mx-auto grid max-w-4xl gap-10 px-4 py-12 md:grid-cols-2 md:px-8">
          <div>
            <p className="font-mono-label text-[10px] tracking-[0.4em] text-vja-ink-soft">
              出典・クレジット
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed">
              <li>企画・構成 — ____</li>
              <li>イラスト — こすくまくん</li>
              <li>本文・監修 — ____</li>
              <li>参考文献 — ____(一次資料にて裏取り)</li>
            </ul>
          </div>
          <div>
            <p className="font-mono-label text-[10px] tracking-[0.4em] text-vja-ink-soft">
              お問い合わせ
            </p>
            <p className="mt-4 text-sm leading-loose">
              掲載職業のご提案・誤りのご指摘は ____ まで。
              <br />
              あなたの街に「消えた仕事」はありませんか。
            </p>
          </div>
        </div>
        <p className="pb-12 text-center">
          <span className="rounded-full border border-dashed border-vja-blue px-6 py-2 text-xs tracking-wider text-vja-blue">
            ▲のカードは、まだ書きかけです。
          </span>
        </p>
      </section>
    </div>
  );
}
