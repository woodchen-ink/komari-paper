import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveData } from "../../contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import type { Record } from "../../types/LiveData";
import Flag from "../../components/Flag";
import { Flex, SegmentedControl } from "@radix-ui/themes";
import { useNodeList } from "@/contexts/NodeListContext";
import { liveDataToRecords } from "@/utils/RecordHelper";
import LoadChart from "./LoadChart";
import PingChart from "./PingChart";
import { DetailsGrid } from "@/components/DetailsGrid";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useIsMobile } from "@/hooks/use-mobile";
import SplitText from "@/components/SplitText";

export default function InstancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { onRefresh, live_data } = useLiveData();
  const { uuid } = useParams<{ uuid: string }>();
  const [recent, setRecent] = useState<Record[]>([]);
  const { nodeList } = useNodeList();
  const length = 30 * 5;
  const [chartView, setChartView] = useState<"load" | "ping">("load");
  // #region 初始数据加载
  const node = nodeList?.find((n) => n.uuid === uuid);
  const { publicInfo } = usePublicInfo();
  const isMobile = useIsMobile();
  const showServerListInDetails =
    publicInfo?.theme_settings?.showServerListInDetails === true;
  const offlineServerPosition =
    publicInfo?.theme_settings?.offlineServerPosition;

  // 组织按分组的服务器列表
  const groupedNodes = useMemo(() => {
    if (!nodeList) return [];

    const onlineNodes = live_data?.data?.online ?? [];
    const sortNodes = (
      a: (typeof nodeList)[number],
      b: (typeof nodeList)[number],
    ) => {
      const aIsOnline = onlineNodes.includes(a.uuid);
      const bIsOnline = onlineNodes.includes(b.uuid);

      if (offlineServerPosition === "First") {
        if (!aIsOnline && bIsOnline) return -1;
        if (aIsOnline && !bIsOnline) return 1;
      } else if (offlineServerPosition === "Keep") {
      } else {
        if (aIsOnline && !bIsOnline) return -1;
        if (!aIsOnline && bIsOnline) return 1;
      }

      return a.weight - b.weight;
    };

    const groups = new Map<string | null, typeof nodeList>();

    nodeList.forEach((node) => {
      const groupKey = node.group && node.group.trim() ? node.group : null;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)?.push(node);
    });

    // 转换为数组，其中未分组的排在最后
    const result: Array<{ group: string | null; nodes: typeof nodeList }> = [];

    // 先添加有分组的（按分组名称排序）
    Array.from(groups.entries())
      .filter(([group]) => group !== null)
      .sort(([a], [b]) => (a ?? "").localeCompare(b ?? ""))
      .forEach(([group, nodes]) => {
        result.push({
          group,
          nodes: [...nodes].sort(sortNodes),
        });
      });

    // 再添加未分组的
    const ungrouped = groups.get(null);
    if (ungrouped) {
      result.push({
        group: null,
        nodes: [...ungrouped].sort(sortNodes),
      });
    }

    return result;
  }, [nodeList, live_data, offlineServerPosition]);

  useEffect(() => {
    if (!uuid) {
      setRecent([]);
      return;
    }

    const controller = new AbortController();
    setRecent([]);

    fetch(`/api/recent/${uuid}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          setRecent((data?.data ?? []).slice(-length));
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch recent data:", err);
        }
      });

    return () => controller.abort();
  }, [uuid, length]);
  // 动态追加数据
  useEffect(() => {
    const unsubscribe = onRefresh((resp) => {
      if (!uuid) return;
      const data = resp.data.data[uuid];
      if (!data) return;

      setRecent((prev) => {
        const newRecord: Record = data;
        // 追加新数据，限制总长度为length（FIFO）
        // 检查是否已存在相同时间戳的记录
        const exists = prev.some(
          (item) => item.updated_at === newRecord.updated_at,
        );
        if (exists) {
          return prev; // 如果已存在，不添加新记录
        }

        // 否则，追加新记录
        const updated = [...prev, newRecord].slice(-length);
        return updated;
      });
    });

    // 清理订阅
    return unsubscribe;
  }, [onRefresh, uuid]);
  // #region 布局
  // 整页不滚动: 容器高度 = viewport - NavBar 占位; 左右两栏各自内部滚动.
  return (
    <div
      className="instance-page w-full max-w-[1600px] mx-auto flex flex-row gap-4 px-1 md:px-2"
      style={{ height: "calc(100vh - 5rem)" }}
    >
      {showServerListInDetails && !isMobile && (
        <div className="w-[280px] shrink-0 h-full">
          {/* 侧边: 像活页夹小笔记本, 顶端写 "Servers", 内部按分组手写章节 */}
          <div className="paper-card no-tilt w-full h-full overflow-hidden">
            <Flex direction="column" gap="0" className="h-full min-h-0">
              <div className="px-4 py-2.5 shrink-0 border-b border-[var(--ink-line-soft)]">
                <div className="eyebrow">Index</div>
                <h2
                  className="mt-0.5 text-base"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Servers
                </h2>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-1">
                {groupedNodes.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div
                      className="eyebrow px-3 pt-2 pb-1 sticky top-0 z-10"
                      style={{
                        background: "var(--paper-cool)",
                        borderBottom: "1px solid var(--ink-line-soft)",
                      }}
                    >
                      {group.group ?? "Ungrouped"}
                    </div>
                    <div>
                      {group.nodes.map((node) => (
                        <div
                          key={node.uuid}
                          onClick={() => navigate(`/instance/${node.uuid}`)}
                          className={`instance-sidebar-item mx-1 my-px px-2 py-1 cursor-pointer transition-colors text-sm flex items-center gap-2 ${
                            node.uuid === uuid ? "active font-semibold" : ""
                          }`}
                          style={{
                            borderLeft:
                              node.uuid === uuid
                                ? "3px solid var(--pen-red)"
                                : "3px solid transparent",
                          }}
                        >
                          <Flag flag={node.region} />
                          <span className="truncate">{node.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Flex>
          </div>
        </div>
      )}
      {/* 主区: 自身内部滚动, 顶部头卡 + tab + 图表区 */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto overscroll-contain pr-1">
        <div className="flex flex-col items-center gap-2.5 pb-3">
          <div className="paper-card no-tilt w-full flex flex-col gap-2 p-4">
            <div className="eyebrow">Server</div>
            <h1 className="flex items-baseline flex-wrap gap-3 m-0">
              <Flag flag={node?.region ?? ""} />
              <SplitText
                key={node?.name ?? uuid}
                text={node?.name ?? uuid ?? ""}
                step={40}
                duration={520}
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                  fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
                  lineHeight: 1.1,
                }}
              />
              <span
                className="font-mono"
                style={{
                  color: "var(--ink-mute)",
                  fontSize: "0.78rem",
                  letterSpacing: "-0.02em",
                }}
              >
                {node?.uuid}
              </span>
            </h1>
            <hr className="editorial-rule" />
            <DetailsGrid align="center" uuid={uuid ?? ""} />
          </div>
          <SegmentedControl.Root
            radius="full"
            value={chartView}
            onValueChange={(value) => setChartView(value as "load" | "ping")}
          >
            <SegmentedControl.Item value="load">
              {t("nodeCard.load")}
            </SegmentedControl.Item>
            <SegmentedControl.Item value="ping">
              {t("nodeCard.ping")}
            </SegmentedControl.Item>
          </SegmentedControl.Root>
          {/* Recharts */}
          {chartView === "load" ? (
            <LoadChart data={liveDataToRecords(uuid ?? "", recent)} />
          ) : (
            <PingChart uuid={uuid ?? ""} />
          )}
        </div>
      </div>
    </div>
  );
}
