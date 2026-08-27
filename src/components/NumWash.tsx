import React from "react";
import type { HealthLevel } from "@/utils/healthHelper";

interface NumWashProps {
  /** 用量百分比 (0–100), 决定底纹长度、色相与浓度 */
  percent: number;
  /** 显示文本; 缺省时按 percent 出 "N%" */
  children: React.ReactNode;
  /** 附加类名 (字号由调用方给, 组件只管底纹) */
  className?: string;
  /**
   * 显式指定档位, 覆盖按 percent 的 60/80 判定。
   * 网络质量类指标 (延迟 / 丢包) 的档位来自各自的阈值口径而不是百分比,
   * 例如 211ms 是 warn 档但底纹量程只有 52%; 不给这个出口就会色档错位。
   */
  level?: HealthLevel;
}

/**
 * 用量 → 底纹色与浓度: 常态墨 16% / ≥60 赭黄 22% / ≥80 红 28%。
 * 阈值与 UsageBar 的 getColor 同口径, 改一处要同时改另一处。
 * 浓度跟着档位加深, 让高负载格子在余光里也能跳出来。
 */
function washOf(percent: number, level?: HealthLevel): { ink: string; alpha: number } {
  const resolved: HealthLevel =
    level ?? (percent >= 80 ? "danger" : percent >= 60 ? "warn" : "normal");
  if (resolved === "danger") return { ink: "var(--pen-red)", alpha: 0.28 };
  if (resolved === "warn") return { ink: "var(--data-3)", alpha: 0.22 };
  return { ink: "var(--ink)", alpha: 0.16 };
}

/**
 * 印张式用量数值: 用量是数值背后那块淡墨底纹, 数值本身始终满墨。
 * 样式见 global.css 的 .num-wash。
 *
 * 与液位填充 (数字字形自身被灌墨) 的区别是硬约束而非风格取舍: 低用量时
 * 液位方案会让整个数字发白不可读, 而本方案低用量只是底纹短, 数值照常清晰。
 *
 * children 走正常 JSX, 所以单位 / 前后缀可以自由排 (不像 attr() 只能吃纯字符串)。
 */
const NumWash = React.memo(
  ({ percent, children, className, level }: NumWashProps) => {
    // 底纹按 0–100 封顶: 负载等指标真实值可超 100%, 底纹画满即可
    const clamped = Math.min(Math.max(percent, 0), 100);
    const { ink, alpha } = washOf(clamped, level);

    return (
      <span
        className={`num-wash num-display${className ? ` ${className}` : ""}`}
        style={
          {
            "--wash-pct": `${clamped}%`,
            "--wash-ink": ink,
            "--wash-alpha": alpha,
          } as React.CSSProperties
        }
      >
        <span className="num-wash-ink">{children}</span>
      </span>
    );
  },
);

export default NumWash;
