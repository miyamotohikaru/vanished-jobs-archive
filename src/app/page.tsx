import IndexView from "@/components/IndexView";
import { T } from "@/lib/lang";

export default function Home() {
  return (
    <div>
      {/* ヒーロー(携帯は左寄せ・PCは中央) */}
      {/* 束のときは vja-hero の指定（globals.css）で全体を詰める。
          カードを1枚まるごと画面に入れるための場所を、ここから譲る */}
      <section className="vja-hero px-4 pb-8 pt-10 text-left md:pt-16 md:text-center">
        <h1 className="text-4xl font-bold tracking-wide md:text-6xl">
          <T
            ja="消滅職業図鑑"
            en={<span className="font-logo">Vanished Jobs Archive.</span>}
          />
        </h1>
        <p className="vja-hero-sub font-mono-label mt-3 text-[10px] tracking-[0.4em] text-vja-ink-soft">
          <T ja="VANISHED JOBS ARCHIVE." en="消滅職業図鑑" />
        </p>
        <p className="vja-hero-lead mt-5 text-sm font-semibold tracking-wider md:text-base">
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
