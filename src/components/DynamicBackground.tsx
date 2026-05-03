import { useIsMobile } from "@/hooks/use-mobile";
import { usePublicInfo } from "@/contexts/PublicInfoContext";

// Editorial Paper 主题的背景装饰层
// - 主纸张色 + 纸纤维噪点已由 global.css body 渲染, 这里不再重复
// - 仅做两件事:
//   1) 用户自定义背景图: 半透明 sepia 叠层, 像夹在书里的旧照片
//   2) 极淡 vignette, 让边缘自然回收
export default function DynamicBackground() {
  const { publicInfo } = usePublicInfo();
  const isMobile = useIsMobile();

  const desktopBg = publicInfo?.theme_settings?.backgroundImageUrlDesktop;
  const mobileBg = publicInfo?.theme_settings?.backgroundImageUrlMobile;
  const themedBg = isMobile ? mobileBg || desktopBg : desktopBg;

  return (
    <>
      {themedBg && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${themedBg})`,
            opacity: 0.14,
            filter: "sepia(0.6) saturate(0.6) contrast(0.92)",
            mixBlendMode: "multiply",
          }}
        />
      )}

      {/* 极淡 vignette: 四角微微回收, 不抢主纸面 */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 65%, rgba(60, 45, 25, 0.10) 100%)",
        }}
      />
    </>
  );
}
