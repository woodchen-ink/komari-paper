import { useEffect, useRef, useState } from "react";

// 数字滚动: rAF 驱动 + ease-out, 模仿"翻页报表"的统计感
// 用法: <CountUp value={123} /> 或 <CountUp value="3 / 10" />
// 仅整数部分滚动; 非数字字符 (空格 / / + 单位 + 箭头) 原样穿过
// value 变化时从旧值过渡到新值; 首次挂载从 0 起跳
// 故意不响应 prefers-reduced-motion: 600ms 单次小幅滚动属于品牌节奏, 不是干扰性动画
type CountUpProps = {
  value: number | string;
  /** 动画时长 ms, 默认 600 */
  duration?: number;
  className?: string;
};

// 提取字符串里的第一段整数部分; 没有数字时返回 null
const splitNumber = (
  raw: string,
): { prefix: string; num: number; suffix: string } | null => {
  const match = raw.match(/^(.*?)(-?\d+)(.*)$/);
  if (!match) return null;
  return { prefix: match[1], num: parseInt(match[2], 10), suffix: match[3] };
};

const CountUp = ({ value, duration = 600, className }: CountUpProps) => {
  const raw = String(value);
  const parsed = splitNumber(raw);
  const target = parsed?.num ?? 0;
  const [display, setDisplay] = useState<number>(parsed ? 0 : target);
  // currentRef: 始终跟随最新 display, 用于动画被打断时把"当前帧"作为下次起点
  const currentRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!parsed) {
      setDisplay(target);
      currentRef.current = target;
      return;
    }
    const from = currentRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(from + (target - from) * eased);
      currentRef.current = cur;
      setDisplay(cur);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // 仅在 target / duration 变化时重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  if (!parsed) {
    return <span className={className}>{raw}</span>;
  }
  return (
    <span className={className}>
      {parsed.prefix}
      {display}
      {parsed.suffix}
    </span>
  );
};

export default CountUp;
