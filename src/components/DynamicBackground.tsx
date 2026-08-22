import { useIsMobile } from "@/hooks/use-mobile";
import { usePublicInfo } from "@/contexts/PublicInfoContext";

// 纸面背景层 (Editorial Paper)
// 纸色由 global.css 的 html 提供; 这里铺三样东西, 都是 fixed + -z-10, 按 DOM 顺序叠:
//   1) 用户自定义背景图: 半透明 sepia 叠层, 像夹在书里的旧照片
//   2) 纸纹: feTurbulence 噪点 + multiply, 盖在照片之上, 让整张纸面质感统一
// 纸纹画在真实元素而不是 body 背景 —— 后者在本应用结构里不显示 (排查无果), 元素则稳定可见。
// 前提: body 必须保持 background-color: transparent, 否则会盖住这些负 z-index 层。
const PAPER_NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16   0 0 0 0 0.14   0 0 0 0 0.12   0 0 0 0.32 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")";

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
          aria-hidden
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: `url(${themedBg})`,
            opacity: 0.14,
            filter: "sepia(0.6) saturate(0.6) contrast(0.92)",
            mixBlendMode: "multiply",
          }}
        />
      )}

      {/* 纸纹: 200px 平铺噪点, multiply 让它像渗进纸里而不是浮在上面。
          浓淡改 SVG 里 feColorMatrix 的 alpha (0.32) 与 rect 的 opacity (0.55)。 */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage: PAPER_NOISE,
          backgroundSize: "200px 200px",
          mixBlendMode: "multiply",
        }}
      />
    </>
  );
}
