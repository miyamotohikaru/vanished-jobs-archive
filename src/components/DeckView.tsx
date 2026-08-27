"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JobCard from "@/components/JobCard";
import TiltCard from "@/components/TiltCard";
import { Job } from "@/data/jobs";
import { useLang } from "@/lib/lang";
import { readDeckAt, saveDeckAt, saveReturn } from "@/lib/returnNav";
import { primeTick, spinSound, tapSound, tick } from "@/lib/tick";

/**
 * デッキ表示。151枚を「束」として見せ、指で送る。
 *
 * 位置は整数ではなく小数(pos)で持つ。3.42 なら 3番と4番のあいだ、という状態を
 * そのまま持てるので、指の動きと束の見え方が最後まで地続きになる。
 * カードは pos との差(rel)だけで見え方が決まり、次のカードが「瞬間で入れ替わる」ことがない。
 *
 * めくり方(FLIPS)は、この rel → 見え方 の対応表を差し替えるだけで切り替わる。
 * 索引グリッドは残したまま表示方法だけを切り替える。カード面(JobCard)には一切触れない。
 */

const RATIO = 47 / 34; // カードの縦横比

const V_WINDOW = 70; // 速度をとる時間窓(ms)
const AXIS_LOCK = 5; // 横に動かす意思が見えたら掴む(px)
const TAP_SLOP = 10;
const TAP_MS = 400;
/** 離した瞬間の速さから、どれだけ滑らせるか(ms) */
const MOMENTUM_MS = 150;
/** 一度に送る上限(枚) */
const MAX_GLIDE = 40;
const SPRING_K = 210;
const SPRING_C = 24;

type Stop = {
  /** カード幅に対する横ずれ */
  x: number;
  /** カード高さに対する縦ずれ */
  y: number;
  /** 画面内での回転 */
  rot: number;
  /** 縦軸まわりの回転（ページをめくる動き・円弧上の回り込み） */
  rotY: number;
  /** 奥行き。カード幅に対する比。負ほど奥 */
  z: number;
  scale: number;
  blur: number;
  sat: number;
  opacity: number;
  /** 上から重ねる地色の濃さ。奥行きは「薄める」のではなく「地の色へ寄せる」で出す */
  veil: number;
  /** セピアへ寄せる量。カードごとの色相を暖色軸へ畳んで、束の中で色が浮かないようにする */
  tone: number;
};

const base: Stop = {
  x: 0,
  y: 0,
  rot: 0,
  rotY: 0,
  z: 0,
  scale: 1,
  blur: 0,
  sat: 0.55,
  opacity: 1,
  veil: 0,
  tone: 1,
};
const S = (o: Partial<Stop>): Stop => ({ ...base, ...o });
/** ピント面。ここだけは色も彩度も素のまま */
const FOCUS = S({ sat: 1, tone: 0 });

export type FlipId = "stack" | "rail" | "arc" | "toss" | "fan" | "turn";

type Flip = {
  id: FlipId;
  ja: string;
  en: string;
  /** rel ごとの見え方。あいだは補間する */
  stops: Record<number, Stop>;
  min: number;
  max: number;
  /** 手前側／奥側に何枚出すか */
  ahead: number;
  behind: number;
  /** 本物のカードを描くスロット */
  real: number[];
  /**
   * 触る端末で本物のカードを描くスロット。描画を軽くするため既定では減らすが、
   * 左右に並ぶ案では両隣を必ず本物にする（片側だけ中身のない板になってしまうため）
   */
  realTouch: number[];
  origin: string;
  /** 遠近の強さ。カード幅に対する比 */
  perspectiveW: number;
  /** カード1枚ぶん送るのに要る指の移動距離（カード幅に対する比） */
  travel: number;
  /** 束の上下に要る余白（カード幅に対する比） */
  pad: number;
  /** 携帯でのカード幅（画面幅に対する%）。省略時は72 */
  narrowVW?: number;
  /** PCでのカード幅（画面幅に対する%）。省略時は30 */
  wideVW?: number;
  /** 束の枚数に応じて並びを組み直す（円弧のように輪の大きさが枚数で決まるもの） */
  build?: (total: number, touch: boolean) => Partial<Flip>;
  /** 描くスロットを明示する（一周ぶんを、遠いところは間引いて並べる） */
  slots?: number[];
  /** その位置がカードの裏を向いているか */
  isBack?: (n: number) => boolean;
  /** 手前に外れた板を地の色より沈ませるか */
  nearDark: boolean;
};

/** 横送りで前後に並べる枚数 */
const RAIL_REACH = 5;

/**
 * 横送りの並びをつくる。
 *
 * 隠れているカードも中身が読めるように、全部を本物のカードで描く。
 * 重なりの幅（＝1枚が覗く量）は画面の広さで変える。狭い画面で広く取ると
 * 2〜3枚しか入らないので、そのぶん詰めて枚数を確保する。
 */
function buildRail(total: number, touch: boolean) {
  const gap = touch ? 0.28 : 0.4; // カード幅に対する、1枚ぶんのずれ
  const stops: Record<number, Stop> = { 0: FOCUS };
  for (let n = -RAIL_REACH - 1; n <= RAIL_REACH + 1; n++) {
    if (n === 0) continue;
    const a = Math.abs(n);
    stops[n] = S({
      x: gap * n,
      scale: 1 - 0.028 * a,
      blur: 0, // 中身を読ませたいのでぼかさない
      veil: Math.min(0.1 + 0.1 * (a - 1), 0.5),
      // 近いカードは色を残し、遠いほど暖色へ畳んで束の中で浮かないようにする
      tone: Math.min(0.3 + 0.15 * (a - 1), 0.9),
      sat: 0.75,
      opacity: a > RAIL_REACH ? 0 : 1,
    });
  }
  const real = [0];
  for (let n = 1; n <= RAIL_REACH; n++) real.push(n, -n);
  return {
    stops,
    min: -(RAIL_REACH + 1),
    max: RAIL_REACH + 1,
    ahead: RAIL_REACH,
    behind: RAIL_REACH,
    real,
    realTouch: real,
    // ずれた幅ぶん指を動かせば1枚進む（列が指についてくる）
    travel: gap,
  };
}

