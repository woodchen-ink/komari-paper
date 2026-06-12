import { useEffect, useState } from "react";
import { useLiveData } from "../../contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import type { Record } from "../../types/LiveData";
import Flag from "../../components/Flag";
import { SegmentedControl } from "@radix-ui/themes";
import { useNodeList } from "@/contexts/NodeListContext";
import { liveDataToRecords } from "@/utils/RecordHelper";
import LoadChart from "./LoadChart";
import PingChart from "./PingChart";
import { DetailsGrid } from "@/components/DetailsGrid";
import SplitText from "@/components/SplitText";

interface InstanceDetailProps {
  uuid: string;
}

/**
 * 单节点详情内容 (供弹窗复用).
 *
 * 职责: 拉取 recent 历史 + 订阅实时增量, 渲染头卡 / 指标网格 / Load·Ping 图表.
 * 不含页面级布局 (高度锁定 / 侧栏 / 内部滚动) —— 这些由承载它的弹窗外壳负责.
 */
export default function InstanceDetail({ uuid }: InstanceDetailProps) {
  const { t } = useTranslation();
  const { onRefresh } = useLiveData();
  const [recent, setRecent] = useState<Record[]>([]);
  const { nodeList } = useNodeList();
  const length = 30 * 5;
  const [chartView, setChartView] = useState<"load" | "ping">("load");
  const node = nodeList?.find((n) => n.uuid === uuid);

  // 初始历史数据
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

  // 实时增量追加
  useEffect(() => {
    const unsubscribe = onRefresh((resp) => {
      if (!uuid) return;
      const data = resp.data.data[uuid];
      if (!data) return;

      setRecent((prev) => {
        const newRecord: Record = data;
        const exists = prev.some(
          (item) => item.updated_at === newRecord.updated_at,
        );
        if (exists) return prev;
        return [...prev, newRecord].slice(-length);
      });
    });
    return unsubscribe;
  }, [onRefresh, uuid]);

  return (
    <div className="instance-page flex flex-col items-center gap-3">
      <div className="paper-card no-tilt w-full flex flex-col gap-3 p-6">
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
      {chartView === "load" ? (
        <LoadChart data={liveDataToRecords(uuid ?? "", recent)} />
      ) : (
        <PingChart uuid={uuid ?? ""} />
      )}
    </div>
  );
}
