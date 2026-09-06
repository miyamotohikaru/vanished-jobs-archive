/**
 * 共有時に出る絵（1200×630）を焼く道具。
 *   node tools/shoot-og.mjs [URL]
 *
 *   1) 実際のサイトから「束」だけを撮ってくる（題字・タグライン・
 *      SORTバー・ページ送りは隠す）。束は必ず NO.001（書記）から
 *      始まるので毎回同じ絵になる。
 *   2) その束を右に敷いて、tools/og.html（版下）で左に題字を重ねる。
 *
 * 画面をそのまま撮ると題字がヘッダの中の小さい文字になり、
 * SNSの縮小表示で読めない。だから題字は版下側で大きく組んでいる。
 *
 * 既定では本番URLを撮るので、手元の変更を映したいときは
 *   npm run dev の後に node tools/shoot-og.mjs http://localhost:3000
 *
 * 焼いた絵のハッシュを src/app/og-version.ts に書き出す。
 * SNSは og:image を URL 単位で覚えるので、これが変わらないと
 * 絵を差し替えても古いものが出続ける。
 */
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = process.argv[2] ?? "https://vanished-jobs-archive.kosukuma.com/";

/** 束を撮る窓。大きめに撮って、版下で縮めて置く */
const SHOT = { w: 1400, h: 800, dpr: 1.5 };
/** 1200×630 の中で、束の中心をどこに置くか／撮影に対する倍率 */
const PLACE = { x: 890, y: 320, scale: 1.0 };

/** 束だけにするための化粧 */
const SHOOT_CSS = `
  header, .vja-hero, .vja-bar, footer { display: none !important; }
  div:has(> div > .vja-deck-nav) { display: none !important; }
`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ["--headless=new", "--hide-scrollbars"],
});
const tmp = await mkdtemp(path.join(tmpdir(), "vja-og-"));
const deckPng = path.join(tmp, "deck.png");

try {
  /* 1) 束を撮る */
  const page = await browser.newPage();
  await page.setViewport({ width: SHOT.w, height: SHOT.h, deviceScaleFactor: SHOT.dpr });
  await page.goto(SITE, { waitUntil: "networkidle0", timeout: 60000 });
  await page.addStyleTag({ content: SHOOT_CSS });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 2000)); // 束が組み上がるのを待つ

  const deck = await page.evaluate(() => {
    const r = document.querySelector(".vja-deck")?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  if (!deck) throw new Error("束(.vja-deck)が見つからない");
  await page.screenshot({ path: deckPng });

  /* 2) 版下に敷いて書き出す */
  const og = await browser.newPage();
  await og.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  const q = new URLSearchParams({
    deck: pathToFileURL(deckPng).href,
    w: String(SHOT.w * PLACE.scale),
    left: String(Math.round(PLACE.x - deck.x * PLACE.scale)),
    top: String(Math.round(PLACE.y - deck.y * PLACE.scale)),
  });
  await og.goto(`${pathToFileURL(path.join(ROOT, "tools/og.html")).href}?${q}`, {
    waitUntil: "networkidle0",
    timeout: 60000,
  });
  await og.evaluate(() => document.fonts.ready);
  await og.waitForFunction(() => document.querySelector(".deck")?.complete === true);
  await new Promise((r) => setTimeout(r, 300));

  const out = path.join(ROOT, "public/og.png");
  await (await og.$("#og")).screenshot({ path: out });
  console.log(out);

  const version = createHash("sha256").update(await readFile(out)).digest("hex").slice(0, 8);
  const vfile = path.join(ROOT, "src/app/og-version.ts");
  await writeFile(
    vfile,
    `// tools/shoot-og.mjs が og.png を焼くたびに書き換える。手で触らない。\nexport const OG_VERSION = "${version}";\n`,
    "utf8"
  );
  console.log(`${vfile} (${version})`);
} finally {
  await browser.close();
  await rm(tmp, { recursive: true, force: true });
}
