import { useState } from "react";
import type { PingPoint } from "@/hooks/useNodePing";
import { LATENCY_GOOD, LATENCY_WARN } from "@/utils/healthHelper";

/**
 * 便签卡迷你柱图 (纯 CSS, 不引 Recharts) + hover 浮层 tooltip
 *   latency: 柱高 = 延迟相对峰值占比, 阈值色 (绿/黄/红) —— 看趋势
 *   loss:    柱等高, 正常点绿 / 丢包点红 —— 看丢包分布
 * hover 单根柱时在其上方弹出时间 + 值 (绝对定位, 容器需 relative)
 */

interface MiniBarsProps {
  points: PingPoint[];
  mode?: "latency" | "loss";
  /** 延迟阈值 (ms): ≤good 绿, good~warn 黄, >warn 红 */
  good?: number;
  warn?: number;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const MiniBars = ({
  points,
  mode = "latency",
  good = LATENCY_GOOD,
  warn = LATENCY_WARN,
}: MiniBarsProps) => {
  const [hover, setHover] = useState<number | null>(null);

  if (!points.length) {
    return (
      <div
        className="h-6 flex items-center text-[11px] font-mono"
        style={{ color: "var(--ink-mute)" }}
      >
        —
      </div>
    );
  }

  const peak = Math.max(...points.map((p) => p.value), 1);

  // 印刷收敛: 正常一律走墨色, 只有偏高 / 丢包才上色。
  // 满屏绿会稀释红的警示力, 墨色底噪 + 少量彩色才是印刷统计图的读法。
  const colorOf = (p: PingPoint): string => {
    if (p.lost) return "var(--pen-red)"; // 丢包: 红
    if (mode === "loss") return "var(--ink-line-soft)"; // 丢包模式正常点: 淡墨 (等高密排, 压到底噪)
    if (p.value <= good) return "var(--ink-soft)"; // 低延迟: 墨色
    if (p.value <= warn) return "var(--data-3)"; // 偏高: 黄
    return "var(--pen-red)"; // 高延迟: 红
  };

  const active = hover != null ? points[hover] : null;

  return (
    <div className="relative">
      {/* tooltip 浮层 */}
      {active && (
        <div
          className="absolute -top-7 z-20 px-1.5 py-0.5 rounded-[2px] whitespace-nowrap font-mono text-[10px] pointer-events-none"
          style={{
            left: `${((hover! + 0.5) / points.length) * 100}%`,
            transform: "translateX(-50%)",
            background: "var(--paper-card)",
            border: "1px solid var(--ink-line-soft)",
            color: "var(--ink)",
            boxShadow: "0 2px 8px -2px rgba(42,38,34,0.25)",
          }}
        >
          {fmtTime(active.time)} ·{" "}
          {active.lost ? (
            <span style={{ color: "var(--pen-red)" }}>loss</span>
          ) : (
            `${Math.round(active.value)}ms`
          )}
        </div>
      )}
      <div
        className="h-6 flex items-end gap-px"
        onMouseLeave={() => setHover(null)}
      >
        {points.map((p, i) => {
          const heightPct =
            mode === "loss" ? 100 : p.lost ? 100 : Math.max(12, (p.value / peak) * 100);
          return (
            <div
              key={i}
              className="flex-1 min-w-0 self-stretch flex items-end"
              onMouseEnter={() => setHover(i)}
            >
              <div
                className="w-full rounded-[1px]"
                style={{
                  height: `${heightPct}%`,
                  background: colorOf(p),
                  opacity: hover === i ? 1 : mode === "loss" && !p.lost ? 0.8 : 0.9,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniBars;
