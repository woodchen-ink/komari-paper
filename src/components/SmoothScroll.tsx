import { useEffect } from "react";

// 鼠标滚轮平滑滚动: 把每个 notch 的离散位移用 rAF 缓动到目标位置.
// 只拦截鼠标滚轮 (deltaMode === DOM_DELTA_LINE 或 大 delta), 触控板/触屏放行 (它们本身高频且平滑).
export default function SmoothScroll() {
  useEffect(() => {
    // 触控设备: 用原生滚动 (触屏惯性比我们的缓动更自然)
    // 注意: 不判断 prefers-reduced-motion, 装了这个主题就是明确想要液态玻璃滚动效果
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    // 关掉浏览器自带的 smooth-scroll, 否则会和我们的 rAF 缓动叠加
    const html = document.documentElement;
    const prevScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";

    let targetY = window.scrollY;
    let currentY = window.scrollY;
    let rafId: number | null = null;
    let active = false;
    let suppressNextScroll = false;

    const tick = () => {
      const diff = targetY - currentY;
      if (Math.abs(diff) < 0.5) {
        currentY = targetY;
        suppressNextScroll = true;
        window.scrollTo(0, currentY);
        rafId = null;
        active = false;
        return;
      }
      // 缓动系数: 每帧追赶剩余距离的 8%, 单次滚轮约 ~500ms 才到位, 视觉上是"轻推一下慢慢挪"
      currentY += diff * 0.08;
      suppressNextScroll = true;
      window.scrollTo(0, currentY);
      rafId = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      // 仅处理纵向滚动
      if (e.deltaY === 0) return;
      // ctrl + 滚轮是浏览器缩放, 放行
      if (e.ctrlKey) return;
      // 触控板典型: deltaMode === 0 (像素) 且 |deltaY| 较小, 高频小步; 放行
      const isMouseWheel =
        e.deltaMode === 1 || // 行模式 = 鼠标滚轮
        Math.abs(e.deltaY) >= 50;
      if (!isMouseWheel) return;

      e.preventDefault();
      // 把单次 notch 推进幅度压到原生的 ~40%, 配合慢缓动让滚轮看起来是"轻推页面一点点下移"
      const SCROLL_GAIN = 0.4;
      const rawDelta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      const delta = rawDelta * SCROLL_GAIN;

      if (!active) {
        // 首次启动时, 把 currentY/targetY 同步到真实滚动位置 (用户可能拖过滚动条)
        currentY = window.scrollY;
        targetY = window.scrollY;
        active = true;
      }
      const maxY =
        document.documentElement.scrollHeight - window.innerHeight;
      targetY = Math.max(0, Math.min(maxY, targetY + delta));

      if (rafId === null) rafId = requestAnimationFrame(tick);
    };

    // 用户拖动滚动条 / 键盘 PageDown 时同步, 避免下次滚轮跳回旧位置.
    // 我们自己 scrollTo 触发的 scroll 事件要忽略, 否则会把 targetY 拉回当前位置, 缓动失效.
    const onScroll = () => {
      if (suppressNextScroll) {
        suppressNextScroll = false;
        return;
      }
      if (!active) {
        targetY = window.scrollY;
        currentY = window.scrollY;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      html.style.scrollBehavior = prevScrollBehavior;
    };
  }, []);

  return null;
}
