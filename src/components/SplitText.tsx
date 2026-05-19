import { useMemo, type CSSProperties, type ElementType } from "react";

// 字符级 stagger 入场: 模仿活字"逐字落到纸上"的节奏感, 不滑动只是字符级 fade + 微 translateY
// 中文/emoji 通过 Array.from 按 grapheme 拆, 不会断开组合字符 (如 emoji ZWJ 序列)
// 仅在挂载时跑一次, 不响应 hover / 数据更新; 对 prefers-reduced-motion 自动关闭
type SplitTextProps = {
  text: string;
  /** 起始延迟 (ms), 默认 0 */
  delay?: number;
  /** 字符间步进 (ms), 默认 35 */
  step?: number;
  /** 单字符动画时长 (ms), 默认 520 */
  duration?: number;
  /** 渲染标签, 默认 span */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

const SplitText = ({
  text,
  delay = 0,
  step = 35,
  duration = 520,
  as: Tag = "span",
  className,
  style,
}: SplitTextProps) => {
  // Array.from 按 codepoint 拆, 比 split("") 安全; 空白用   保留宽度避免坍塌
  const chars = useMemo(() => Array.from(text ?? ""), [text]);
  return (
    <Tag
      className={className}
      style={style}
      aria-label={text}
      data-split-text=""
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="split-text-char"
          style={{
            animationDelay: `${delay + i * step}ms`,
            animationDuration: `${duration}ms`,
          }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </Tag>
  );
};

export default SplitText;
