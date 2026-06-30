import { useTranslation } from "react-i18next";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { formatUptime } from "./Node";
import { formatBytes } from "@/utils/unitHelper";
import { computeTrafficUsage } from "@/utils/trafficHelper";
import UsageBar from "./UsageBar";

type DetailsGridProps = {
  uuid: string;
  gap?: string;
  align?: "start" | "center" | "end";
};

/**
 * 数据块外壳: 每个指标自成一格 (冷调副纸凹陷 + 软描边),
 * 用底色+边框做卡间分隔, 取代原先"裸格子靠间距区分"的弱层次
 */
function MetricBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="node-metric-block flex flex-col gap-1 min-w-0 px-2.5! py-2!">
      {children}
    </div>
  );
}

/**
 * 带进度条指标 (CPU/RAM/DISK/SWAP/GPU):
 * 标签 → 满宽进度条 (视觉锚) → 百分比(主) + 已用/总量(弱) 同基线一行
 * 进度条承担信息量, 不再是 sub 上方那条被压扁的细槽
 */
function BarCell({
  label,
  percent,
  detail,
}: {
  label: string;
  percent: number;
  detail?: string;
}) {
  return (
    <MetricBox>
      <span className="eyebrow truncate">{label}</span>
      <UsageBar value={percent} label="" compact />
      <div className="flex items-baseline justify-between gap-2 min-w-0">
        <span className="font-mono font-tabular font-semibold text-sm shrink-0">
          {percent.toFixed(1)}%
        </span>
        <span
          className="font-mono text-[11px] truncate text-right"
          style={{ color: "var(--ink-mute)" }}
          title={detail}
        >
          {detail ?? ""}
        </span>
      </div>
    </MetricBox>
  );
}

/**
 * 上下行对称指标 (网速 / 总流量):
 * ↑ 与 ↓ 等权, 同一行横排放下 (标签一行 + 内容一行, 共两行)
 */
function DualCell({
  label,
  up,
  down,
}: {
  label: string;
  up: string;
  down: string;
}) {
  return (
    <MetricBox>
      <span className="eyebrow truncate">{label}</span>
      <div className="flex items-baseline gap-3 font-mono font-tabular font-semibold text-sm min-w-0">
        <span className="flex items-baseline gap-1 min-w-0 truncate">
          <span className="text-xs shrink-0" style={{ color: "var(--ink-mute)" }}>
            ↑
          </span>
          {up}
        </span>
        <span className="flex items-baseline gap-1 min-w-0 truncate">
          <span className="text-xs shrink-0" style={{ color: "var(--ink-mute)" }}>
            ↓
          </span>
          {down}
        </span>
      </div>
    </MetricBox>
  );
}

/**
 * 纯标量指标 (负载 / 连接·进程 / 在线时长):
 * 标签一行 + 内容一行 (共两行); 主值与补充说明同一行横排, 不竖向铺三段
 */
function StatCell({
  label,
  value,
  sub,
  bar,
}: {
  label: string;
  value: string;
  sub?: string;
  // 可选进度条 (负载折算百分比用); 不传则退化为纯标量格
  bar?: number;
}) {
  return (
    <MetricBox>
      <span className="eyebrow truncate">{label}</span>
      {bar !== undefined && <UsageBar value={bar} label="" compact />}
      <div className="flex items-baseline gap-2 min-w-0">
        <span
          className="font-mono font-tabular font-semibold text-sm shrink-0"
          title={value}
        >
          {value}
        </span>
        {sub && (
          <span
            className="font-mono text-[11px] truncate"
            style={{ color: "var(--ink-mute)" }}
            title={sub}
          >
            {sub}
          </span>
        )}
      </div>
    </MetricBox>
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
  // 负载基准: load1 相对 CPU 核心数 (100% 表示满载)
  // loadRatio 不封顶用于文字, loadPercent 封顶后仅用于进度条
  const loadRatio =
    node?.cpu_cores && live ? (live.load.load1 / node.cpu_cores) * 100 : 0;
  const loadPercent = Math.min(loadRatio, 100);

  // 流量用量: 有限额时按 type 折成已用/限额比例, 无限额退回累计总量展示
  const traffic = computeTrafficUsage(
    node,
    live?.network.totalUp ?? 0,
    live?.network.totalDown ?? 0,
  );

  const gpus = live?.gpu?.detailed_info ?? [];

  return (
    <div className="DetailsGrid w-full flex flex-col gap-2">
      {/* 实时指标 */}
      <div>
        <div className="eyebrow mb-1.5" style={{ color: "var(--ink-mute)" }}>
          Live
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          <BarCell
            label={t("nodeCard.cpu")}
            percent={live?.cpu.usage ?? 0}
          />
          <BarCell
            label={t("nodeCard.ram")}
            percent={memPercent}
            detail={
              node?.mem_total
                ? `${formatBytes(live?.ram.used ?? 0)} / ${formatBytes(node.mem_total)}`
                : undefined
            }
          />
          <BarCell
            label={t("nodeCard.disk")}
            percent={diskPercent}
            detail={
              node?.disk_total
                ? `${formatBytes(live?.disk.used ?? 0)} / ${formatBytes(node.disk_total)}`
                : undefined
            }
          />
          <BarCell
            label={t("nodeCard.swap")}
            percent={swapPercent}
            detail={
              node?.swap_total
                ? `${formatBytes(live?.swap.used ?? 0)} / ${formatBytes(node.swap_total)}`
                : "-"
            }
          />
          <DualCell
            label={t("nodeCard.networkSpeed")}
            up={`${formatBytes(live?.network.up ?? 0)}/s`}
            down={`${formatBytes(live?.network.down ?? 0)}/s`}
          />
          {traffic.hasLimit ? (
            <BarCell
              label={t("nodeCard.totalTraffic")}
              percent={traffic.percent}
              detail={`${formatBytes(traffic.used)} / ${formatBytes(traffic.limit)}`}
            />
          ) : (
            <DualCell
              label={t("nodeCard.totalTraffic")}
              up={formatBytes(live?.network.totalUp ?? 0)}
              down={formatBytes(live?.network.totalDown ?? 0)}
            />
          )}
          <StatCell
            label={t("nodeCard.load")}
            value={(live?.load.load1 ?? 0).toFixed(2)}
            bar={loadPercent}
            sub={`${loadRatio.toFixed(0)}% · ${(live?.load.load5 ?? 0).toFixed(2)} / ${(live?.load.load15 ?? 0).toFixed(2)}`}
          />
          <StatCell
            label="Conn / Proc"
            value={`${live?.connections.tcp ?? 0} · ${live?.connections.udp ?? 0}`}
            sub={`TCP·UDP · ${live?.process ?? 0} proc`}
          />
          <StatCell
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {gpus.map((gpu, idx) => {
              const gMemPercent =
                gpu.memory_total > 0
                  ? (gpu.memory_used / gpu.memory_total) * 100
                  : 0;
              return (
                <BarCell
                  key={`gpu-${idx}`}
                  label={`${gpu.name || "GPU"}${gpus.length > 1 ? ` #${idx + 1}` : ""}`}
                  percent={gpu.utilization}
                  detail={`${gpu.memory_total > 0 ? `${formatBytes(gpu.memory_used)} / ${formatBytes(gpu.memory_total)} (${gMemPercent.toFixed(0)}%)` : "-"} · ${gpu.temperature > 0 ? `${gpu.temperature.toFixed(0)}°C` : "-"}`}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-2">
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
