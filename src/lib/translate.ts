import { adminDb } from "@/lib/firebase-admin";

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const TRANSLATE_API_URL = "https://translation.googleapis.com/language/translate/v2";

// Target languages for auto-translation (all supported UI languages minus source)
const ALL_LANGUAGES = ["en", "fr", "pt", "es", "ar", "zh", "ja", "ko", "de", "ru"];

interface TranslationCacheEntry {
  text: string;
  source: string;
  target: string;
  translated: string;
  createdAt: string;
}

/**
 * Translate a single text string from source to target language.
 * Uses Firestore cache to avoid duplicate API calls.
 */
async function translateText(
  text: string,
  source: string,
  target: string
): Promise<string> {
  if (!text.trim()) return "";
  if (source === target) return text;
  if (!GOOGLE_TRANSLATE_API_KEY) return "";

  // Check Firestore cache first
  const cacheKey = `${source}:${target}:${Buffer.from(text).toString("base64").slice(0, 200)}`;
  const cacheRef = adminDb.collection("translation_cache").doc(cacheKey);

  try {
    const cached = await cacheRef.get();
    if (cached.exists) {
      return (cached.data() as TranslationCacheEntry).translated;
    }
  } catch {
    // Cache miss, continue to API
  }

  // Call Google Translate API
  try {
    const params = new URLSearchParams({
      q: text,
      source,
      target,
      key: GOOGLE_TRANSLATE_API_KEY,
      format: "text",
    });

    const res = await fetch(`${TRANSLATE_API_URL}?${params.toString()}`, {
      method: "POST",
    });

    if (!res.ok) {
      console.error("Translation API error:", res.status, await res.text());
      return "";
    }

    const data = await res.json();
    const translated: string =
      data?.data?.translations?.[0]?.translatedText || "";

    if (translated) {
      // Cache the result
      await cacheRef.set({
        text: text.slice(0, 500),
        source,
        target,
        translated: translated.slice(0, 500),
        createdAt: new Date().toISOString(),
      } satisfies TranslationCacheEntry);
    }

    return translated;
  } catch (err) {
    console.error("Translation error:", err);
    return "";
  }
}

/**
 * Auto-translate dataset title and description into all missing languages.
 * Returns updated titles and descriptions maps with `__auto` markers.
 *
 * Existing human-provided translations are never overwritten.
 * Auto-translated entries are marked with a companion `__auto` key
 * (e.g., titles["fr__auto"] = true) so admins know which to review.
 */
export async function autoTranslateDatasetMetadata(
  titles: Record<string, string>,
  descriptions: Record<string, string>
): Promise<{
  titles: Record<string, string>;
  descriptions: Record<string, string>;
}> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    return { titles, descriptions };
  }

  // Detect source language (first non-empty title)
  const sourceLang =
    Object.entries(titles).find(([, v]) => v.trim())?.[0] || "en";
  const sourceTitle = titles[sourceLang] || "";
  const sourceDesc = descriptions[sourceLang] || "";

  if (!sourceTitle) return { titles, descriptions };

  const updatedTitles = { ...titles };
  const updatedDescs = { ...descriptions };

  // Translate to all missing languages in parallel
  const targetLangs = ALL_LANGUAGES.filter(
    (lang) => lang !== sourceLang && !titles[lang]?.trim()
  );

  const results = await Promise.allSettled(
    targetLangs.map(async (target) => {
      const [translatedTitle, translatedDesc] = await Promise.all([
        translateText(sourceTitle, sourceLang, target),
        sourceDesc ? translateText(sourceDesc, sourceLang, target) : Promise.resolve(""),
      ]);
      return { target, translatedTitle, translatedDesc };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { target, translatedTitle, translatedDesc } = result.value;
      if (translatedTitle) {
        updatedTitles[target] = translatedTitle;
        updatedTitles[`${target}__auto`] = "true";
      }
      if (translatedDesc) {
        updatedDescs[target] = translatedDesc;
        updatedDescs[`${target}__auto`] = "true";
      }
    }
  }

  return { titles: updatedTitles, descriptions: updatedDescs };
}
