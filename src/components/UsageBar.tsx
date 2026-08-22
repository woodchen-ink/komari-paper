import React from "react";

interface UsageBarProps {
  value: number; // Utilization percentage (0–100)
  label: string; // Label for the bar (e.g., "CPU", "Memory", "Disk")
  compact?: boolean; // Whether to show in compact mode (for tables)
  max?: number; // Maximum value for the bar (e.g., total RAM, total disk space)
}

/**
 * 标尺式用量条: 基线 + 四分刻度 + 实心墨条 (.rule-bar / .rule-bar-fill 定义在 global.css)。
 * 纯实色填充块是最"web 仪表盘"的元素, 换成标尺后读作印刷统计图。
 * 阈值色收敛到"常态墨色, 异常才上色": 一屏正常时几乎只有墨黑, 出问题的节点才跳出来。
 */
const UsageBar = React.memo(
  ({ value, label, compact = false, max = 100 }: UsageBarProps) => {
    const clampedValue = Math.min(Math.max(value, 0), max);

    // 常态墨色 / ≥60 赭黄警示 / ≥80 红危险 (满屏绿会稀释红的警示力)
    const getColor = (val: number) => {
      if (val >= 80) return "var(--pen-red)";
      if (val >= 60) return "var(--data-3)";
      return "var(--ink-soft)";
    };

    const fillPercent = (clampedValue / max) * 100;
    // 非零用量给 2px 最小可见宽度: 低值时墨条占比不足 1px 会肉眼不可见,
    // 叠加 width 过渡会出现"填充消失一会儿"的观感, 用 min-width 兜底
    const fillStyle = {
      backgroundColor: getColor(clampedValue),
      width: `${fillPercent}%`,
      minWidth: fillPercent > 0 ? "2px" : 0,
    } as const;

    const bar = (
      <div className="rule-bar">
        <div className="rule-bar-fill" style={fillStyle} />
      </div>
    );

    if (compact) return bar;

    return (
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="eyebrow">{label}</span>
          <span className="num-display text-sm">{clampedValue.toFixed(1)}%</span>
        </div>
        {bar}
      </div>
    );
  },
);

export default UsageBar;
