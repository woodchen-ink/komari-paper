/**
 * 网络质量 (延迟 / 丢包) 的阈值口径与档位色。
 *
 * 这套阈值原先散在 Node.tsx 的内联三元里各写一遍; 统一收到这里,
 * 改档位只改一个文件。
 *
 * 只管"档位与颜色", 不管底纹长度: 健康格不画用量底纹, 只用数值的阈值色。
 */

/** 延迟档位 (ms): ≤100 正常 / ≤300 偏高 / 更高异常 */
export const LATENCY_GOOD = 100;
export const LATENCY_WARN = 300;

/** 丢包档位 (%): 0 正常 / <5 零星 / ≥5 持续 */
export const LOSS_WARN = 5;

/** 档位 → 墨色: 常态墨 / 警示赭黄 / 危险红, 与 UsageBar / NumWash 同一套色 */
export type HealthLevel = "normal" | "warn" | "danger";

export function healthColor(level: HealthLevel): string {
  if (level === "danger") return "var(--pen-red)";
  if (level === "warn") return "var(--data-3)";
  return "var(--ink)";
}

export function latencyLevel(ms: number): HealthLevel {
  if (ms <= LATENCY_GOOD) return "normal";
  if (ms <= LATENCY_WARN) return "warn";
  return "danger";
}

export function lossLevel(pct: number): HealthLevel {
  if (pct === 0) return "normal";
  if (pct < LOSS_WARN) return "warn";
  return "danger";
}
