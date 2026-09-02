"use client";

import Link from "next/link";
import Image from "next/image";
import { Job } from "@/data/jobs";
import { saveReturn } from "@/lib/returnNav";

/**
 * イラストがチップから少しはみ出すスタイルのリンクチップ（背景丸なし）。
 * 年表・系譜・「おなじ時代に消えたなかま」で共通利用。
 * 画像は public/jobs/t/ の余白なしサムネイル版を使う。
 * 画像なしの職業は通常のテキストチップになる。
 */
export default function ArtChip({
  job,
  href,
  ongoing = false,
  size = "sm",
  children,
}: {
  job: Job;
  href: string;
  ongoing?: boolean;
  size?: "sm" | "lg";
  children: React.ReactNode;
}) {
  const sm = size === "sm";
  const withArt = !!job.image;
  const thumb = withArt ? `/jobs/t/${job.image!.split("/").pop()}` : null;

  const pad = withArt
    ? sm
      ? "pl-[3.6rem] md:pl-[5.4rem]"
      : "pl-[7.8rem]"
    : sm
      ? "pl-3"
      : "pl-5";

  return (
    <Link
      href={href}
      onClick={() => saveReturn()}
      className={`relative inline-flex max-w-full items-center rounded-xl tracking-wider transition-transform hover:-translate-y-0.5 ${
        sm
          ? // 携帯では列の幅(約175px)に対して名前が長すぎるものがあり、
            // 1行のまま伸ばすと列からも画面からもはみ出して端が切れる。
            // 折り返させて、高さのほうを伸ばす（丈は下限だけ決めておく）
            "min-h-11 whitespace-normal py-1 pr-2.5 text-[10px] md:h-14 md:whitespace-nowrap md:py-0 md:pr-4 md:text-xs"
          : "h-20 whitespace-nowrap pr-5 text-sm"
      } ${pad} ${ongoing ? "border border-dashed border-vja-blue text-vja-blue" : ""}`}
      style={ongoing ? undefined : { background: job.color, color: job.textColor }}
    >
      {thumb && (
        <Image
          src={thumb}
          alt=""
          width={280}
          height={280}
          className={`pointer-events-none absolute bottom-1 left-1 ${
            sm
              ? // 丈で決めると、折り返して背が伸びたチップだけ絵が大きくなる。
                // いまと同じ見え方（44px/56px の 122%）を実寸で固定する
                "h-[3.355rem] max-w-[3rem] md:h-[4.27rem] md:max-w-[4.7rem]"
              : "h-[133%] max-w-[6.6rem]"
          }`}
          style={{ objectFit: "contain", objectPosition: "left bottom", width: "auto" }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </Link>
  );
}
