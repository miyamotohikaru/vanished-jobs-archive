"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "ja" | "en";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "ja",
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ja");

  useEffect(() => {
    const saved = localStorage.getItem("vja-lang");
    if (saved === "en" || saved === "ja") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("vja-lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** サーバーコンポーネント内でも使える言語切替リーフ */
export function T({ ja, en }: { ja: React.ReactNode; en: React.ReactNode }) {
  const { lang } = useLang();
  return <>{lang === "en" ? en : ja}</>;
}

export { dict } from "./dict";