/** 円筒の半径（カード幅に対する比） */
const ARC_R = 1.6;
/** 円弧の遠近の強さ（カード幅に対する比） */
const ARC_PERSP = 3.2;
/** 前後それぞれ何枚まで描くか。これより外は互いに隠れて見えなくなる */
const ARC_REACH = 24;
/**
 * 奥へ行くほど持ち上げる量（カード幅に対する比）。
 * 輪を丸ごと倒すとカードまで傾いて読めなくなるので、カードは立てたまま
 * 位置だけを楕円にする。これで向こう側が前面カードの上へ回り込む。
 */
const ARC_LIFT = 0.95;

/**
 * 円弧の並びを、束の全枚数ぶんの輪としてつくる。
 *
 * 151枚をそのまま円に並べると1枚あたり約2.4度しかないので、カードは
 * 9割がた重なり、縁だけが少しずつずれて覗く。その縁の連なりが束の厚みになる。
 * 輪の向こう側は手前のカードに完全に隠れるため、描くのは手前側だけでよい。
 */
function arcStops(faces: number, reach: number): Record<number, Stop> {
  const out: Record<number, Stop> = { 0: FOCUS };
  const step = 360 / Math.max(faces, 3);
  for (let n = -reach; n <= reach; n++) {
    if (n === 0) continue;
    const deg = step * n;
    const th = (deg * Math.PI) / 180;
    const a = Math.abs(n);
    const back = Math.abs(deg) > 90;
    out[n] = S({
      x: ARC_R * Math.sin(th),
      // y はカード高さに対する比なので、幅の比から直しておく
      y: (-ARC_LIFT * (1 - Math.cos(th))) / 2 / RATIO,
      z: ARC_R * (Math.cos(th) - 1),
      rotY: deg, // 円筒の接線に沿わせる
      // 膜が濃いと縁の色がそろってしまい、束ではなく一枚の面に見える。
      // 向こう側は暗い背面なので、薄めずそのまま沈ませる
      veil: back ? 0.42 : Math.min(0.1 + 0.026 * (a - 1), 0.78),
      blur: a <= 2 ? 1.5 : 0,
      opacity: 1,
    });
  }
  return out;
}

/**
 * 円弧は束の枚数だけ輪に並ぶので、並びは枚数が決まってから組む。
 *
 * 輪を手前に倒すと向こう側が上に覗く。ただし一周ぶんを全部描くと重いので、
 * 手前は1枚ずつ、遠いところは間引いて並べる。
 * 遠い位置のカードはほぼ真横〜裏向きで、隣どうしが何重にも重なるため、
 * 間引いても隙間にはならない。
 */
function buildArc(total: number, touch: boolean) {
  const faces = Math.max(total, 3);
  const half = Math.floor(faces / 2);
  // 触る端末では枚数を抑える。輪の形は保てる範囲で粗くする
  const reach = Math.min(touch ? 16 : ARC_REACH, Math.max(half, 1));
  const far = touch ? 4 : 2;
  const slots: number[] = [];
  for (let n = -half; n <= half; n++) {
    const a = Math.abs(n);
    // 遠いところは間引くが、粗すぎると輪の上辺がギザギザになる
    if (a <= reach || a % far === 0) slots.push(n);
  }
  const step = 360 / faces;
  return {
    stops: arcStops(faces, half + 1),
    min: -(half + 1),
    max: half + 1,
    ahead: half,
    behind: half,
    slots,
    isBack: (n: number) => Math.abs(step * n) > 90,
    // 1枚送るあいだに輪が動く距離。ここを合わせないと指と輪がずれる
    travel: ARC_R * ((2 * Math.PI) / faces),
  };
}

