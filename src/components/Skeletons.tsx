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

// 单张便签卡骨架: 头 + 资源 2×2 块 + 网络/健康两列 + 脚注 + 价格, 与真实 Node card 同形
export const NodeCardSkeleton = () => (
  <div className="paper-card w-full p-3 flex flex-col gap-2.5">
    {/* 头: 旗 + 名 + 分组 */}
    <div className="flex items-center gap-2">
      <div className="skeleton h-4 w-6" />
      <div className="skeleton h-4 w-32 flex-1 max-w-40" />
      <div className="skeleton h-4 w-10" />
    </div>

    {/* 资源 2×2 凹陷数据块 */}
    <div
      className="grid grid-cols-2 gap-x-3 gap-y-2.5"
      style={{
        background: "var(--paper-cool)",
        border: "1px solid var(--ink-line-soft)",
        borderRadius: "2px",
        padding: "0.625rem 0.75rem",
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <div className="skeleton h-2.5 w-10" />
            <div className="skeleton h-3 w-8" />
          </div>
          <div className="skeleton h-1.25 w-full" />
          <div className="skeleton h-2.5 w-3/4 mt-1" />
        </div>
      ))}
    </div>

    {/* 网络 2 列 */}
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i}>
          <div className="skeleton h-2.5 w-10 mb-1" />
          <div className="skeleton h-3 w-4/5" />
        </div>
      ))}
    </div>

    {/* 健康 2 列: 标签行 + 柱图 */}
    <div className="grid grid-cols-2 gap-x-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <div className="skeleton h-2.5 w-12" />
            <div className="skeleton h-3 w-10" />
          </div>
          <div className="skeleton h-6 w-full" />
        </div>
      ))}
    </div>

    {/* 脚注 2 行 */}
    <div
      className="flex flex-col gap-1 pt-1.5"
      style={{ borderTop: "1px solid var(--ink-line-soft)" }}
    >
      <div className="skeleton h-2.5 w-2/3" />
      <div className="skeleton h-2.5 w-3/4" />
    </div>

    {/* 价格 2 列 */}
    <div className="grid grid-cols-2 gap-1 mt-auto pt-1">
      <div className="skeleton h-5 w-full" />
      <div className="skeleton h-5 w-full" />
    </div>
  </div>
);

// 节点列表骨架: N 张便签骨架按真实网格排列 (手机 1 / 平板 2 / 笔记本 3 / 大屏 4 列)
export const NodeListSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="w-full mt-4 grid items-stretch gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
