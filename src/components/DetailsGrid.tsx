import { useTranslation } from "react-i18next";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { formatUptime } from "./Node";
import { formatBytes } from "@/utils/unitHelper";
import UsageBar from "./UsageBar";

type DetailsGridProps = {
  uuid: string;
  gap?: string;
  align?: "start" | "center" | "end";
};

/**
 * 单个实时指标格: 标签 + 值同行 + bar 槽 + sub 槽
 * bar / sub 即使为空也占固定高度, 保证同行各格等高、网格严格对齐
 */
function MetricCell({
  label,
  value,
  sub,
  percent,
}: {
  label: string;
  value: string;
  sub?: string;
  percent?: number;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1 min-w-0">
        <span className="eyebrow truncate">{label}</span>
        <span className="font-mono font-tabular font-semibold text-sm shrink-0">
          {value}
        </span>
      </div>
      {/* bar 槽: 固定高度, 无 percent 时空占位保持对齐 */}
      <div className="h-1.25 mt-1.5">
        {typeof percent === "number" && (
          <UsageBar value={percent} label="" compact />
        )}
      </div>
      {/* sub 槽: 固定一行高度 */}
      <div
        className="font-mono text-[11px] mt-1 h-3.5 truncate"
        style={{ color: "var(--ink-mute)" }}
      >
        {sub ?? ""}
      </div>
    </div>
  );
}

/** 静态规格格: 标签 + 值 (文字, 非数据); 长值 truncate + title 防止多行撑高错位 */
function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow truncate">{label}</div>
      <div
        className="text-sm mt-0.5 truncate"
        style={{ color: "var(--ink-soft)" }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * 单节点详情主信息区: 实时指标 + GPU + 静态规格三段
 * 卡片便签化后, 流量/连接/负载/swap/CPU 用量/内存磁盘明细/GPU 全部在此展示
 */
export const DetailsGrid = ({ uuid }: DetailsGridProps) => {
  const { t } = useTranslation();

  const { nodeList } = useNodeList();
  const { live_data } = useLiveData();
  const node = nodeList?.find((n) => n.uuid === uuid);
  const live = live_data?.data.data[uuid];

  const memPercent =
    node?.mem_total && live ? (live.ram.used / node.mem_total) * 100 : 0;
  const diskPercent =
    node?.disk_total && live ? (live.disk.used / node.disk_total) * 100 : 0;
  const swapPercent =
    node?.swap_total && live ? (live.swap.used / node.swap_total) * 100 : 0;

  const gpus = live?.gpu?.detailed_info ?? [];

  return (
    <div className="DetailsGrid w-full flex flex-col gap-3">
      {/* 实时指标 */}
      <div>
        <div className="eyebrow mb-1.5" style={{ color: "var(--ink-mute)" }}>
          Live
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-2.5">
          <MetricCell
            label={t("nodeCard.cpu")}
            value={`${(live?.cpu.usage ?? 0).toFixed(1)}%`}
            percent={live?.cpu.usage ?? 0}
          />
          <MetricCell
            label={t("nodeCard.ram")}
            value={`${memPercent.toFixed(1)}%`}
            sub={
              node?.mem_total
                ? `${formatBytes(live?.ram.used ?? 0)} / ${formatBytes(node.mem_total)}`
                : "-"
            }
            percent={memPercent}
          />
          <MetricCell
            label={t("nodeCard.disk")}
            value={`${diskPercent.toFixed(1)}%`}
            sub={
              node?.disk_total
                ? `${formatBytes(live?.disk.used ?? 0)} / ${formatBytes(node.disk_total)}`
                : "-"
            }
            percent={diskPercent}
          />
          {node?.swap_total ? (
            <MetricCell
              label={t("nodeCard.swap")}
              value={`${swapPercent.toFixed(1)}%`}
              sub={`${formatBytes(live?.swap.used ?? 0)} / ${formatBytes(node.swap_total)}`}
              percent={swapPercent}
            />
          ) : (
            <MetricCell label={t("nodeCard.swap")} value="-" />
          )}
          <MetricCell
            label={t("nodeCard.networkSpeed")}
            value={`↑ ${formatBytes(live?.network.up ?? 0)}/s`}
            sub={`↓ ${formatBytes(live?.network.down ?? 0)}/s`}
          />
          <MetricCell
            label={t("nodeCard.totalTraffic")}
            value={`↑ ${formatBytes(live?.network.totalUp ?? 0)}`}
            sub={`↓ ${formatBytes(live?.network.totalDown ?? 0)}`}
          />
          <MetricCell
            label={t("nodeCard.load")}
            value={(live?.load.load1 ?? 0).toFixed(2)}
            sub={`${(live?.load.load5 ?? 0).toFixed(2)} / ${(live?.load.load15 ?? 0).toFixed(2)}`}
          />
          <MetricCell
            label="Conn / Proc"
            value={`${live?.connections.tcp ?? 0} · ${live?.connections.udp ?? 0}`}
            sub={`TCP·UDP · ${live?.process ?? 0} proc`}
          />
          <MetricCell
            label={t("nodeCard.uptime")}
            value={live?.uptime ? formatUptime(live.uptime, t) : "-"}
          />
        </div>
      </div>

      {/* GPU (有才显示, 每块利用率 + 显存 + 温度) */}
      {gpus.length > 0 && (
        <div>
          <div className="eyebrow mb-1.5" style={{ color: "var(--ink-mute)" }}>
            GPU
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2.5">
            {gpus.map((gpu, idx) => {
              const gMemPercent =
                gpu.memory_total > 0
                  ? (gpu.memory_used / gpu.memory_total) * 100
                  : 0;
              return (
                <MetricCell
                  key={`gpu-${idx}`}
                  label={`${gpu.name || "GPU"}${gpus.length > 1 ? ` #${idx + 1}` : ""}`}
                  value={`${gpu.utilization.toFixed(1)}%`}
                  sub={`${gpu.memory_total > 0 ? `${formatBytes(gpu.memory_used)} / ${formatBytes(gpu.memory_total)} (${gMemPercent.toFixed(0)}%)` : "-"} · ${gpu.temperature > 0 ? `${gpu.temperature.toFixed(0)}°C` : "-"}`}
                  percent={gpu.utilization}
                />
              );
            })}
          </div>
        </div>
      )}

      <hr className="editorial-rule" />

      {/* 静态规格 */}
      <div>
        <div className="eyebrow mb-1.5" style={{ color: "var(--ink-mute)" }}>
          Spec
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-2.5">
          <SpecCell
            label={t("nodeCard.cpu")}
            value={`${node?.cpu_name ?? "Unknown"}${node?.cpu_cores ? ` (×${node.cpu_cores})` : ""}`}
          />
          <SpecCell label={t("nodeCard.arch")} value={node?.arch ?? "Unknown"} />
          <SpecCell
            label={t("nodeCard.virtualization")}
            value={node?.virtualization ?? "Unknown"}
          />
          <SpecCell label="GPU" value={node?.gpu_name ?? "Unknown"} />
          <SpecCell label={t("nodeCard.os")} value={node?.os ?? "Unknown"} />
          <SpecCell
            label={t("nodeCard.kernelVersion")}
            value={node?.kernel_version ?? "Unknown"}
          />
          <SpecCell
            label={t("nodeCard.last_updated")}
            value={
              node?.updated_at
                ? new Date(
                    live?.updated_at || node.updated_at,
                  ).toLocaleString()
                : "-"
            }
          />
        </div>
      </div>
    </div>
  );
};
