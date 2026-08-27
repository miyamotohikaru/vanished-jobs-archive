import Link from "next/link";
import { notFound } from "next/navigation";
import JobCard from "@/components/JobCard";
import CardStage from "@/components/CardStage";
import ArtChip from "@/components/ArtChip";
import BackButton from "@/components/BackButton";
import { jobs, jobByNo, statusMeta, causeLabel } from "@/data/jobs";
import { details } from "@/data/details";
import { lineageChains } from "@/data/lineage";
import { dict, translateRegion } from "@/lib/dict";
import { T } from "@/lib/lang";
import { enDetails } from "@/data/en";

export function generateStaticParams() {
  return jobs.map((j) => ({ no: j.no }));
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 flex items-center gap-4 text-sm font-bold tracking-[0.4em]">
      {children}
      <span className="h-px flex-1 bg-vja-line" />
    </h2>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-vja-line bg-vja-paper px-4 py-1.5 text-xs tracking-wider">
      {children}
    </span>
  );
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no } = await params;
  const job = jobByNo.get(no);
  if (!job) notFound();

  const detail = details[no];
  const tr = enDetails[no];
  const meta = statusMeta[job.status];
  const idx = jobs.findIndex((j) => j.no === no);
  const prev = jobs[idx - 1];
  const next = jobs[idx + 1];
  const chain = job.lineageId
    ? lineageChains.find((c) => c.id === job.lineageId)
    : undefined;
  // おなじ時代のなかま: 章内でカードごとに顔ぶれをローテーションさせる
  const sameCat = jobs.filter((j) => j.category === job.category);
  const idxInCat = sameCat.findIndex((j) => j.no === no);
  const others = sameCat.filter((j) => j.no !== no);
  const related = others.length
    ? Array.from(
        { length: Math.min(3, others.length) },
        (_, i) => others[(idxInCat + i) % others.length]
      )
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      {/* 戻る */}
      <div className="flex flex-wrap items-center gap-4">
        <BackButton />
        <span className="font-mono-label text-[11px] tracking-[0.2em] text-vja-ink-soft">
          NO.{job.no} {job.name}
        </span>
      </div>

      <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,340px)_1fr] md:gap-14">
        {/* 左:カード */}
        <div>
          <div className="md:sticky md:top-20">
            <CardStage prevNo={prev?.no} nextNo={next?.no}>
              <JobCard job={job} />
            </CardStage>
            <div className="mt-6 flex items-center justify-center gap-3">
              {prev ? (
                <Link
                  href={`/jobs/${prev.no}`}
                  className="rounded-full border border-vja-line bg-vja-paper px-5 py-1.5 text-xs tracking-[0.2em] hover:border-vja-ink"
                >
                  ◀ NO.{prev.no}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/jobs/${next.no}`}
                  className="rounded-full bg-vja-ink px-5 py-1.5 text-xs tracking-[0.2em] text-vja-cream hover:opacity-85"
                >
                  NO.{next.no} ▶
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 右:記録 */}
        <article>
          <p className="font-mono-label text-[11px] tracking-[0.3em] text-vja-ink-soft">
            RECORD NO.{job.no} ·{" "}
            <T ja={job.category} en={dict.category[job.category]} />
          </p>
          <h1 className="mt-3 break-words text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl md:tracking-[0.15em]">
            <T ja={job.name} en={job.en} />
          </h1>
          <p className="font-mono-label mt-3 text-xs tracking-[0.2em] text-vja-ink-soft">
            {detail?.reading ? `${detail.reading} / ` : ""}
            <T ja={<span className="uppercase">{job.en}</span>} en={job.name} />
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-4 py-1.5 text-xs tracking-wider ${
                job.status === "extinct"
                  ? "border-vja-accent text-vja-accent"
                  : job.status === "ongoing"
                    ? "border-vja-blue text-vja-blue"
                    : "border-vja-ink-soft text-vja-ink"
              }`}
            >
              {meta.mark}
              <T ja={meta.label} en={dict.status[job.status]} />
            </span>
            {job.endLabel && <Chip>{job.endLabel}</Chip>}
            <Chip><T ja={job.region} en={translateRegion(job.region)} /></Chip>
            {job.causeAll.map((c) => (
              <Chip key={c}>
                <T ja={causeLabel(c)} en={dict.cause[c]} />
              </Chip>
            ))}
          </div>

          {/* 要約 */}
          <div className="mt-8 border-l-2 border-vja-accent pl-5">
            <p className="font-mono-label text-[10px] tracking-[0.4em] text-vja-ink-soft">
              <T ja="要約" en="SUMMARY" />
            </p>
            <p className="mt-2 leading-relaxed"><T ja={detail?.summary ?? job.summary} en={tr?.summary ?? detail?.summary ?? job.summary} /></p>
          </div>

          {detail ? (
            <>
              <SectionTitle>
                <T ja="しごとの中身" en="THE WORK" />
              </SectionTitle>
              {detail.body.map((p, i) => (
                <p key={i} className="mt-4 leading-loose">
                  <T ja={p} en={tr?.body?.[i] ?? p} />
                </p>
              ))}

              <p className="font-mono-label mt-8 text-[10px] tracking-[0.4em] text-vja-ink-soft">
                <T ja="道具" en="TOOLS" />
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.tools.map((t, i) => (
                  <Chip key={t}>
                    <T ja={t} en={tr?.tools?.[i] ?? t} />
                  </Chip>
                ))}
              </div>

              <SectionTitle>
                {job.status === "ongoing" ? (
                  <T ja="きえていくわけ(進行中)" en="WHY IT IS VANISHING" />
                ) : (
                  <T ja="きえたわけ" en="WHY IT VANISHED" />
                )}
              </SectionTitle>
              <ul className="mt-5 space-y-4">
                {detail.timeline.map((t, i) => (
                  <li key={i} className="flex items-baseline gap-4">
                    <span
                      className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                        i === detail.timeline.length - 1
                          ? "bg-vja-accent"
                          : "bg-vja-ink-soft"
                      }`}
                    />
                    <p className="leading-relaxed">
                      <span className="font-mono-label text-sm font-semibold tracking-wide">
                        <T ja={t.year} en={tr?.timeline?.[i]?.year ?? t.year} />
                      </span>
                      <span className="mx-2">—</span>
                      <T ja={t.text} en={tr?.timeline?.[i]?.text ?? t.text} />
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 leading-loose"><T ja={detail.timelineClose} en={tr?.timelineClose ?? detail.timelineClose} /></p>

              <div className="mt-10 rounded-lg bg-vja-paper p-6">
                <p className="font-mono-label text-[10px] tracking-[0.4em] text-vja-ink-soft">
                  <T ja="豆ちしき" en="TRIVIA" />
                </p>
                <p className="mt-3 leading-loose"><T ja={detail.trivia} en={tr?.trivia ?? detail.trivia} /></p>
              </div>
            </>
          ) : (
            <div className="mt-10 rounded-lg border border-dashed border-vja-blue p-6 text-center">
              <p className="text-sm tracking-wider text-vja-blue">
                <T
                  ja="この項目の記録は、まだ書きかけです。"
                  en="This record is still being written."
                />
              </p>
              <p className="mt-2 text-xs text-vja-ink-soft">
                <T ja="活動期" en="Active" />: {job.activeYears || "—"} /{" "}
                <T ja="消滅期" en="Vanished" />: {job.endYear || "—"}
              </p>
            </div>
          )}

          {/* この仕事の系譜 */}
          {(chain || job.successor) && (
            <>
              <p className="font-mono-label mt-10 text-[10px] tracking-[0.4em] text-vja-ink-soft">
                <T ja="この仕事の系譜" en="LINEAGE OF THIS WORK" />
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3">
                {chain ? (
                  chain.nodes.map((n, i) => (
                    <span key={i} className="flex items-center gap-2">
                      {i > 0 && <span className="text-vja-ink-soft">→</span>}
                      {n.no === job.no ? (
                        <span className="rounded bg-vja-ink px-3 py-1.5 text-xs tracking-wider text-vja-cream">
                          {n.label}
                        </span>
                      ) : n.no ? (
                        <Link
                          href={`/jobs/${n.no}`}
                          className={`rounded px-3 py-1.5 text-xs tracking-wider ${
                            n.ongoing
                              ? "border border-dashed border-vja-blue text-vja-blue"
                              : "border border-vja-line bg-vja-paper hover:border-vja-ink"
                          }`}
                        >
                          {n.label}
                          {n.ongoing ? " ▲" : ""}
                        </Link>
                      ) : (
                        <span className="rounded px-2 py-1.5 text-xs italic tracking-wider text-vja-ink-soft">
                          {n.label}
                        </span>
                      )}
                    </span>
                  ))
                ) : (
                  <p className="text-sm leading-relaxed text-vja-ink-soft">
                    <T
                      ja={`${job.name} → ${job.successor}`}
                      en={tr?.lineageText ?? `${job.name} → ${job.successor}`}
                    />
                  </p>
                )}
              </div>
            </>
          )}
        </article>
      </div>

      {/* おなじ時代に消えたなかま */}
      {related.length > 0 && (
        <section className="mt-16 border-t border-vja-line pt-8">
          <p className="font-mono-label text-[10px] tracking-[0.4em] text-vja-ink-soft">
            <T ja="おなじ時代に消えたなかま" en="VANISHED IN THE SAME ERA" />
          </p>
          <div className="mt-14 grid gap-x-4 gap-y-14 sm:grid-cols-3">
            {related.map((r) => (
              <ArtChip key={r.no} job={r} href={`/jobs/${r.no}`} size="lg">
                <span>
                  <span className="block text-sm font-bold tracking-wider">
                    <T ja={r.name} en={r.en} />
                  </span>
                  <span className="mt-1 block text-[11px] opacity-85">
                    {statusMeta[r.status].mark}
                    <T ja={statusMeta[r.status].label} en={dict.status[r.status]} />{" "}
                    {r.endLabel}
                  </span>
                </span>
              </ArtChip>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
