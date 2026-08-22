import * as React from "react";
import { Box } from "@radix-ui/themes";
import { resolveRegionCode, regionFlagSrc } from "@/utils/regionHelper";

interface FlagProps {
  flag: string; // 地区代码 (例如 "SG", "US") 或旗帜 emoji (例如 "🇸🇬", "🇺🇳")
  size?: string; // 可选的尺寸 prop，用于未来扩展
}

const Flag = React.memo(({ flag, size }: FlagProps) => {
  const code = resolveRegionCode(flag);
  const altText = `地区旗帜: ${code}`;

  return (
    <Box
      as="span"
      className={`m-2 self-center ${size ? `w-${size} h-${size}` : "w-6 h-6"}`}
      style={{ display: "inline-flex", alignItems: "center" }}
      aria-label={altText}
    >
      <img
        src={regionFlagSrc(code)}
        alt={altText}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </Box>
  );
});

// 确保 displayName 以便在 React DevTools 中识别
Flag.displayName = "Flag";

export default Flag;
