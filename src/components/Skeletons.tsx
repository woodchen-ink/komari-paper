// 骨架屏组件: 替代加载转圈, 减少白屏闪烁感
// 结构尽量贴近真实组件, 让数据到位时无视觉跳变

// 单张汇总指标卡骨架: 顶部 label + icon, 中部大数值, 底部副信息
const SummaryStatSkeleton = () => (
  <div className="paper-card no-tilt p-3 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div className="skeleton h-2.5 w-12" />
      <div className="skeleton h-4 w-4 rounded-full" />
    </div>
    <div className="skeleton h-5 w-20" />
    <div className="skeleton h-3 w-24" />
  </div>
);

// 顶部汇总卡组骨架: 指标卡网格 + 地区概览条, 与 SummaryCards 同形
export const SummaryCardSkeleton = () => (
  <section className="summary-card mt-4">
    <div className="skeleton h-2.5 w-20 mb-3" />
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SummaryStatSkeleton key={i} />
      ))}
    </div>
    <div className="paper-card no-tilt mt-3 px-4 py-2.5">
      <div className="flex items-center gap-x-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="inline-flex items-center gap-2">
            <div className="skeleton h-4 w-6" />
            <div className="skeleton h-3 w-6" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

// 单张节点卡骨架: 顶部行 + 6 模块网格, 与真实 Node card 同形
export const NodeCardSkeleton = () => (
  <div className="paper-card w-full p-4">
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2">
        <div className="skeleton h-4 w-6" />
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="hidden sm:flex items-center gap-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-4 w-12" />
        <div className="skeleton h-3 w-16" />
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="p-2"
          style={{
            background: "var(--paper-cool)",
            border: "1px solid var(--ink-line-soft)",
            borderRadius: "2px",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-3 w-8" />
          </div>
          <div className="skeleton h-2 w-full mb-2" />
          <div className="skeleton h-3 w-3/4" />
        </div>
      ))}
    </div>

    <div className="mt-3 pt-2 flex items-center justify-between gap-2">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-3 w-28" />
    </div>
  </div>
);

// 节点列表骨架: N 张节点骨架按真实间距排列
export const NodeListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="w-full mt-4 flex flex-col" style={{ rowGap: "1rem" }}>
    {Array.from({ length: count }).map((_, i) => (
      <NodeCardSkeleton key={i} />
    ))}
  </div>
);

// 图表骨架: 给 LoadChart/PingChart 切换时间窗口 / 加载远程数据时使用
// 内部就是一块"图表区域"占位 + 几个图例点, 高度与真实图表一致 (h-64)
export const ChartSkeleton = ({ height = 256 }: { height?: number }) => (
  <div className="paper-card no-tilt w-full p-4 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-4 w-16" />
    </div>
    <div className="skeleton w-full" style={{ height }} />
    <div className="flex gap-3 flex-wrap">
      <div className="skeleton h-3 w-16" />
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-3 w-14" />
    </div>
  </div>
);

// 多块图表骨架(LoadChart 用): N 张并排
export const ChartGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div
    className="gap-2 grid w-full"
    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(288px, 1fr))" }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <ChartSkeleton key={i} height={180} />
    ))}
  </div>
);
