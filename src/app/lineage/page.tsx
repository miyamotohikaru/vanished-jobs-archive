import type { Metadata } from "next";
import { jobByNo } from "@/data/jobs";
import ArtChip from "@/components/ArtChip";
import { lineageChains, LineageNode } from "@/data/lineage";
import { T } from "@/lib/lang";

export const metadata: Metadata = { title: "系譜 | 消滅職業図鑑" };

const chainTitleEn: Record<string, string> = {
  通信: "Communication",
  計算: "Computation",
  時刻: "Time",
  冷却: "Cooling",
  光: "Light",
  物語: "Storytelling",
  貸与: "Lending",
  印刷: "Printing",
  移動: "Transport",
  接客販売: "Retail & service",
  医療: "Medicine",
  記録: "Records",
};

function NodeChip({ node }: { node: LineageNode }) {
  const job = node.no ? jobByNo.get(node.no) : undefined;

  if (!job) {
    return (
      <span className="inline-flex h-12 items-center whitespace-nowrap rounded-xl border border-vja-line bg-vja-paper px-3 text-xs italic tracking-wider text-vja-ink-soft md:h-14">
        {node.label}
      </span>
    );
  }
  return (
    <ArtChip job={job} href={`/jobs/${job.no}`} ongoing={!!node.ongoing}>
      <T ja={node.label} en={job.en} />
      {node.ongoing ? " ▲" : ""}
    </ArtChip>
  );
}

export default function LineagePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <header className="text-center">
        <p className="font-mono-label text-[10px] tracking-[0.6em] text-vja-ink-soft">
          LINEAGE · {lineageChains.length} CHAINS
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-[0.15em] md:text-4xl">
          <T ja="仕事は、消えない。" en="Jobs never die." />
        </h1>
        <p className="mt-3 text-sm tracking-wider text-vja-accent">
          <T
            ja="名前を変えて、消えつづける。"
            en="They keep vanishing, under new names."
          />
        </p>
      </header>

      <p className="mt-8 hidden justify-between font-mono-label text-[10px] tracking-[0.3em] text-vja-ink-soft md:flex">
        <span>
          ← <T ja="ふるい" en="older" />
        </span>
        <span>
          <T ja="いま" en="now" /> →
        </span>
      </p>

      <div className="mt-4 divide-y divide-vja-line">
        {lineageChains.map((chain) => (
          <section key={chain.id} className="py-6">
            <h2 className="font-mono-label text-[11px] tracking-[0.4em] text-vja-accent">
              − {chain.num} <T ja={chain.title} en={chainTitleEn[chain.title]} />
            </h2>

            {/* PC: 横並び */}
            <div className="mt-2 hidden overflow-x-auto pb-2 pt-8 md:block">
              <div className="flex w-max items-center gap-2">
                {chain.nodes.map((n, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-vja-ink-soft">→</span>}
                    <NodeChip node={n} />
                  </span>
                ))}
              </div>
            </div>

            {/* 携帯: 縦並び（ふるい↑ → いま↓） */}
            <div className="mt-4 md:hidden">
              <div className="ml-3 mt-3 flex flex-col items-start gap-3 border-l border-vja-line pl-5 pt-2">
                {chain.nodes.map((n, i) => (
                  <span key={i} className="flex flex-col items-start gap-2.5">
                    {i > 0 && (
                      <span className="text-sm leading-none text-vja-ink-soft">↓</span>
                    )}
                    <NodeChip node={n} />
                  </span>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
