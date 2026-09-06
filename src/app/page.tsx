import type { Metadata } from "next";
import IndexView from "@/components/IndexView";
import { T } from "@/lib/lang";

// ?x=1 のようにクエリを付けて配っても、素のURLと同じ1ページとして扱われるように。
// canonical を layout に置くと詳細ページ151件まで索引を指してしまうので、ここに置く。
export const metadata: Metadata = {
  alternates: { canonical: "https://vanished-jobs-archive.kosukuma.com" },
};

export default function Home() {
  return (
    <div>
      {/* ヒーロー(携帯は左寄せ・PCは中央) */}
      {/* 題はヘッダが出しているので、ここでは出さない（同じ名前が2つ並ぶため）。
          ローマ字の副題も題と対の飾りなので、題と一緒に外した。
          残すのは惹句の一行だけ。ここが図鑑の入口になる */}
      <section className="vja-hero px-4 pb-8 pt-10 text-left md:pt-16 md:text-center">
        <p className="vja-hero-lead text-sm font-semibold tracking-wider md:text-base">
          <T
            ja="「コンピュータ」は、かつて人間の職業だった。"
            en={"“Computer” was once a human job."}
          />
        </p>
      </section>

      <IndexView />
    </div>
  );
}
