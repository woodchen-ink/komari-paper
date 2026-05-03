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

    // 阈值色: 红 (危险) / 橙 (警示) / 默认墨色 (正常, 不抢眼)
    const getColor = (val: number) => {
      if (val >= 80) return "var(--pen-red)";
      if (val >= 60) return "var(--pen-amber)";
      return "var(--ink)";
    };
    const barColor = getColor(clampedValue);
    const trackBg = "rgba(42, 38, 34, 0.10)";

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
          <div
            style={{
              height: "100%",
              backgroundColor: barColor,
              borderRadius: 0,
              width: `${clampedValue}%`,
              transition: "width 0.5s ease-out",
            }}
          />
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
