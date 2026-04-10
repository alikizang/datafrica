"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import pt from "@/locales/pt.json";
import es from "@/locales/es.json";
import ar from "@/locales/ar.json";

type Translations = typeof en;
type NestedKeyOf<T, K extends string = ""> = T extends object
  ? { [P in keyof T & string]: NestedKeyOf<T[P], K extends "" ? P : `${K}.${P}`> }[keyof T & string]
  : K;

const locales: Record<string, Translations> = { en, fr, pt, es, ar };

export const LANGUAGES = [
  { code: "en", label: "English", flag: "GB" },
  { code: "fr", label: "Fran\u00e7ais", flag: "FR" },
  { code: "pt", label: "Portugu\u00eas", flag: "PT" },
  { code: "es", label: "Espa\u00f1ol", flag: "ES" },
  { code: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", flag: "SA" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

interface LanguageContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback to key
    }
  }
  return typeof current === "string" ? current : path;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    // Read from localStorage synchronously on client to avoid flash of wrong language
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("datafrica-lang") as LangCode | null;
      if (saved && locales[saved]) return saved;
    }
    return "en";
  });

  useEffect(() => {
    // Also set html dir on mount for RTL
    if (lang === "ar") {
      document.documentElement.dir = "rtl";
    }
  }, []);

  const setLang = (newLang: LangCode) => {
    setLangState(newLang);
    localStorage.setItem("datafrica-lang", newLang);
    // Update html dir for RTL languages
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const t = (key: string): string => {
    return getNestedValue(locales[lang] as unknown as Record<string, unknown>, key);
  };

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
