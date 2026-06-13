import {
  SummaryCardSkeleton,
  NodeListSkeleton,
} from "./Skeletons";

// 全局根 Suspense 的 fallback: 在路由 chunk / 数据 provider 挂起时,
// 直接渲染一个"形似主页"的骨架壳, 避免出现独立的转圈 Loading 与真实布局之间的跳变.
//
// 注意: 此组件在 NavBar / DynamicBackground 等 _layout 资源就绪之前可能就被渲染,
// 所以不依赖 layout 提供的容器, 自己包一层 max-w-384 + px 与正式 layout 一致.
export default function PageSkeleton() {
  return (
    <div className="w-full min-h-screen relative">
      {/* 简化版顶栏占位: 不依赖 NavBar (NavBar 也可能在路由 chunk 内) */}
      <div className="w-full max-w-384 mx-auto px-3 md:px-4 pt-4">
        <div className="flex items-center justify-between max-h-16 p-2 px-4">
          <div className="skeleton h-7 w-40" />
          <div className="flex items-center gap-2">
            <div className="skeleton h-8 w-8 rounded-full" />
            <div className="skeleton h-8 w-16 rounded-full" />
          </div>
        </div>

        <SummaryCardSkeleton />
        <NodeListSkeleton count={8} />
      </div>
    </div>
  );
}
