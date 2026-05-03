import { useTranslation } from "react-i18next";
import React, { useEffect, Suspense } from "react";
const NodeDisplay = React.lazy(() => import("../components/NodeDisplay"));
import { formatBytes } from "@/utils/unitHelper";
import { useLiveData } from "../contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import {
  SummaryCardSkeleton,
  NodeListSkeleton,
} from "@/components/Skeletons";

// Intelligent speed formatting function
const formatSpeed = (bytes: number): string => {
  if (bytes === 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  // Adaptive decimal places
  let decimals = 2;
  if (i >= 3) decimals = 1; // GB and above: 1 decimal
  if (i <= 1) decimals = 0; // B and KB: no decimals
  if (size >= 100) decimals = 0; // 100+ of any unit: no decimals

  return `${size.toFixed(decimals)} ${units[i]}`;
};

const Index = () => {
  const InnerLayout = () => {
    const [t] = useTranslation();
    const { live_data } = useLiveData();
    //#region 节点数据
    const { nodeList, isLoading, error, refresh } = useNodeList();

    // 顶部 4 个状态: 在线 / 地区 / 总流量 / 实时网速 (Time 已移除, 在 ticker 中无意义)
    const statusCards = [
      {
        key: "currentOnline",
        title: t("current_online"),
        getValue: () =>
          `${live_data?.data?.online.length ?? 0} / ${nodeList?.length ?? 0}`,
      },
      {
        key: "regionOverview",
        title: t("region_overview"),
        getValue: () =>
          nodeList
            ? Object.entries(
                nodeList.reduce(
                  (acc, item) => {
                    if (live_data?.data.online.includes(item.uuid)) {
                      acc[item.region] = (acc[item.region] || 0) + 1;
                    }
                    return acc;
                  },
                  {} as Record<string, number>,
                ),
              ).length
            : 0,
      },
      {
        key: "trafficOverview",
        title: t("traffic_overview"),
        // ↑↓ 之间用 nbsp 拼接, 防止浏览器在普通空格处断行
        getValue: () => {
          const data = live_data?.data?.data;
          const online = live_data?.data?.online;
          const fmt = (up: number, down: number) =>
            `↑ ${formatBytes(up)}  ↓ ${formatBytes(down)}`;
          if (!data || !online) return fmt(0, 0);
          const onlineSet = new Set(online);
          const values = Object.entries(data)
            .filter(([uuid]) => onlineSet.has(uuid))
            .map(([, node]) => node);
          const up = values.reduce(
            (acc, node) => acc + (node.network.totalUp || 0),
            0,
          );
          const down = values.reduce(
            (acc, node) => acc + (node.network.totalDown || 0),
            0,
          );
          return fmt(up, down);
        },
      },
      {
        key: "networkSpeed",
        title: t("network_speed"),
        getValue: () => {
          const data = live_data?.data?.data;
          const online = live_data?.data?.online;
          const fmt = (up: number, down: number) =>
            `↑ ${formatSpeed(up)}  ↓ ${formatSpeed(down)}`;
          if (!data || !online) return fmt(0, 0);
          const onlineSet = new Set(online);
          const values = Object.entries(data)
            .filter(([uuid]) => onlineSet.has(uuid))
            .map(([, node]) => node);
          const up = values.reduce(
            (acc, node) => acc + (node.network.up || 0),
            0,
          );
          const down = values.reduce(
            (acc, node) => acc + (node.network.down || 0),
            0,
          );
          return fmt(up, down);
        },
      },
    ];

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
        {/* 顶部 summary: 单行 ticker 风格, 像报纸页眉数据条
            - 整体 inline 横排, 项与项之间用细竖线分隔
            - 标签 + 数值紧贴, 字号小一档
            - 窄屏自动换行 (flex-wrap), 不强行挤
        */}
        <div className="summary-card paper-card no-tilt mt-4 px-4 py-2 relative overflow-x-auto scrollbar-hidden">
          {/* 强制单行: nowrap + 容器溢出横滚, 不再换行 */}
          <div className="flex items-baseline gap-x-4 text-sm leading-snug whitespace-nowrap">
            {statusCards.map((card, i) => (
              <TopStat
                key={card.key}
                title={card.title}
                value={card.getValue()}
                divider={i > 0}
              />
            ))}
          </div>
        </div>
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

type TopStatProps = {
  title: string;
  value: string | number;
  /** 是否在前面渲染分隔竖线 (除第一项以外都是 true) */
  divider?: boolean;
};

// 单行 inline 的 stat: 「LABEL value」紧贴, 项间靠 flex gap + 细竖线分隔
//  - LABEL: 衬线斜体小型大写 (eyebrow), 暗色一档
//  - value: mono tabular, 主文字色
const TopStat: React.FC<TopStatProps> = React.memo(
  ({ title, value, divider }) => {
    return (
      <div className="inline-flex items-baseline gap-3 whitespace-nowrap">
        {divider && (
          <span
            aria-hidden
            className="self-center inline-block h-3 w-px"
            style={{ background: "var(--ink-line-soft)" }}
          />
        )}
        <span className="eyebrow" style={{ fontSize: "0.66rem" }}>
          {title}
        </span>
        <span
          className="font-mono font-tabular"
          style={{
            color: "var(--ink)",
            fontWeight: 500,
            fontSize: "0.82rem",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </span>
      </div>
    );
  },
);

