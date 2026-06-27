import { Box, Flex, Text } from "@radix-ui/themes";
import React from "react";

interface UsageBarProps {
  value: number; // Utilization percentage (0–100)
  label: string; // Label for the bar (e.g., "CPU", "Memory", "Disk")
  compact?: boolean; // Whether to show in compact mode (for tables)
  max?: number; // Maximum value for the bar (e.g., total RAM, total disk space)
}

const UsageBar = React.memo(
  ({ value, label, compact = false, max = 100 }: UsageBarProps) => {
    // Ensure value is between 0 and 100
    const clampedValue = Math.min(Math.max(value, 0), max);

    // 阈值色: 红 (危险≥80) / 赭黄 (警示≥60) / 苔绿 (正常)
    // 注: --pen-amber 等笔色已从主题删除, 改用现存数据色环 token, 否则未定义变量会回退成墨黑
    const getColor = (val: number) => {
      if (val >= 80) return "var(--pen-red)";
      if (val >= 60) return "var(--data-3)";
      return "var(--data-2)";
    };
    const barColor = getColor(clampedValue);
    const trackBg = "rgba(42, 38, 34, 0.10)";
    // 占比百分数 (相对轨道宽度)
    const fillPercent = (clampedValue / max) * 100;
    // 非零用量给 2px 最小可见宽度: 低值时彩条占比不足 1px 会肉眼不可见,
    // 叠加 width 过渡会出现"彩色填充消失一会儿"的观感, 用 min-width 兜底
    const fillStyle = {
      height: "100%",
      backgroundColor: barColor,
      borderRadius: 0,
      width: `${fillPercent}%`,
      minWidth: fillPercent > 0 ? "2px" : 0,
      transition: "width 0.35s ease-out",
    } as const;

    if (compact) {
      return (
        <Box
          style={{
            width: "100%",
            height: "4px",
            backgroundColor: trackBg,
            borderRadius: 0,
            overflow: "hidden",
          }}
        >
          <div style={fillStyle} />
        </Box>
      );
    }

    return (
      <Flex direction="column" gap="1" style={{ width: "100%" }}>
        <Flex justify="between" align="center">
          <Text
            size="1"
            style={{
              color: "var(--ink-mute)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </Text>
          <Text
            className="font-mono font-tabular"
            size="2"
            weight="medium"
            style={{ color: "var(--ink)" }}
          >
            {clampedValue.toFixed(1)}%
          </Text>
        </Flex>
        <Box
          style={{
            width: "100%",
            height: "5px",
            backgroundColor: trackBg,
            borderRadius: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: barColor,
              width: `${clampedValue}%`,
              transition: "width 0.5s ease-out",
            }}
          />
        </Box>
      </Flex>
    );
  },
);

export default UsageBar;