export const FLIPS: Flip[] = [
  {
    // 奥へ重なっていく束。手前に一枚外れることで被写界深度になる
    id: "stack",
    ja: "重ね",
    en: "STACK",
    min: -2,
    max: 5,
    ahead: 1,
    behind: 4,
    real: [0, 1, 2],
    realTouch: [0, 1],
    origin: "50% 92%",
    perspectiveW: 3.4,
    travel: 0.34,
    pad: 0.14,
    nearDark: true,
    stops: {
      [-2]: S({ x: -0.66, y: 0.26, rot: -15, scale: 1.09, blur: 16, opacity: 0, veil: 0.6 }),
      [-1]: S({ x: -0.34, y: 0.13, rot: -8.5, scale: 1.045, blur: 11, veil: 0.6 }),
      [0]: FOCUS,
      [1]: S({ x: 0.095, y: -0.042, rot: 3.2, scale: 0.962, blur: 2, opacity: 0.78, veil: 0.5 }),
      [2]: S({ x: -0.135, y: -0.078, rot: -5.2, scale: 0.922, blur: 4.5, opacity: 0.62, veil: 0.62 }),
      [3]: S({ x: 0.195, y: -0.112, rot: 8, scale: 0.878, blur: 7, opacity: 0.48, veil: 0.72 }),
      [4]: S({ x: -0.255, y: -0.145, rot: -10.5, scale: 0.83, blur: 9, opacity: 0.36, veil: 0.82 }),
      [5]: S({ x: 0.3, y: -0.175, rot: 13, scale: 0.79, blur: 11, opacity: 0, veil: 0.86 }),
    },
  },
  {
    // 平らな一列。前後のカードが両脇に重なって並び、どれも中身が読める
    id: "rail",
    ja: "横送り",
    en: "RAIL",
    min: -1,
    max: 1,
    ahead: 1,
    behind: 1,
    real: [0],
    realTouch: [0],
    origin: "50% 50%",
    perspectiveW: 3.2,
    travel: 0.4,
    pad: 0.1,
    // 横に何枚も並べるので、カードは一回り小さくして場所をつくる
    wideVW: 24,
    narrowVW: 56,
    nearDark: false,
    stops: {},
    build: buildRail,
  },
  {
    // 束の全枚数を円に並べる。1枚ずつずれた縁の連なりが、そのまま束の厚みになる
    id: "arc",
    ja: "円弧",
    en: "ARC",
    min: -2,
    max: 2,
    ahead: 1,
    behind: 1,
    real: [0, 1, -1],
    realTouch: [0, 1, -1],
    origin: "50% 50%",
    perspectiveW: ARC_PERSP,
    travel: 0.07,
    // 向こう側が上へ回り込むので、その分の余白が要る
    pad: 0.36,
    // 輪は横に場所が要るので、携帯ではカードを一回り小さくして広がる余地をつくる
    narrowVW: 52,
    nearDark: false,
    stops: {},
    build: buildArc,
  },
  {
    // 手札から一枚ずつ放る。抜けていくカードは色を保ったまま大きく回る
    id: "toss",
    ja: "投げ",
    en: "TOSS",
    min: -2,
    max: 4,
    ahead: 1,
    behind: 3,
    real: [0, 1],
    realTouch: [0, 1],
    origin: "50% 50%",
    perspectiveW: 2.7,
    travel: 0.34,
    pad: 0.12,
    nearDark: false,
    stops: {
      // 放ったカードは画面の外へ消える。止まっているあいだ横に幽霊を残さない
      [-2]: S({ x: -2.1, y: 0.3, rot: -40, opacity: 0, tone: 0, sat: 1 }),
      [-1]: S({ x: -1.15, y: 0.12, rot: -20, opacity: 0, tone: 0, sat: 1 }),
      [0]: FOCUS,
      // 縮小ぶんに埋もれないよう、上端がきちんと覗く量だけ持ち上げる
      [1]: S({ y: -0.052, scale: 0.955, veil: 0.18, sat: 0.7 }),
      [2]: S({ y: -0.09, scale: 0.915, veil: 0.32, sat: 0.6 }),
      [3]: S({ y: -0.122, scale: 0.88, veil: 0.44 }),
      [4]: S({ y: -0.148, scale: 0.85, opacity: 0, veil: 0.54 }),
    },
  },
  {
    // 遠い支点を中心に開く扇。紙の束を手で広げたときの並び
    id: "fan",
    ja: "扇",
    en: "FAN",
    min: -2,
    max: 5,
    ahead: 2,
    behind: 4,
    // 扇は左右どちらにも開くので、手前側にも本物のカードを1枚置く
    real: [0, 1, -1, 2],
    realTouch: [0, 1, -1],
    origin: "50% 260%",
    perspectiveW: 3.6,
    travel: 0.34,
    pad: 0.22,
    nearDark: false,
    stops: {
      [-2]: S({ rot: -16, y: 0.04, scale: 1.02, blur: 6, opacity: 0, veil: 0.56 }),
      [-1]: S({ rot: -8, y: 0.015, scale: 1.01, blur: 2, opacity: 0.8, veil: 0.42 }),
      [0]: FOCUS,
      [1]: S({ rot: 8, y: 0.015, scale: 0.99, blur: 1.5, opacity: 0.8, veil: 0.42 }),
      [2]: S({ rot: 16, y: 0.04, scale: 0.975, blur: 3.5, opacity: 0.66, veil: 0.56 }),
      [3]: S({ rot: 24, y: 0.075, scale: 0.955, blur: 6, opacity: 0.5, veil: 0.68 }),
      [4]: S({ rot: 32, y: 0.12, scale: 0.93, blur: 8, opacity: 0.34, veil: 0.78 }),
      [5]: S({ rot: 40, y: 0.17, scale: 0.9, blur: 10, opacity: 0, veil: 0.84 }),
    },
  },
  {
    // 本のページのように左端を軸にして裏返る
    id: "turn",
    ja: "ページ",
    en: "TURN",
    min: -2,
    max: 4,
    ahead: 1,
    behind: 3,
    real: [0, 1],
    realTouch: [0, 1],
    origin: "0% 50%",
    perspectiveW: 2.5,
    travel: 0.4,
    pad: 0.12,
    nearDark: false,
    stops: {
      [-2]: S({ rotY: -150, x: 0.1, opacity: 0, tone: 0, sat: 1 }),
      [-1]: S({ rotY: -100, x: 0.04, opacity: 0.35, tone: 0, sat: 1 }),
      [0]: FOCUS,
      [1]: S({ y: -0.012, scale: 0.985, veil: 0.12, sat: 0.7 }),
      [2]: S({ y: -0.024, scale: 0.97, veil: 0.24 }),
      [3]: S({ y: -0.034, scale: 0.956, veil: 0.36 }),
      [4]: S({ y: -0.042, scale: 0.944, opacity: 0, veil: 0.46 }),
    },
  },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 束のまわりの色は「奥行き」だけで決める。
 * カードの色相をそのまま出すと、たまたま次に並んでいる4枚が緑・紫・オリーブ・水色
 * だったときに束のまわりが苔色になる——つまりページの空気が
 * データの並び順で決まってしまう。明るさだけをもらい、色相は紙の側に固定する。
 */
function plateColor(hex: string, depth = 1) {
  const n = parseInt(hex.slice(1), 16);
  const lum =
    (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  const t = Math.min(Math.min(Math.max(1 - lum, 0.22), 0.55) * depth, 1);
  return `color-mix(in oklab, #cfc6ae ${Math.round(t * 100)}%, var(--vja-paper))`;
}

function sample(flip: Flip, rel: number): Stop {
  const r = Math.min(Math.max(rel, flip.min), flip.max);
  const lo = Math.floor(r);
  const hi = Math.min(lo + 1, flip.max);
  const t = r - lo;
  const a = flip.stops[lo] ?? FOCUS;
  const b = flip.stops[hi] ?? a;
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    rot: lerp(a.rot, b.rot, t),
    rotY: lerp(a.rotY, b.rotY, t),
    z: lerp(a.z, b.z, t),
    scale: lerp(a.scale, b.scale, t),
    blur: lerp(a.blur, b.blur, t),
    sat: lerp(a.sat, b.sat, t),
    opacity: lerp(a.opacity, b.opacity, t),
    veil: lerp(a.veil, b.veil, t),
    tone: lerp(a.tone, b.tone, t),
  };
}

/** 何枚めか。束は輪になっているので、はみ出したぶんは折り返す */
const wrap = (n: number, total: number) => ((n % total) + total) % total;

export default function DeckView({
  jobs,
  // めくり方は横送りひとつに決めた（選ばせるのはやめた）。
  // 他の作りも FLIPS に残してあるので、変えたくなったらここを差し替える
  flip: flipId = "rail",
  canMeasure = true,
}: {
  jobs: Job[];
  flip?: FlipId;
  /**
   * いま束の大きさを測ってよいか。
   * 絞り込みの引き出しが開いているあいだは束が下へ押し下げられるので、
   * そのときに測ると「引き出しのぶん狭い画面」を測ってしまう。
   * 閉じるまで測らず、閉じた瞬間に測り直す。
   */
  canMeasure?: boolean;
}) {
  const router = useRouter();
  const { lang } = useLang();
  const en = lang === "en";
  const total = jobs.length;

  /** 指で操作している端末か。触る端末では傾き効果を止め、実カードの枚数も減らす */
  const [touch, setTouch] = useState(false);

  const flip = useMemo(() => {
    const base = FLIPS.find((f) => f.id === flipId) ?? FLIPS[0];
    return base.build ? { ...base, ...base.build(total, touch) } : base;
  }, [flipId, total, touch]);

  /** 描画に使う整数の基準。pos の四捨五入 */
  const [anchor, setAnchor] = useState(0);
  const [dragging, setDragging] = useState(false);

  const posRef = useRef(0);
  const anchorRef = useRef(0);
  const velRef = useRef(0); // px/s（バネ用）
  const targetRef = useRef(0);
  const rafRef = useRef(0);
  const springRef = useRef(0);
  const samples = useRef<{ x: number; t: number }[]>([]);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  /** ドラッグを始めたときの位置。追従中に基準が動くと位置が暴走するので固定して持つ */
  const baseRef = useRef(0);
  const engaged = useRef(false);
  /** ドラッグ直後のクリックで遷移しないようにする */
  const suppress = useRef(false);
  const reducedRef = useRef(false);
  const widthRef = useRef(300);
  /** カード1枚ぶんの指の移動距離(px)。画面の大きさに比例させる */
  const travelRef = useRef(96);
  const flipRef = useRef(flip);
  flipRef.current = flip;
  const totalRef = useRef(total);
  totalRef.current = total;

  const stage = useRef<HTMLDivElement>(null);
  const nodes = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const shadow = useRef<HTMLDivElement>(null);

  // 送りの「カチッ」は最初から鳴らす（切り替えは置かない）。
  // 音そのものは tick.ts の既定で鳴る側に倒してある。
  // ただし WebAudio は操作の中でしか用意できないので、
  // 最初に触ったとき（onPointerDown の primeTick）に組み立てる。

  useEffect(() => {
    setTouch(matchMedia("(hover: none)").matches);
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => (reducedRef.current = m.matches);
    set();
    m.addEventListener("change", set);
    return () => m.removeEventListener("change", set);
  }, []);

  /**
   * 開いたときにカードが1枚まるごと見えるようにする。
   *
   * カードの大きさは globals.css が画面の高さから決めているが、CSS には
   * 「束の上に何が何px 積まれているか」が分からない。ヒーローの高さは
   * 言語でも画面幅でも変わるので、決め打ちの引き算では必ずどこかで外れる。
   * （実測: 1440x900 で束の上端が561px、下の操作系が121px。
   *   引き算を 190px 固定にしていたので、カードが289pxはみ出していた）
   *
   * なので、束の上端と下の操作系の高さを実際に測って、
   * 「使える高さ」を --deck-avail としてCSSに渡す。
   * カードの幅を変えても上端と操作系の高さは動かないので、1回測れば足りる。
   */
  const canMeasureRef = useRef(canMeasure);
  canMeasureRef.current = canMeasure;
  /** 測り直しを外から呼べるように持っておく */
  const fitRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let lastAvail = 0;
    const fit = () => {
      if (!canMeasureRef.current) return;
      const box = el.getBoundingClientRect();
      // ページの上端から束の上端まで（巻き上げていても同じ値になるように scrollY を足す）
      const top = box.top + window.scrollY;
      const wrap = el.parentElement;
      const ctrl = wrap ? wrap.getBoundingClientRect().bottom - box.bottom : 0;
      // 携帯は下端にタブバーが浮いていて、そのぶん画面は使えない。
      // 高さを決め打ちにすると畳んだときにずれるので、あるものを測る
      const bar = document.querySelector("nav.fixed.bottom-0");
      const barH = bar ? bar.getBoundingClientRect().height : 0;
      // 8px は下のふちに貼り付かせないための余白
      const avail = Math.max(
        200,
        Math.round(window.innerHeight - top - ctrl - barH - 8)
      );
      if (avail === lastAvail) return;
      lastAvail = avail;
      el.style.setProperty("--deck-avail", `${avail}px`);
      // 幅が変わったのだから、並べる間隔も測り直す。
      // ここを忘れると、小さくなったカードを大きいままの間隔で並べてしまい、
      // 重なっていた列に隙間が空く（絞り込みの引き出しを開けたまま絞ったときに出た）
      measureRef.current();
    };
    fitRef.current = fit;
    fit();
    // ヒーローの畳み方や書体の読み込みで上端が動くので、落ち着いてからもう一度測る
    const t = setTimeout(fit, 250);
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    // 絞り込みの引き出しが開け閉めされると、束の上端そのものが動く。
    // 版面の高さの変化を見て測り直す。
    // 束自身の大きさは avail の計算に入っていない（上端も操作系の高さも束の外）ので、
    // 観測が自分を呼び戻して振動することはない。同じ値なら上で打ち切ってもいる
    const ro = new ResizeObserver(() => fit());
    ro.observe(document.body);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fit);
      ro.disconnect();
    };
  }, []);

  /**
   * 束の見え方をすべて posRef から描く。React を通さず直接 style を書く。
   * withFilter=false のときは ぼかし/セピア を触らない。
   * ぼかしは値が変わるたびに描き直しが起きるので、指で追従している最中は固定する。
   */
  const paint = useCallback((withFilter = true) => {
    const f = flipRef.current;
    const pos = posRef.current;
    const a = anchorRef.current;
    const w = widthRef.current;
    const h = w * RATIO;

    nodes.current.forEach((el, k) => {
      if (!el) return;
      const rel = a + k - pos;
      const s = sample(f, rel);
      // 位置はピント面からの距離だけで決める。指を動かした向きで左右を入れ替えると、
      // 逆向きに引いた瞬間に「前のカード」が反対側へ飛び、送り方が左右で変わってしまう
      const depth = s.z * w;
      el.style.transform =
        `translate3d(${(s.x * w).toFixed(2)}px, ${(s.y * h).toFixed(2)}px, ${depth.toFixed(1)}px) ` +
        `rotateX(${(Math.min(Math.abs(rel), 3) * -1.6).toFixed(2)}deg) ` +
        `rotateY(${s.rotY.toFixed(2)}deg) ` +
        `rotate(${s.rot.toFixed(2)}deg) scale(${s.scale.toFixed(4)})`;
      el.style.opacity = s.opacity.toFixed(3);
      el.style.setProperty("--veil", s.veil.toFixed(3));
      // 手前ほど上に。同じ距離なら手前側(rel<0)を上に置く
      el.style.zIndex = String(
        Math.round(100 - Math.abs(rel) * 3) * 2 + (rel < 0 ? 1 : 0)
      );
      // どのカードも指で拾えるようにしておく。
      // 前面以外を none にすると、左右のカードを押しても当たりが束の地に抜けてしまい、
      // 「押したカードまで送る」が効かない
      el.style.pointerEvents = "auto";

      if (!withFilter) return;
      // ぼかしとセピアはカードの絵柄だけに掛ける。
      // 地の色をかぶせる膜(::after)まで一緒にセピアにすると、束全体が黄色く濁る。
      // sepia は「どんな色相でも必ず R>G>B の暖色軸に畳む」唯一の操作で、
      // saturate では色相のずれの符号が残るため緑のカードは緑のまま浮いてしまう。
      const face = el.firstElementChild as HTMLElement | null;
      if (face) {
        face.style.filter =
          s.blur < 0.05 && s.tone < 0.01
            ? "none"
            : `blur(${s.blur.toFixed(2)}px) sepia(${s.tone.toFixed(3)}) saturate(${s.sat.toFixed(2)})`;
      }
    });

    // 影も束の動きに連れて動く
    const sh = shadow.current;
    if (sh) {
      const off = (pos - Math.round(pos)) * w * 0.16;
      const p = Math.min(Math.abs(pos - Math.round(pos)) * 2, 1);
      sh.style.transform = `translate(-50%, calc(var(--deck-w) * 0.691 - 6px)) translateX(${off.toFixed(1)}px) scale(${(1 - p * 0.1).toFixed(3)})`;
      sh.style.opacity = (1 - p * 0.3).toFixed(3);
    }
  }, []);

  /**
   * 索引に戻ってきたとき、最後に開いたカードから始める。
   * 描く前に位置を決めたいので layout の段階で行う（1コマだけ1番が見えるのを防ぐ）。
   */
  useLayoutEffect(() => {
    const no = readDeckAt();
    if (!no) return;
    const i = jobs.findIndex((j) => j.no === no);
    if (i <= 0) return;
    posRef.current = i;
    targetRef.current = i;
    anchorRef.current = i;
    setAnchor(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 引き出しが閉じて束が元の位置に戻ったところで測り直す
  useEffect(() => {
    if (canMeasure) fitRef.current();
  }, [canMeasure]);

  /**
   * 幅の測り直し。--deck-avail を書き換えたあとにも呼ぶ必要があるので、
   * 効果の外から触れるように持っておく
   */
  const measureRef = useRef<() => void>(() => {});

  /** 幅を測っておく（毎フレーム測らない）。送りに要る距離も画面の大きさに比例させる */
  useLayoutEffect(() => {
    const measure = () => {
      const el = nodes.current.get(0);
      if (el) widthRef.current = el.clientWidth || 300;
      travelRef.current = Math.min(
        Math.max(widthRef.current * flipRef.current.travel, 18),
        150
      );
      paint();
    };
    measureRef.current = measure;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [paint, flip]);

  // 描画のたび（anchor やめくり方が変わったときなど）に位置を描き直す
  useLayoutEffect(() => {
    anchorRef.current = anchor;
    paint();
  });

  const syncAnchor = useCallback(() => {
    const a = Math.round(posRef.current);
    if (a !== anchorRef.current) {
      anchorRef.current = a;
      // 1枚ぶん送られた合図。速い送りでは音の側で自動的に間引かれる
      tick();
      setAnchor(a);
    }
  }, []);

  /**
   * 止まったところで、位置を一周ぶんの範囲へ畳む。
   * 何周も回すと数字が際限なく大きくなるため。
   * 位置と基準を同じだけずらすので、見た目は変わらない。
   */
  const normalize = useCallback(() => {
    const t = totalRef.current;
    if (t < 1) return;
    const a = Math.round(posRef.current);
    const shift = a - wrap(a, t);
    if (shift === 0) return;
    posRef.current -= shift;
    targetRef.current -= shift;
    baseRef.current -= shift;
    anchorRef.current -= shift;
    setAnchor(anchorRef.current);
  }, []);

  /** バネで target まで運ぶ。離した瞬間の勢いをそのまま引き継ぐ */
  const spring = useCallback(
    (seedPxPerMs: number) => {
      const travel = travelRef.current;
      velRef.current = seedPxPerMs * 1000;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        const px = posRef.current * travel;
        const tx = targetRef.current * travel;
        const acc = -SPRING_K * (px - tx) - SPRING_C * velRef.current;
        velRef.current += acc * dt;
        posRef.current = (px + velRef.current * dt) / travel;
        paint();
        syncAnchor();
        if (
          Math.abs(posRef.current - targetRef.current) < 0.002 &&
          Math.abs(velRef.current) < 0.6
        ) {
          posRef.current = targetRef.current;
          velRef.current = 0;
          paint();
          syncAnchor();
          normalize();
          springRef.current = 0;
          return;
        }
        springRef.current = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(springRef.current);
      springRef.current = requestAnimationFrame(tick);
    },
    [paint, syncAnchor, normalize]
  );

  /** 遠くへ送るときの動き。最初は速く、最後にすっと止まる */
  const glideTo = useCallback(
    (target: number) => {
      const from = posRef.current;
      const d = Math.abs(target - from);
      const dur = Math.min(300 + 55 * d, 950);
      // 何枚も送るときだけ、下に回転音を敷く。
      // 1〜2枚で鳴らすと、ただ隣へ動かしただけで大袈裟になる
      if (d >= 3) spinSound(d, dur);
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        posRef.current = from + (target - from) * e;
        paint();
        syncAnchor();
        if (t < 1) {
          springRef.current = requestAnimationFrame(tick);
          return;
        }
        posRef.current = target;
        velRef.current = 0;
        paint();
        syncAnchor();
        normalize();
        springRef.current = 0;
      };
      cancelAnimationFrame(springRef.current);
      springRef.current = requestAnimationFrame(tick);
    },
    [paint, syncAnchor, normalize]
  );

  const goTo = useCallback(
    (n: number, seed = 0) => {
      const t = n;
      targetRef.current = t;
      if (reducedRef.current) {
        posRef.current = t;
        velRef.current = 0;
        paint();
        syncAnchor();
        return;
      }
      // 隣へ動くだけならバネ（手応えのある戻り）。
      // 遠くへ送るときはバネだと一瞬で飛んでしまうので、束が回る時間をつくる
      if (Math.abs(t - posRef.current) > 1.5) glideTo(t);
      else spring(seed);
    },
    [total, spring, glideTo, paint, syncAnchor]
  );

  const step = useCallback(
    (dir: 1 | -1) => goTo(Math.round(posRef.current) + dir),
    [goTo]
  );

  /**
   * カードの外（束の地）を押したときの向き。
   * 前面カードの右を押したら右、左を押したら左。中にいるときは動かさない。
   */
  const sideOfCenter = useCallback((clientX: number) => {
    const el = nodes.current.get(0);
    if (!el) return 0;
    const b = el.getBoundingClientRect();
    if (clientX > b.right) return 1;
    if (clientX < b.left) return -1;
    return 0;
  }, []);

  /** 直近だけを見た瞬間の速度。ゆっくり引いてから弾く操作も拾える */
  const releaseV = useCallback(() => {
    const s = samples.current;
    const now = performance.now();
    if (s.length < 2) return 0;
    let old = s[0];
    for (const p of s) {
      if (now - p.t <= V_WINDOW) {
        old = p;
        break;
      }
    }
    const dt = now - old.t;
    return dt > 4 ? (s[s.length - 1].x - old.x) / dt : 0;
  }, []);

  /** 指を離した／取り上げられたときの後始末。行き先を決めてバネに渡す */
  /**
   * 指を離したあとの行き先を決める。
   * 離した瞬間の速さぶんだけ滑らせてから、いちばん近いカードで止まる。
   * ここを ±1 に丸めてしまうと、どれだけ勢いよく払っても1枚しか進まない。
   */
  const settle = useCallback(() => {
    const vx = releaseV(); // px/ms（指の動き。右へ動かすと正）
    const travel = travelRef.current;
    // 速さ(px/ms)を「枚/ms」に直し、滑る時間ぶんだけ先へ送る
    const glide = Math.min(
      Math.max((-vx / travel) * MOMENTUM_MS, -MAX_GLIDE),
      MAX_GLIDE
    );
    let target = Math.round(posRef.current + glide);
    // ほとんど動かしていない指離しでは、いまのカードに留まる
    const base = Math.round(baseRef.current);
    if (Math.abs(posRef.current - base) < 0.06 && Math.abs(glide) < 0.5) target = base;
    goTo(target, -vx);
  }, [releaseV, goTo]);

  // キーボード。入力欄や他の場所にいるときは奪わない
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const a = document.activeElement;
      if (a instanceof HTMLElement) {
        if (a.isContentEditable) return;
        const t = a.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
        if (!stage.current?.contains(a) && !a.closest(".vja-deck-nav")) return;
      }
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // ホイール／トラックパッド。1回のはらいで1枚だけ送る
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let acc = 0;
    let lastT = 0;
    let cooldown = 0;
    let axis: "x" | "y" | null = null;
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      const u = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dx = e.deltaX * u;
      const dy = e.deltaY * u;
      if (now - lastT > 180) {
        acc = 0;
        axis = null;
      }
      lastT = now;
      if (!axis) axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
      if (axis === "y") return; // 縦は素直にページを送らせる
      e.preventDefault();
      if (now < cooldown) return; // 慣性スクロールの尾を捨てる
      acc += dx;
      if (Math.abs(acc) > 90) {
        stepRef.current(acc > 0 ? 1 : -1);
        acc = 0;
        cooldown = now + 320;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // 前後は先読み。長く送っているあいだは通り過ぎるだけなので、止まってから読む
  useEffect(() => {
    const id = setTimeout(() => {
      for (const n of [anchor + 1, anchor - 1]) {
        router.prefetch(`/jobs/${jobs[wrap(n, total)].no}`);
      }
    }, 260);
    return () => clearTimeout(id);
  }, [anchor, jobs, total, router]);

  // タブを離れると requestAnimationFrame が止まるので、中途半端な位置で
  // 固まらないよう、隠れた時点で目的の位置へ寄せておく
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      cancelAnimationFrame(springRef.current);
      springRef.current = 0;
      posRef.current = targetRef.current;
      velRef.current = 0;
      paint();
      syncAnchor();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [paint, syncAnchor]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(springRef.current);
    },
    []
  );

  const at = wrap(anchor, total);
  const current = jobs[at];
  const progress = (at / Math.max(total - 1, 1)) * 100;

  /** 束に出す枚数ぶんのスロット。key は位置なので中身が変わっても DOM は作り直さない */
  const slots: number[] = flip.slots ?? [];
  if (!flip.slots) for (let k = -flip.ahead; k <= flip.behind; k++) slots.push(k);
  // 触る端末では本物のカードを2枚までにして、ぼかしと画像の負担を減らす
  const realSlots = new Set(touch ? flip.realTouch : flip.real);

  return (
    <div className="select-none">
      <div
        ref={stage}
        className="vja-deck relative mx-auto flex items-center justify-center"
        data-flip={flip.id}
        style={{
          ["--deck-origin" as string]: flip.origin,
          ["--deck-persp" as string]: `calc(var(--deck-w) * ${flip.perspectiveW})`,
          // 画面の高さからカード幅を決めるときは、めくり方ごとの余白ぶんも見込む
          ["--deck-fit" as string]: (1.382 + flip.pad).toFixed(3),
          ["--deck-vw" as string]: `${flip.narrowVW ?? 72}`,
          ["--deck-vw-wide" as string]: `${flip.wideVW ?? 30}`,
        }}
        onPointerDown={(e) => {
          primeTick();
          // ドラッグ後はクリックが発生しないことがあり、抑止したままだと
          // 次の1タップが効かなくなる。触り始めに必ず解除しておく
          suppress.current = false;
          if (reducedRef.current) return;
          cancelAnimationFrame(springRef.current);
          springRef.current = 0;
          startRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
          samples.current = [{ x: e.clientX, t: performance.now() }];
          baseRef.current = posRef.current;
          engaged.current = false;
        }}
        onPointerMove={(e) => {
          const s = startRef.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (!engaged.current) {
            // 横に動かす意思が出たら掴む。縦に流れているうちは触らず、
            // ページのスクロールをそのまま通す
            if (Math.abs(dx) < AXIS_LOCK || Math.abs(dx) < Math.abs(dy) * 0.9) return;
            engaged.current = true;
            setDragging(true);
            try {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
              /* 捕まえられなくても追従自体は続けられる */
            }
          }
          samples.current.push({ x: e.clientX, t: performance.now() });
          if (samples.current.length > 6) samples.current.shift();

          // 束は輪なので端がない。指の動きをそのまま位置にする
          posRef.current = baseRef.current - dx / travelRef.current;

          if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(() => {
              rafRef.current = 0;
              // 追従中はぼかしを触らない（値が変わるたび描き直しが起きて重くなる）
              paint(false);
              syncAnchor();
            });
          }
        }}
        onPointerUp={(e) => {
          const s = startRef.current;
          startRef.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          const dt = performance.now() - s.t;

          if (!engaged.current) {
            // 指が動いていなければタップ。遷移そのものは前面カードのリンクに任せる
            const still = Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP;
            suppress.current = !(still && dt < TAP_MS);
            // 前面より右のカードを触れば右へ、左のカードを触れば左へ送る。
            // 触ったカードそのものを前に出すので、2枚先を触れば2枚進む。
            // 長押し気味でも送りたいので、こちらは時間を見ない
            if (still) {
              const hit = (e.target as HTMLElement | null)?.closest?.(
                ".vja-deck-card"
              ) as HTMLElement | null;
              // カードの外（束の地）を押したときは、前面の左右どちら側かで決める
              const k = hit
                ? Number(hit.dataset.slot ?? 0)
                : sideOfCenter(e.clientX);
              // 音は送られたときに syncAnchor が鳴らすので、ここでは鳴らさない
              if (k) goTo(Math.round(posRef.current) + k);
            }
            return;
          }
          suppress.current = true;
          engaged.current = false;
          setDragging(false);
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            /* すでに離れている場合は何もしなくてよい */
          }
          settle();
        }}
        onPointerCancel={() => {
          startRef.current = null;
          if (!engaged.current) return;
          engaged.current = false;
          setDragging(false);
          // 取り上げられた場合も、いちばん近いカードへ寄せる（元に戻すと操作が消える）
          settle();
        }}
      >
        <div ref={shadow} className="vja-deck-shadow" aria-hidden />

        {slots.map((k) => {
          const n = anchor + k;
          // 飾りの位置は端でも束が絶えないよう巡回させる
          const idx =
            n >= 0 && n < total ? n : total > 6 ? ((n % total) + total) % total : -1;
          if (idx < 0)
            return (
              <div
                key={k}
                ref={(el) => void nodes.current.set(k, el)}
                className="vja-deck-card"
                data-slot={k}
              >
                <div className="vja-deck-face" />
              </div>
            );
          const job = jobs[idx];
          // 輪の向こう側に回り込んだ位置は、カードの裏として描く
          const back = flip.isBack?.(k) ?? false;
          return (
            <div
              key={k}
              ref={(el) => void nodes.current.set(k, el)}
              className={`vja-deck-card ${k === 0 ? "is-front" : ""} ${
                k < 0 && flip.nearDark ? "is-near" : ""
              } ${back ? "is-back" : ""}`}
              data-slot={k}
              aria-hidden={k !== 0}
            >
              {/* 絵柄はこの中。ぼかしとセピアはここにだけ掛け、膜(::after)は素のまま残す */}
              <div className="vja-deck-face">
                {k === 0 ? (
                  <a
                    href={`/jobs/${job.no}`}
                    className="vja-deck-hit block"
                    draggable={false}
                    onClick={(ev) => {
                      // ドラッグの流れで出たクリックでは遷移させない
                      if (suppress.current) {
                        suppress.current = false;
                        ev.preventDefault();
                        return;
                      }
                      tapSound();
                      saveReturn();
                      saveDeckAt(job.no);
                    }}
                  >
                    {/* 指で触る端末では傾き効果を止める（ドラッグと取り合いになる） */}
                    <TiltCard variant="hero" enabled={!dragging && !touch}>
                      <JobCard job={job} />
                    </TiltCard>
                  </a>
                ) : back ? (
                  <div className="vja-deck-back" aria-hidden />
                ) : realSlots.has(k) ? (
                  <JobCard job={job} />
                ) : (
                  // ぼかしきったカードは色の板と見分けがつかないので板で描く
                  <div
                    className="vja-deck-proxy"
                    // 円弧は縁だけが並ぶので、色の幅を広げないと一枚の面に見える
                    style={{ background: plateColor(job.color, flip.id === "arc" ? 1.6 : 1) }}
                    aria-hidden
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 位置と操作の案内 */}
      <div className="mt-6 flex flex-col items-center md:mt-9">
        <div className="flex items-center gap-7">
          <button
            onClick={() => step(-1)}
            aria-label={en ? "previous card" : "前のカード"}
            className="vja-deck-nav"
          >
            <i className="vja-chev is-prev" aria-hidden />
          </button>
          <p
            className="font-mono-label text-xs tracking-[0.32em] tabular-nums text-vja-ink-soft"
            aria-live="polite"
          >
            {current.no}
            <span className="opacity-35"> / {String(total).padStart(3, "0")}</span>
          </p>
          <button
            onClick={() => step(1)}
            aria-label={en ? "next card" : "次のカード"}
            className="vja-deck-nav"
          >
            <i className="vja-chev is-next" aria-hidden />
          </button>
        </div>

        {/* レールは番号の付属物として近づけ、案内文だけを離す */}
        <div className="vja-deck-rail mt-2.5" aria-hidden>
          <b style={{ width: `${progress}%` }} />
          <span style={{ left: `${progress}%` }} />
        </div>

        <p className="mt-4 font-mono-label text-[9.5px] tracking-[0.3em] text-vja-ink-soft opacity-50">
          {en
            ? "DRAG OR TAP SIDES · TAP CENTER TO OPEN"
            : "ドラッグ／左右タップで送る ・ 中央でひらく"}
        </p>
      </div>
    </div>
  );
}
