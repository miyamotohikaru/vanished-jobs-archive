// details.ts + jobs_data.json を英訳して src/data/translations_en.json を生成する
import { readFileSync, writeFileSync, existsSync } from "fs";

const key = readFileSync(
  "/Users/miyamotohikaru/hikaru323.github.io/creature-vision/.env.local",
  "utf8"
).match(/GEMINI_API_KEY="?([^"\n]+)"?/)[1];

const jobs = JSON.parse(readFileSync("src/data/jobs_data.json", "utf8"));

const dsrc = readFileSync("src/data/details.ts", "utf8");
const objStart = dsrc.indexOf("{", dsrc.indexOf("export const details"));
const objText = dsrc.slice(objStart, dsrc.lastIndexOf("};") + 1);
const details = eval("(" + objText + ")");

const OUT = "src/data/translations_en.json";
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

const nos = jobs.map((j) => j.no).filter((no) => !out[no]);
console.log("to translate:", nos.length);

const CHUNK = 8;
for (let i = 0; i < nos.length; i += CHUNK) {
  const batch = nos.slice(i, i + CHUNK).map((no) => {
    const j = jobs.find((x) => x.no === no);
    const d = details[no];
    return {
      no,
      name: j.name,
      en: j.en,
      quote: j.quote,
      summary: d?.summary ?? j.summary,
      body: d?.body ?? [],
      tools: d?.tools ?? [],
      timeline: d?.timeline ?? [],
      timelineClose: d?.timelineClose ?? "",
      trivia: d?.trivia ?? "",
      lineageText: d?.lineageText ?? "",
    };
  });

  const prompt = `You are translating entries of a Japanese illustrated encyclopedia called "Vanished Jobs Archive" — a warm, literary archive of extinct occupations, narrated with a cute bear mascot (Kosukuma-kun).

Translate each entry below into natural, polished, slightly literary English. Rules:
- Return ONLY a JSON array. Each element: {"no", "quote", "summary", "body" (array of paragraphs), "tools" (array), "timeline" (array of {"year","text"}), "timelineClose", "trivia", "lineageText"}.
- "quote" is a short line spoken by the small bear in a childlike voice — keep it short, charming and lowercase-casual (e.g. "i carried the news on foot").
- "timeline.year" labels: translate era words naturally ("19c末"→"late 19c", "20c前半"→"early 20c", "平成"→"Heisei era", "現在"→"today", "以後"→"afterward", "1920s〜"→"1920s–", keep plain years as-is, keep "20XX").
- "lineageText": keep the "→" arrows, translate the job names (they may reference other entries).
- Keep em-dashes and the reflective tone of the closing lines.
- Do not add or drop paragraphs; keep arrays the same length as the source.

Entries:
${JSON.stringify(batch, null, 1)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    }
  );
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  let arr;
  try {
    arr = JSON.parse(text);
  } catch (e) {
    console.error("PARSE FAIL batch", i, text.slice(0, 300), JSON.stringify(json).slice(0, 300));
    continue;
  }
  for (const t of arr) {
    if (t && t.no) out[t.no] = t;
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`batch ${i / CHUNK + 1}: done (${Object.keys(out).length} total)`);
}
console.log("finished:", Object.keys(out).length, "/", jobs.length);
