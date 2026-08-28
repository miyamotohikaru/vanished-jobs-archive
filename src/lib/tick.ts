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
 *
 * 1枚めくるたびに必ず1回鳴ってほしいので、いちばん速い送りより短くとる。
 * 束をいっぱいに払うと 40枚を 950ms で送り、出だしは 1枚あたり約8ms。
 * ここを 14 にしていたときは、その出だしで半分近くが捨てられていた。
 */
const MIN_GAP = 7;
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

/**
 * カードが1枚ぶん送られた合図。
 *
 * iPod nano の click wheel を手本にする。あれは板の裏の圧電素子を一発叩く音で、
 *  - とても短い（10ms 足らずで消える）
 *  - 音程がない。乾いた「コッ」で、余韻も伸びもない
 *  - 速く回しても1回ぶんの音は変わらない。ただ数が増えて連なるだけ
 * という3つでできている。だから速さで音を変える細工はしない。
 */
export function tick() {
  if (!enabled) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const gap = now - last;
  if (gap < MIN_GAP) return;
  last = now;

  if (ctx && ctx.state === "suspended") void ctx.resume();
  if (ctx && bus && noise) {
    const t = ctx.currentTime;

    // 弾かれた瞬間の角。ここが立っていないと「コッ」ではなく「ポッ」になる。
    // 大きさは前の当たりの音と同じ山（0.05）に合わせてある
    const snap = ctx.createBufferSource();
    snap.buffer = noise;
    const sh = ctx.createBiquadFilter();
    sh.type = "highpass";
    sh.frequency.value = 1500;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.25, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.003);
    snap.connect(sh).connect(sg).connect(bus);
    snap.start(t);
    snap.stop(t + 0.008);

    // 板そのものの鳴り。狭い山をひとつ置くと、乾いたまま芯が出る。
    // 正弦波を足すと音程がついて「ピッ」になってしまうので置かない
    const body = ctx.createBufferSource();
    body.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 4;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.2, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.008);
    body.connect(bp).connect(bg).connect(bus);
    body.start(t);
    body.stop(t + 0.013);
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
