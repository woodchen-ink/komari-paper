/**
 * 汇率获取 (以 CNY 为基准).
 *
 * 用途: 首页财务汇总把各币种价格折算成人民币统一显示.
 * 策略: 当天 localStorage 缓存命中直接用 → 否则联网拉取 (多源回退) → 失败回退过期缓存 → 再失败用内置默认值.
 * 离线友好: 任何情况下都返回一份可用汇率, 不阻塞渲染.
 */

export type CurrencyCode = "CNY" | "USD" | "HKD" | "EUR" | "GBP" | "JPY";
export type ExchangeRates = Record<CurrencyCode, number>;

const CACHE_KEY = "komari_paper_exchange_rates_cny_v1";
const REQUIRED: CurrencyCode[] = ["CNY", "USD", "HKD", "EUR", "GBP", "JPY"];
const FETCH_TIMEOUT = 6000;

// 1 CNY = N 外币 (内置兜底, 离线时用; 数值会随行情漂移, 仅作 fallback)
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  CNY: 1,
  USD: 0.1425,
  HKD: 1.1084,
  EUR: 0.121,
  GBP: 0.1056,
  JPY: 22.23,
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  CNY: "¥",
  USD: "$",
  HKD: "HK$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

// 多源汇率接口 (均免 key, 以 CNY 为基准); 用户建议的 exchangerate-api 现代免费端点即 open.er-api.com
const RATE_APIS: Array<{ url: string; parse: (d: any) => unknown }> = [
  { url: "https://open.er-api.com/v6/latest/CNY", parse: (d) => d?.rates },
  { url: "https://api.exchangerate-api.com/v4/latest/CNY", parse: (d) => d?.rates },
  { url: "https://api.frankfurter.app/latest?from=CNY", parse: (d) => d?.rates },
];

/** 把任意货币符号/代码归一到支持的 CurrencyCode, 未识别归 CNY */
export function normalizeCurrency(currency: string | null | undefined): CurrencyCode {
  const v = String(currency || "CNY").trim().toUpperCase();
  if (v === "USD" || v === "$") return "USD";
  if (v === "HKD" || v === "HK$") return "HKD";
  if (v === "EUR" || v === "€") return "EUR";
  if (v === "GBP" || v === "£") return "GBP";
  if (v === "JPY") return "JPY";
  return "CNY";
}

/** 把某币种金额折算成 CNY (rates 是 1 CNY = N 外币, 故除以) */
export function toCNY(
  amount: number,
  currency: string | null | undefined,
  rates: ExchangeRates,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const code = normalizeCurrency(currency);
  if (code === "CNY") return amount;
  const rate = rates[code];
  return rate > 0 ? amount / rate : amount;
}

function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// 校验并补齐: 缺失币种用默认值兜底, 全非法则判定失败
function sanitize(raw: unknown): ExchangeRates | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const out = { ...DEFAULT_EXCHANGE_RATES };
  let valid = 0;
  for (const code of REQUIRED) {
    const n = Number(src[code]);
    if (Number.isFinite(n) && n > 0) {
      out[code] = n;
      valid++;
    }
  }
  // 除 CNY 外至少命中一个外币才算有效
  return valid >= 2 ? out : null;
}

function readCache(): { date: string; rates: ExchangeRates } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const rates = sanitize(parsed?.rates);
    if (parsed?.date && rates) return { date: String(parsed.date), rates };
  } catch {
    // 忽略损坏缓存
  }
  return null;
}

function writeCache(rates: ExchangeRates): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ date: todayKey(), rates }),
    );
  } catch {
    // localStorage 不可用时静默
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRates(): Promise<ExchangeRates | null> {
  for (const api of RATE_APIS) {
    try {
      const res = await fetchWithTimeout(api.url);
      if (!res.ok) continue;
      const data = await res.json();
      const rates = sanitize(api.parse(data));
      if (rates) return rates;
    } catch (err) {
      console.warn(`获取汇率失败: ${api.url}`, err);
    }
  }
  return null;
}

/**
 * 取当日汇率: 缓存命中 → 联网 → 过期缓存 → 默认值. 始终 resolve, 不抛错.
 */
export async function getDailyExchangeRates(): Promise<ExchangeRates> {
  const cached = readCache();
  if (cached && cached.date === todayKey()) return cached.rates;

  const fetched = await fetchRates();
  if (fetched) {
    writeCache(fetched);
    return fetched;
  }

  if (cached) return cached.rates;
  return DEFAULT_EXCHANGE_RATES;
}
