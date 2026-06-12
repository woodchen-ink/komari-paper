import React, { useEffect, Suspense } from "react";
const NodeDisplay = React.lazy(() => import("../components/NodeDisplay"));
import { useLiveData } from "../contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import {
  SummaryCardSkeleton,
  NodeListSkeleton,
} from "@/components/Skeletons";
import SummaryCards from "@/components/SummaryCards";

const Index = () => {
  const InnerLayout = () => {
    const { live_data } = useLiveData();
    //#region 节点数据
    const { nodeList, isLoading, error, refresh } = useNodeList();

    useEffect(() => {
      const interval = setInterval(() => {
        refresh();
      }, 5000);
      return () => clearInterval(interval);
    }, [nodeList]);

    // 渐进加载: 首次加载时直接渲染骨架壳, 数据到位后无缝替换为真组件, 避免白屏闪烁
    if (error) {
      return <div className="text-red-400 mt-4 px-2">Error: {error}</div>;
    }

    // 节点列表未到位前: summary 卡 + 节点列表都用骨架
    if (isLoading || !nodeList) {
      return (
        <div className="w-full max-w-5xl mx-auto">
          <SummaryCardSkeleton />
          <NodeListSkeleton count={4} />
        </div>
      );
    }

    //#endregion

    return (
      <div className="w-full max-w-5xl mx-auto">
        {/* 顶部汇总卡组: 在线 / 内存 / 磁盘 / 总流量 / 网速 / 财务 + 地区概览条 */}
        <SummaryCards nodes={nodeList ?? []} liveData={live_data?.data} />
        <Suspense fallback={<NodeListSkeleton count={4} />}>
          <NodeDisplay
            nodes={nodeList ?? []}
            liveData={live_data?.data ?? { online: [], data: {} }}
          />
        </Suspense>
      </div>
    );
  };
  return <InnerLayout />;
};

export default Index;
