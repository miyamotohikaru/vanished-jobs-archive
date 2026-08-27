import raw from "./translations_en.json";

/** Gemini機械翻訳によるEN本文（scripts/translate_en.mjs で生成）。無い項目はJAフォールバック */
export type EnEntry = {
  no: string;
  quote: string;
  summary: string;
  body: string[];
  tools: string[];
  timeline: { year: string; text: string }[];
  timelineClose: string;
  trivia: string;
  lineageText: string;
};

export const enDetails: Record<string, EnEntry> = raw as Record<string, EnEntry>;
