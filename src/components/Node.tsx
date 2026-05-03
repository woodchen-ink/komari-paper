import React from "react";
import { Flex, Text } from "@radix-ui/themes";
import { Clock, Cpu, HardDrive, Activity, ArrowUp, BarChart3, Gpu } from "lucide-react";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { LiveData, Record } from "../types/LiveData";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { formatBytes } from "@/utils/unitHelper";
import { getOSImage, getOSName } from "@/utils";

import UsageBar from "./UsageBar";
import Flag from "./Flag";
import Tips from "./ui/tips";
import PriceTags from "./PriceTags";

/** 格式化秒 → "1d 2h" / "3h 4m" / "5m 6s" */
export function formatUptime(seconds: number, t: TFunction): string {
  if (!seconds || seconds < 0) return t("nodeCard.time_second", { val: 0 });
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} ${t("nodeCard.time_day")}`);
  if (h) parts.push(`${h} ${t("nodeCard.time_hour")}`);
  if (m) parts.push(`${m} ${t("nodeCard.time_minute")}`);
  if (s || parts.length === 0) parts.push(`${s} ${t("nodeCard.time_second")}`);
  return parts.join(" ");
}

/** 紧凑 uptime: 取最高两个非零量级, 例如 149d 15h / 3h 22m / 47m 19s */
function formatUptimeShort(seconds: number): string {
  if (!seconds || seconds < 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: Array<[number, string]> = [
    [d, "d"],
    [h, "h"],
    [m, "m"],
    [s, "s"],
  ];
  const filtered = parts.filter(([v]) => v > 0);
  const top2 = filtered.length ? filtered.slice(0, 2) : [[0, "s"] as [number, string]];
  return top2.map(([v, u]) => `${v}${u}`).join(" ");
}

/** 网络速率格式化（B/s 自适配） */
function formatSpeed(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  let decimals = 2;
  if (i >= 3) decimals = 1;
  if (i <= 1) decimals = 0;
  if (size >= 100) decimals = 0;
  return `${size.toFixed(decimals)} ${units[i]}`;
}

/** 计算流量在限额下的占比 */
function getTrafficPercentage(
  totalUp: number,
  totalDown: number,
  limit: number,
  type: "max" | "min" | "sum" | "up" | "down",
) {
  if (limit === 0) return 0;
  switch (type) {
    case "max":
      return (Math.max(totalUp, totalDown) / limit) * 100;
    case "min":
      return (Math.min(totalUp, totalDown) / limit) * 100;
    case "sum":
      return ((totalUp + totalDown) / limit) * 100;
    case "up":
      return (totalUp / limit) * 100;
    case "down":
      return (totalDown / limit) * 100;
    default:
      return 0;
  }
}

interface NodeProps {
  basic: NodeBasicInfo;
  live: Record | undefined;
  online: boolean;
}

const defaultLive: Record = {
  cpu: { usage: 0 },
  ram: { used: 0 },
  swap: { used: 0 },
  load: { load1: 0, load5: 0, load15: 0 },
  disk: { used: 0 },
  network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
  connections: { tcp: 0, udp: 0 },
  uptime: 0,
  process: 0,
  message: "",
  updated_at: "",
};

const Node = React.memo(({ basic, live, online }: NodeProps) => {
  const [t] = useTranslation();
  const { publicInfo } = usePublicInfo();

  const liveData = live || defaultLive;

  const cpuPercent = liveData.cpu?.usage ?? 0;
  const memoryUsagePercent = basic.mem_total
    ? (liveData.ram.used / basic.mem_total) * 100
    : 0;
  const diskUsagePercent = basic.disk_total
    ? (liveData.disk.used / basic.disk_total) * 100
    : 0;
  const swapPercent = basic.swap_total
    ? (liveData.swap.used / basic.swap_total) * 100
    : 0;

  const upSpeed = formatSpeed(liveData.network.up);
  const downSpeed = formatSpeed(liveData.network.down);
  const totalUpload = formatBytes(liveData.network.totalUp);
  const totalDownload = formatBytes(liveData.network.totalDown);

  const showIpTags = publicInfo?.theme_settings?.showIpTagsInCard;

  // 离线节点：精简卡片，红色脉冲点 + 关键标签
  if (!online) {
    return (
      <div
        id={basic.uuid}
        className="paper-card node-card cursor-pointer transition-all w-full"
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            {/* 离线指示: 红墨水点, 用 ink-pulse 做透明度脉冲 */}
            <span
              className="h-3 w-3 shrink-0 rounded-full pulse-animation"
              style={{ background: "var(--pen-red)" }}
            />
            <Flag flag={basic.region} />
            <Link
              to={`/instance/${basic.uuid}`}
              className="flex-1 min-w-0"
            >
              <h3
                className="text-base sm:text-lg truncate"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  fontVariationSettings: '"opsz" 48',
                }}
              >
                {basic.name}
              </h3>
            </Link>
            {basic.group && (
              // 离线分组: 红铅笔批注 (Caveat), 不加边框, 像在卡角随手写一笔
              <span
                className="text-base shrink-0 font-hand"
                style={{
                  color: "var(--pen-red)",
                  transform: "rotate(-3deg)",
                  display: "inline-block",
                }}
              >
                #{basic.group}
              </span>
            )}
          </div>
          <PriceTags
            price={basic.price}
            billing_cycle={basic.billing_cycle}
            expired_at={basic.expired_at}
            currency={basic.currency}
            tags={basic.tags}
            ip4={showIpTags ? basic.ipv4 : undefined}
            ip6={showIpTags ? basic.ipv6 : undefined}
          />
        </div>
      </div>
    );
  }

  // 在线节点：CZL 风格 6 大格子两行三列卡片，液态玻璃外壳
  return (
    <div
      id={basic.uuid}
      className="paper-card node-card cursor-pointer transition-all w-full"
    >
      <div className="p-4 relative">
        {/* 顶部：名称（左） · OS/arch/uptime（中） · 分组徽章 + 操作（右） */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <Flag flag={basic.region} />
            <Link to={`/instance/${basic.uuid}`} className="min-w-0">
              <h3
                className="text-base sm:text-lg truncate"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  fontVariationSettings: '"opsz" 48',
                }}
              >
                {basic.name}
              </h3>
            </Link>
          </div>

          {/* OS / arch / uptime —— 第一行右侧、分组徽章左边 */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground min-w-0 flex-1 justify-end overflow-hidden">
            <div className="hidden sm:flex items-center gap-1 min-w-0">
              <img
                src={getOSImage(basic.os)}
                alt={basic.os}
                className="w-3.5 h-3.5 shrink-0"
              />
              <span className="truncate">{getOSName(basic.os)}</span>
            </div>
            {basic.arch && (
              <div className="hidden sm:block rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground/70 shrink-0">
                {basic.arch}
              </div>
            )}
            {liveData.uptime > 0 && (
              <div className="hidden md:flex items-center gap-1 shrink-0">
                <Clock className="size-3" />
                <span className="truncate">{formatUptimeShort(liveData.uptime)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {basic.group && (
              // 分组: 像在卡角随手写的红铅笔批注, 不加边框
              <span
                className="text-base shrink-0 font-hand"
                style={{
                  color: "var(--pen-red)",
                  transform: "rotate(-2deg)",
                  display: "inline-block",
                }}
              >
                #{basic.group}
              </span>
            )}
            {liveData.message && <Tips color="var(--destructive)">{liveData.message}</Tips>}
          </div>
        </div>

        {/* 移动端 OS 信息（顶部太挤时另起一行） */}
        <div className="sm:hidden flex items-center gap-1.5 text-xs text-muted-foreground mb-2 flex-wrap">
          <img src={getOSImage(basic.os)} alt={basic.os} className="w-3.5 h-3.5" />
          <span className="truncate">{getOSName(basic.os)}</span>
          {basic.arch && (
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-foreground/70">
              {basic.arch}
            </span>
          )}
          {liveData.uptime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatUptime(liveData.uptime, t)}
            </span>
          )}
        </div>

        {/* 主体：6 格 2x3 网格（移动端 2 列 / 桌面 3 列） */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* 1. CPU */}
          <div className="bg-muted/60 backdrop-blur-sm rounded-md p-2 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="size-3 text-foreground/70" />
                <span className="eyebrow">
                  {t("nodeCard.cpu")}
                </span>
              </div>
              <span className="font-mono text-xs sm:text-sm font-semibold font-tabular">
                {cpuPercent.toFixed(1)}%
              </span>
            </div>
            <UsageBar value={cpuPercent} label="" compact />
            {basic.cpu_cores > 0 && (
              <div className="mt-2 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-center truncate text-foreground/70">
                {basic.cpu_cores}C{basic.cpu_name ? ` · ${basic.cpu_name}` : ""}
              </div>
            )}
          </div>

          {/* 2. 内存 */}
          <div className="bg-muted/60 backdrop-blur-sm rounded-md p-2 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="size-3 text-foreground/70" />
                <span className="eyebrow">
                  {t("nodeCard.ram")}
                </span>
              </div>
              <span className="font-mono text-xs sm:text-sm font-semibold font-tabular">
                {memoryUsagePercent.toFixed(1)}%
              </span>
            </div>
            <UsageBar value={memoryUsagePercent} label="" compact />
            <div className="mt-2 flex gap-1">
              <div className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium flex-1 text-center truncate text-foreground/70">
                {basic.mem_total > 0
                  ? `${formatBytes(liveData.ram.used)} / ${formatBytes(basic.mem_total)}`
                  : "-"}
              </div>
              {basic.swap_total > 0 && (
                <div
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    swapPercent > 90
                      ? "border border-destructive/40 text-destructive"
                      : "border border-border text-foreground/70"
                  }`}
                >
                  SW:{swapPercent.toFixed(0)}%
                </div>
              )}
            </div>
          </div>

          {/* 3. 存储 */}
          <div className="bg-muted/60 backdrop-blur-sm rounded-md p-2 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <HardDrive className="size-3 text-foreground/70" />
                <span className="eyebrow">
                  {t("nodeCard.disk")}
                </span>
              </div>
              <span className="font-mono text-xs sm:text-sm font-semibold font-tabular">
                {diskUsagePercent.toFixed(1)}%
              </span>
            </div>
            <UsageBar value={diskUsagePercent} label="" compact />
            <div className="mt-2 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-center truncate text-foreground/70">
              {basic.disk_total > 0
                ? `${formatBytes(liveData.disk.used)} / ${formatBytes(basic.disk_total)}`
                : "-"}
            </div>
          </div>

          {/* 4. 总传输 —— 始终显示 ↑总上传 · ↓总下载; 有限额时第一行右侧显示 % 并附进度条 */}
          <div className="bg-muted/60 backdrop-blur-sm rounded-md p-2 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="size-3 text-foreground/70" />
                <span className="eyebrow">Traffic</span>
              </div>
              {basic.traffic_limit > 0 && (
                <span
                  className="font-mono text-xs sm:text-sm font-semibold font-tabular"
                  title={`Used ${formatBytes(liveData.network.totalUp + liveData.network.totalDown)} / ${formatBytes(basic.traffic_limit)}`}
                >
                  {getTrafficPercentage(
                    liveData.network.totalUp,
                    liveData.network.totalDown,
                    basic.traffic_limit,
                    basic.traffic_limit_type ?? "sum",
                  ).toFixed(1)}
                  %
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-xs sm:text-sm font-semibold font-tabular">
              <span className="truncate">↑ {totalUpload}</span>
              <span className="truncate">↓ {totalDownload}</span>
            </div>
            {basic.traffic_limit > 0 && (
              <div className="mt-1.5">
                <UsageBar
                  value={getTrafficPercentage(
                    liveData.network.totalUp,
                    liveData.network.totalDown,
                    basic.traffic_limit,
                    basic.traffic_limit_type ?? "sum",
                  )}
                  max={Infinity}
                  label=""
                  compact
                />
              </div>
            )}
          </div>

          {/* 5. 网速 —— 2 行: 标题 / ↑ up · ↓ down (各 1/2) */}
          <div className="bg-muted/60 backdrop-blur-sm rounded-md p-2 border border-border">
            <div className="flex items-center mb-2">
              <ArrowUp className="size-3 text-foreground/70 mr-1.5" />
              <span className="eyebrow">Net</span>
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-xs sm:text-sm font-semibold font-tabular">
              <span className="truncate">↑ {upSpeed}</span>
              <span className="truncate">↓ {downSpeed}</span>
            </div>
          </div>

          {/* 6. 连接 —— 2 行: 标题 / TCP·UDP·PROC (各 1/3) */}
          <div className="bg-muted/60 backdrop-blur-sm rounded-md p-2 border border-border">
            <div className="flex items-center mb-2">
              <Activity className="size-3 text-foreground/70 mr-1.5" />
              <span className="eyebrow">Conn</span>
            </div>
            <div className="grid grid-cols-3 gap-1 font-mono text-xs sm:text-sm font-semibold font-tabular">
              <span className="truncate">
                <span className="opacity-70 mr-1">TCP</span>
                {liveData.connections?.tcp ?? 0}
              </span>
              <span className="truncate">
                <span className="opacity-70 mr-1">UDP</span>
                {liveData.connections?.udp ?? 0}
              </span>
              <span className="truncate">
                <span className="opacity-70 mr-1">P</span>
                {liveData.process ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* GPU 区块 (可选): 每个 GPU 一行, 紧凑指标 + 利用率进度条 */}
        {liveData.gpu && liveData.gpu.count > 0 && liveData.gpu.detailed_info?.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-2">
            {liveData.gpu.detailed_info.map((gpu, idx) => {
              const memPercent =
                gpu.memory_total > 0
                  ? (gpu.memory_used / gpu.memory_total) * 100
                  : 0;
              return (
                <div
                  key={`gpu-${idx}`}
                  className="bg-muted/60 backdrop-blur-sm rounded-md p-2 border border-border"
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Gpu className="size-3 text-foreground/70 shrink-0" />
                      <span className="eyebrow truncate">
                        GPU{liveData.gpu!.count > 1 ? ` ${idx + 1}` : ""}
                        {gpu.name ? ` · ${gpu.name}` : ""}
                      </span>
                    </div>
                    <span className="font-mono text-xs sm:text-sm font-semibold font-tabular shrink-0">
                      {gpu.utilization.toFixed(1)}%
                    </span>
                  </div>
                  <UsageBar value={gpu.utilization} label="" compact />
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] sm:text-[11px] font-medium">
                    <span className="truncate">
                      <span className="opacity-70 mr-1">Mem</span>
                      {gpu.memory_total > 0
                        ? `${formatBytes(gpu.memory_used)} / ${formatBytes(gpu.memory_total)} (${memPercent.toFixed(0)}%)`
                        : "-"}
                    </span>
                    <span className="truncate text-right">
                      <span className="opacity-70 mr-1">Temp</span>
                      {gpu.temperature > 0 ? `${gpu.temperature.toFixed(0)}°C` : "-"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 底部：负载 + 价格/标签 */}
        <Flex
          justify="between"
          align="center"
          className="mt-3 pt-2 border-t border-border/40 gap-2"
          wrap="wrap"
        >
          <PriceTags
            price={basic.price}
            billing_cycle={basic.billing_cycle}
            expired_at={basic.expired_at}
            currency={basic.currency}
            tags={basic.tags || ""}
            ip4={showIpTags ? basic.ipv4 : undefined}
            ip6={showIpTags ? basic.ipv6 : undefined}
          />
          {liveData.load && (
            <Text size="1" color="gray" className="font-mono whitespace-nowrap">
              Load: {liveData.load.load1.toFixed(2)} /{" "}
              {liveData.load.load5.toFixed(2)} /{" "}
              {liveData.load.load15.toFixed(2)}
            </Text>
          )}
        </Flex>
      </div>
    </div>
  );
});

export default Node;

type NodeGridProps = {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
};

export const NodeGrid = ({ nodes, liveData }: NodeGridProps) => {
  const { publicInfo } = usePublicInfo();
  const offlineServerPosition =
    publicInfo?.theme_settings?.offlineServerPosition; // "First/Keep/Last"
  const onlineNodes = liveData && liveData.online ? liveData.online : [];

  const sortedNodes = [...nodes].sort((a, b) => {
    const aIsOnline = onlineNodes.includes(a.uuid);
    const bIsOnline = onlineNodes.includes(b.uuid);

    if (offlineServerPosition === "First") {
      if (!aIsOnline && bIsOnline) return -1;
      if (aIsOnline && !bIsOnline) return 1;
    } else if (offlineServerPosition === "Keep") {
      // 不区分在线状态
    } else {
      if (aIsOnline && !bIsOnline) return -1;
      if (!aIsOnline && bIsOnline) return 1;
    }
    return a.weight - b.weight;
  });

  return (
    <div
      className="w-full mt-4 flex flex-col"
      style={{ rowGap: "1rem" }}
    >
      {sortedNodes.map((node) => {
        const isOnline = onlineNodes.includes(node.uuid);
        const nodeData =
          liveData && liveData.data ? liveData.data[node.uuid] : undefined;
        return (
          <Node key={node.uuid} basic={node} live={nodeData} online={isOnline} />
        );
      })}
    </div>
  );
};
