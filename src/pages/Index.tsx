import React, { useEffect, useMemo, Suspense } from "react";
const NodeDisplay = React.lazy(() => import("../components/NodeDisplay"));
import { useLiveData } from "../contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import {
  SummaryCardSkeleton,
  NodeListSkeleton,
} from "@/components/Skeletons";
import SummaryCards from "@/components/SummaryCards";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { regionBucketsOf } from "@/utils/groupingHelper";

const Index = () => {
  const InnerLayout = () => {
    const { live_data } = useLiveData();
    //#region 节点数据
    const { nodeList, isLoading, error, refresh } = useNodeList();

    // 地区筛选状态提到本页: 概览条 (SummaryCards) 负责选, 节点列表 (NodeDisplay) 负责筛,
    // 两者必须共用同一个值 —— useLocalStorage 是各组件独立 state, 不跨组件同步
    const [selectedRegion, setSelectedRegion] = useLocalStorage<string>(
      "nodeSelectedRegion",
      "all",
    );
    const regions = useMemo(() => regionBucketsOf(nodeList ?? []), [nodeList]);
    // 选中地区可能因节点增删而消失; 派生成有效值, 避免筛出空列表
    const activeRegion = regions.some((r) => r.code === selectedRegion)
      ? selectedRegion
      : "all";

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
        <div className="w-full max-w-384 mx-auto pb-8">
          <SummaryCardSkeleton />
          <NodeListSkeleton count={8} />
        </div>
      );
    }

    //#endregion

    return (
      <div className="w-full max-w-384 mx-auto pb-8">
        {/* 顶部汇总卡组: 在线 / 内存 / 磁盘 / 总流量 / 网速 / 财务 + 地区概览条 */}
        <SummaryCards
          nodes={nodeList ?? []}
          liveData={live_data?.data}
          regions={regions}
          activeRegion={activeRegion}
          onSelectRegion={setSelectedRegion}
        />
        <Suspense fallback={<NodeListSkeleton count={8} />}>
          <NodeDisplay
            nodes={nodeList ?? []}
            liveData={live_data?.data ?? { online: [], data: {} }}
            activeRegion={activeRegion}
          />
        </Suspense>
      </div>
    );
  };
  return <InnerLayout />;
};

export default Index;
