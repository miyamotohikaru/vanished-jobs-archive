"use client";

/**
 * 束を送るときの「カチッ」。音声ファイルは持たず、その場で合成する。
 *
 * 作りは こすくまくん危機一髪 の穴ホバー音と同じ考え方で、
 * ごく短いノイズ（高域だけ通す）＋高い正弦波を重ねる。
 * 速く連続するときは短く小さくして、ラチェットのように聞こえるようにする。
 *
 * AudioContext はユーザーの操作の中でしか作れないので、
 * 最初のドラッグやクリックのときに用意する。
 */

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let last = 0;
let lastBuzz = 0;
let enabled = true;

/**
 * 連続して鳴らすときの最短間隔(ms)。これより速い分は捨てる。
 * 指を速く動かしたぶんだけ音も詰まってほしいので、詰められる上限は高くとる。
 */
const MIN_GAP = 14;
/** 振動はもっと間引く。速い送りで鳴らし続けると唸りになる */
const MIN_BUZZ_GAP = 120;

/**
 * 鳴らすかどうか。いまは切り替えを置いていないので誰も呼ばない。
 * （既定で鳴る側にしてある）
 */
export function setTickEnabled(on: boolean) {
  enabled = on;
}

/** ユーザー操作の中から呼ぶ。2回目以降は何もしない */
export function primeTick() {
  if (typeof window === "undefined" || ctx) return;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
    bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(ctx.destination);
    // 使い回すホワイトノイズ。
    // 短く取ると、めくる音の「シュッ」で頭に戻る周期が唸りになるので長めに持つ。
    // カチッのほうは頭の数十ミリ秒しか使わないので、長くても影響はない
    const len = Math.floor(ctx.sampleRate * 1.5);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
}

/** カードが1枚ぶん送られた合図。速い送りでは自動的に控えめになる */
export function tick() {
  if (!enabled) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const gap = now - last;
  if (gap < MIN_GAP) return;
  last = now;

  // 速く回しているほど短く・小さく。ゆっくりのときは輪郭のある「コッ」
  const slow = Math.min(gap / 220, 1);
  // 回転音が鳴っているあいだだけ、当たりの音を少し引く。
  // 同じ大きさのまま重ねると、カチカチが前に出すぎて回転音が埋もれる
  const duck = now < duckUntil ? 0.8 : 1;
  const peak = (0.035 + 0.055 * slow) * duck;
  const decay = 0.016 + 0.022 * slow;

  if (ctx && ctx.state === "suspended") void ctx.resume();
  if (ctx && bus && noise) {
    const t = ctx.currentTime;
    // 木のものが当たるような、ごく短い当たり
    const src = ctx.createBufferSource();
    src.buffer = noise;
    // 低めに寄せる。高く切ると「チッ」と細くなり、木の当たりに聞こえない
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(hp).connect(lp).connect(g).connect(bus);
    src.start(t);
    src.stop(t + decay + 0.01);

    // 芯になる音。これがないと「サッ」としか聞こえない。
    // 速く回すほど少し低くして、詰まったときに耳ざわりにならないようにする
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(780 + 260 * slow, t);
    const og = ctx.createGain();
    og.gain.setValueAtTime(peak * 0.6, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.9);
    osc.connect(og).connect(bus);
    osc.start(t);
    osc.stop(t + decay + 0.01);
  }

  // 対応している端末だけ。iOS には振動の仕組みがないので何も起きない
  if (now - lastBuzz > MIN_BUZZ_GAP) {
    lastBuzz = now;
    navigator.vibrate?.(5);
  }
}

/**
 * カードを開くときの音。紙を1枚めくる感じにする。
 * 帯域を上から下へ滑らせた「シュッ」と、置いたときの芯を重ねる。
 * 送りの「カチッ」と同じ音だと、送ったのか開いたのか区別がつかない。
 */
