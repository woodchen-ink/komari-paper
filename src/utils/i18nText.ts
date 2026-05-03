export type I18nText = string | Record<string, string>;

export function resolveI18nText(
  text: I18nText | undefined,
  language: string,
): string | undefined {
  if (text === undefined || text === null) return undefined;
  if (typeof text === "string") return text;

  const dict = text;
  const lang = (language || "").trim();
  if (!lang) {
    const first = Object.values(dict)[0];
    return first;
  }

  // Try exact match first (e.g. zh-CN)
  if (dict[lang] !== undefined) return dict[lang];

  // Try base language (e.g. zh)
  const base = lang.split(/[-_]/)[0];
  if (base && dict[base] !== undefined) return dict[base];

  // Case-insensitive fallback
  const lowerLang = lang.toLowerCase();
  for (const [k, v] of Object.entries(dict)) {
    if (k.toLowerCase() === lowerLang) return v;
  }
  if (base) {
    const lowerBase = base.toLowerCase();
    for (const [k, v] of Object.entries(dict)) {
      if (k.toLowerCase() === lowerBase) return v;
    }
  }

  // Last resort: first value
  return Object.values(dict)[0];
}
