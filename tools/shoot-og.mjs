/**
 * 共有時に出る絵（1200×630）を焼く道具。
 *   node tools/shoot-og.mjs [URL]
 *
 * 版下を別に描くのではなく、実際の索引（束）の画面を撮る。
 * 撮るときだけ、絵に要らないもの（SORT/表示切替のバー、束の下の
 * ページ送り、右上の案内）を隠す。束は必ず NO.001 から始まるので
 * 毎回同じ絵になる。
 *
 * 960×504 を 1.25 倍で撮って 1200×630 にしている。等倍で撮ると
 * 題字やタグラインが小さすぎて、SNSの縮小表示で読めないため。
 *
 * 既定では本番URLを撮るので、手元の変更を映したいときは
 *   npm run dev の後に node tools/shoot-og.mjs http://localhost:3000
 *
 * 焼いた絵のハッシュを src/app/og-version.ts に書き出す。
 * SNSは og:image を URL 単位で覚えるので、これが変わらないと
 * 絵を差し替えても古いものが出続ける。
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = process.argv[2] ?? "https://vanished-jobs-archive.kosukuma.com/";

/** 撮るときだけ効かせる化粧 */
const SHOOT_CSS = `
  /* SORT と 表示切替のバーは絵に要らない */
  .vja-bar { display: none !important; }
  /* 束の下のページ送り（矢印・001/151・操作の案内）も要らない */
  div:has(> div > .vja-deck-nav) { display: none !important; }
  /* 右上の索引/年表/系譜と JA/EN も落として、題字だけ残す */
  header nav, header button { display: none !important; }
`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ["--headless=new", "--hide-scrollbars"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 504, deviceScaleFactor: 1.25 });
  await page.goto(SITE, { waitUntil: "networkidle0", timeout: 60000 });
  await page.addStyleTag({ content: SHOOT_CSS });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 2000)); // 束が組み上がるのを待つ

  const out = path.join(ROOT, "public/og.png");
  await page.screenshot({ path: out });
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
}