export function tapSound() {
  if (!enabled) return;
  if (ctx && ctx.state === "suspended") void ctx.resume();
  if (!ctx || !bus || !noise) return;
  const t = ctx.currentTime;

  // 紙が擦れて離れる音。高いところから低いところへ帯を滑らせるのが要で、
  // 固定の帯域だと「ザッ」と鳴るだけでめくった感じにならない
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.85;
  bp.frequency.setValueAtTime(2800, t);
  bp.frequency.exponentialRampToValueAtTime(480, t + 0.17);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  // 立ち上がりに角があると紙ではなく打撃に聞こえるので、少しだけ丸める
  g.gain.exponentialRampToValueAtTime(0.085, t + 0.028);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  src.connect(bp).connect(g).connect(bus);
  src.start(t);
  src.stop(t + 0.22);

  // 置いたときの芯。少し下がりながら消える
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(560, t);
  osc.frequency.exponentialRampToValueAtTime(330, t + 0.13);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.07, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(og).connect(bus);
  osc.start(t);
  osc.stop(t + 0.17);

  // 開いた合図の余韻。芯の5度上を、遅らせてごく小さく重ねる
  const up = ctx.createOscillator();
  up.type = "sine";
  up.frequency.setValueAtTime(840, t + 0.03);
  const ug = ctx.createGain();
  ug.gain.setValueAtTime(0.0001, t + 0.03);
  ug.gain.exponentialRampToValueAtTime(0.026, t + 0.06);
  ug.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
  up.connect(ug).connect(bus);
  up.start(t + 0.03);
  up.stop(t + 0.28);

  navigator.vibrate?.(12);
}

/** 回転音が鳴り終わるまでの目安。重ねて鳴らすと濁るので見張る */
let spinUntil = 0;
/** 回転音が鳴っているあいだ。この間はカチカチを少し引く */
let duckUntil = 0;

/**
 * 思いきり払って何枚も送るときの「キュイーン」。
 * パチンコの回転のように、弾いた瞬間に一気に上がってから、
 * 束が止まるまでゆっくり落ちる。
 *
 * 鳴りの正体は「共鳴の山」で、のこぎり波そのものではない。
 * ローパスの Q を立てて音程の少し上を並走させると、あの金属的な鳴りになる。
 * （帯域通過フィルタで同じことをすると痩せて、カチカチに埋もれてしまう）
 *
 * @param cards  送る枚数
 * @param durMs  束が止まるまでの時間。落ちきる時刻をこれに合わせる
 */
export function spinSound(cards: number, durMs: number) {
  if (!enabled) return;
  if (ctx && ctx.state === "suspended") void ctx.resume();
  if (!ctx || !bus) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  // 前の回転がまだ鳴っているうちは足さない（唸って濁る）
  if (now < spinUntil) return;

  const dur = Math.min(Math.max(durMs / 1000, 0.3), 1.1);
  spinUntil = now + dur * 700;
  duckUntil = now + dur * 1000;
  const t = ctx.currentTime;
  const n = Math.min(cards, 40);
  /** 勢いがあるほど高く回る。3枚で約660、40枚で約1920 */
  const top = 560 + n * 34;
  const end = 210;
  /** 上がりきるまで。ここが長いと「キュイ」の頭が立たない */
  const rise = 0.09;

  /** 発振器も共鳴の山も、同じ道すじを倍率だけ変えて通る */
  const sweep = (p: AudioParam, mul: number) => {
    p.setValueAtTime(240 * mul, t);
    p.exponentialRampToValueAtTime(top * mul, t + rise);
    p.exponentialRampToValueAtTime(end * mul, t + dur);
  };

  const g = ctx.createGain();
  /**
   * カチカチ（山 0.019）より前に出す大きさ。ここを下げると埋もれてしまい、
   * 「カチカチが速くなっただけ」に聞こえる。前の作りはここで失敗していた
   */
  const peak = 0.05 + 0.03 * Math.min(n / 20, 1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.05);
  g.gain.setValueAtTime(peak, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(bus);

  // 鳴りの芯。音程の2倍あたりを Q を立てて追わせる
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 12;
  sweep(lp.frequency, 2.1);
  lp.connect(g);

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  sweep(osc.frequency, 1);
  const og = ctx.createGain();
  og.gain.value = 0.65;
  osc.connect(og).connect(lp);
  osc.start(t);
  osc.stop(t + dur + 0.02);

  // 1オクターブ上を薄く重ねる。上でちらつく成分がないと頭が立たない
  const hi = ctx.createOscillator();
  hi.type = "square";
  hi.detune.value = 8;
  sweep(hi.frequency, 2);
  const hg = ctx.createGain();
  hg.gain.value = 0.16;
  hi.connect(hg).connect(lp);
  hi.start(t);
  hi.stop(t + dur + 0.02);

  // ここには「回っている空気」としてノイズの層を敷いていたが、
  // カチカチの裏で「しゅんしゅん」と鳴るだけだったので外した。
  // 鳴りは共鳴の山だけで足りる
}
