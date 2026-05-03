import { Flex, Text } from "@radix-ui/themes";
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
    const [currentTime, setCurrentTime] = React.useState(
      new Date().toLocaleTimeString(),
    );
    //document.title = t("home_title");
    //#region 节点数据
    const { nodeList, isLoading, error, refresh } = useNodeList();

    // 独立的时间更新定时器
    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date().toLocaleTimeString());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    // 顶部 5 个状态卡: 时间 / 在线数 / 地区数 / 总流量 / 实时网速
    const statusCards = [
      {
        key: "currentTime",
        title: t("current_time"),
        getValue: () => currentTime,
      },
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
        // 拆成两行 (上传 / 下载), 避免在窄 5 列布局下被挤换行
        getValue: () => {
          const data = live_data?.data?.data;
          const online = live_data?.data?.online;
          if (!data || !online) return "↑ 0 B\n↓ 0 B";
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
          return `↑ ${formatBytes(up)}\n↓ ${formatBytes(down)}`;
        },
      },
      {
        key: "networkSpeed",
        title: t("network_speed"),
        getValue: () => {
          const data = live_data?.data?.data;
          const online = live_data?.data?.online;
          if (!data || !online) return "↑ 0 B/s\n↓ 0 B/s";
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
          return `↑ ${formatSpeed(up)}\n↓ ${formatSpeed(down)}`;
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
        {/* 顶部 summary: 不旋转, 内置极细分隔线像杂志 stat block */}
        <div className="summary-card paper-card no-tilt p-6 mt-4 relative">
          <div className="eyebrow mb-4">Status · Overview</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-4 divide-x divide-[var(--ink-line-soft)]">
            {statusCards.map((card, i) => (
              <TopCard
                key={card.key}
                title={card.title}
                value={card.getValue()}
                noBorder={i === 0}
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

type TopCardProps = {
  title: string;
  value: string | number;
  description?: string;
  noBorder?: boolean;
};

// 仪表盘顶部小数据块:
//  - 标签 = eyebrow (衬线斜体小型大写, 杂志栏目名感)
//  - 数值 = Fraunces 大号粗体 + tabular nums (印刷数字感)
const TopCard: React.FC<TopCardProps> = React.memo(
  ({ title, value, description, noBorder }) => {
    return (
      <div
        className={`min-w-0 w-full ${noBorder ? "first:pl-0" : "pl-6"}`}
      >
        <Flex direction="column" gap="2">
          <span className="eyebrow">{title}</span>
          {/* whitespace-pre-line: 让数据中的 \n 渲染成真正换行 (Traffic / Network Speed 用)
              tight leading + 略小 font-size: 即使是单行数字也不会被挤换行 */}
          <span
            className="font-tabular whitespace-pre-line leading-tight break-keep"
            style={{
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(0.95rem, 1.6vw, 1.2rem)",
              fontVariationSettings: '"opsz" 144',
              letterSpacing: "-0.02em",
            }}
          >
            {value}
          </span>
          {description && (
            <Text size="1" style={{ color: "var(--ink-mute)" }}>
              {description}
            </Text>
          )}
        </Flex>
      </div>
    );
  },
);

