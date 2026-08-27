/** UIラベル・分類名の英訳辞書（本文はJAのみ）。サーバー/クライアント両方から参照可 */
export const dict = {
  status: {
    extinct: "Extinct",
    transformed: "Transformed",
    ongoing: "Ongoing",
  } as Record<string, string>,
  category: {
    前近代の世界: "Premodern world",
    江戸の日本: "Edo Japan",
    産業革命の世界: "Industrial Revolution",
    "明治〜昭和の日本": "Meiji–Showa Japan",
    "20世紀の世界": "20th-century world",
    平成の日本: "Heisei Japan",
    消滅進行中: "Vanishing now",
  } as Record<string, string>,
  region: {
    日本: "Japan",
    英: "UK",
    欧: "Europe",
    米: "US",
    世界: "World",
    中東: "Middle East",
    北欧: "Nordic",
    中南米: "Latin America",
  } as Record<string, string>,
  cause: {
    1: "Electrification",
    2: "Communication & digital",
    3: "AI & algorithms",
    4: "Lifestyle & infrastructure",
    5: "Law & institutions",
    6: "Medicine & science",
    7: "Media & entertainment",
  } as Record<number, string>,
};

/** 地域の生文字列をトークン単位で英訳（長いものから置換） */
const regionTokens: [string, string][] = [
  ["世界（日本の「泣きばい」含む）", "World (incl. Japan)"],
  ["英ウェールズ地方", "Wales, UK"],
  ["英教会", "English church"],
  ["英宮廷", "English court"],
  ["日本（越後等）", "Japan (Echigo etc.)"],
  ["古代世界", "Ancient world"],
  ["北米", "North America"],
  ["北欧", "Nordic countries"],
  ["中東", "Middle East"],
  ["キューバ", "Cuba"],
  ["ポーランド", "Poland"],
  ["日本", "Japan"],
  ["世界", "World"],
  ["英", "UK"],
  ["欧", "Europe"],
  ["米", "US"],
  ["愛", "Ireland"],
  ["蘭", "Netherlands"],
  ["・", " · "],
];

export function translateRegion(s: string): string {
  let out = s;
  for (const [ja, en] of regionTokens) out = out.split(ja).join(en);
  return out;
}
