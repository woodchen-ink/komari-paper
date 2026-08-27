import React from "react";
import { Clock, Gauge, Activity } from "lucide-react";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { LiveData, Record } from "../types/LiveData";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { formatBytes } from "@/utils/unitHelper";
import { computeTrafficUsage, usageColor } from "@/utils/trafficHelper";
import { getOSImage, getOSName } from "@/utils";

import NumWash from "./NumWash";
import { healthColor, latencyLevel, lossLevel } from "@/utils/healthHelper";
import Flag from "./Flag";
import Tips from "./ui/tips";
import PriceTags from "./PriceTags";
import BillingBar from "./BillingBar";
import MiniBars from "./MiniBars";
import { useNodePing } from "@/hooks/useNodePing";

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

interface NodeProps {
  basic: NodeBasicInfo;
  live: Record | undefined;
  online: boolean;
  /** 列表内的条目序号 (从 1 起), 用于卡片刊头 "No.03"; 缺省则刊头只出地区代码 */
  index?: number;
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

const Node = React.memo(({ basic, live, online, index }: NodeProps) => {
  const [t] = useTranslation();
  const { publicInfo } = usePublicInfo();
  // 便签卡 ping 汇总 (共享缓存 + 60s 节流, 离线节点不拉; 详见 useNodePing)
  const ping = useNodePing(basic.uuid, online);

  const liveData = live || defaultLive;
  // 刊头: 条目编号 + 通栏点线, 在线 / 离线两种卡共用。
  // 右端不放地区代码 —— 旗帜与 #group 已各带一次地域信息, 再加一次是三重冗余
  const entryNo = index != null ? `No.${String(index).padStart(2, "0")}` : "";

  const cpuPercent = liveData.cpu?.usage ?? 0;
  const memoryUsagePercent = basic.mem_total
    ? (liveData.ram.used / basic.mem_total) * 100
    : 0;
  const diskUsagePercent = basic.disk_total
    ? (liveData.disk.used / basic.disk_total) * 100
    : 0;
  // 负载基准: load1 相对 CPU 核心数 (100% 表示满载)
  // loadRatio 不封顶, 用于文字 (过载时如 252% 才能传达过载程度)
  // loadPercent 封顶 100%, 仅用于进度条 (避免画超出容器)
  const loadRatio = basic.cpu_cores
    ? (liveData.load.load1 / basic.cpu_cores) * 100
    : 0;
  const loadPercent = Math.min(loadRatio, 100);

  const upSpeed = formatSpeed(liveData.network.up);
  const downSpeed = formatSpeed(liveData.network.down);

  // 流量限额用量: 有限额时在 Traffic 标签行右侧显示占比 (阈值色), 无限额显示占位
  const traffic = computeTrafficUsage(
    basic,
    liveData.network.totalUp,
    liveData.network.totalDown,
  );

  const showIpTags = publicInfo?.theme_settings?.showIpTagsInCard;
  // 地址族标记: 双栈 V10 (V4 + V6 = V10, 有意为之的小设计), 单栈 V4 / V6。
  // title 里给出全称, 避免只看标记时读不出含义
  const ipVersionTag =
    basic.ipv4 && basic.ipv6 ? "V10" : basic.ipv4 ? "V4" : basic.ipv6 ? "V6" : "";
  const ipVersionTitle =
    basic.ipv4 && basic.ipv6
      ? "IPv4 + IPv6"
      : basic.ipv4
        ? "IPv4"
        : basic.ipv6
          ? "IPv6"
          : "";

  // 离线节点：精简卡片，红色脉冲点 + 关键标签
  if (!online) {
    return (
      <div
        id={basic.uuid}
        className="paper-card node-card cursor-pointer transition-all w-full"
      >
        <div className="p-3 flex flex-col h-full">
          <div className="flex flex-col gap-1 mb-2">
            <div className="flex items-baseline gap-0 min-w-0">
              <span className="eyebrow shrink-0">{entryNo}</span>
              <i className="leader" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              {/* 离线指示: 红墨水点, 用 ink-pulse 做透明度脉冲 */}
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full pulse-animation"
                style={{ background: "var(--pen-red)" }}
              />
              <Flag flag={basic.region} />
              <Link
                to={`/instance/${basic.uuid}`}
                className="flex-1 min-w-0"
              >
                <h3
                  className="text-sm sm:text-base truncate"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {basic.name}
                </h3>
              </Link>
              {basic.group && (
                // 离线分组: 红铅笔批注 (Caveat), 不加边框, 像在卡角随手写一笔
                <span
                  className="text-sm shrink-0 font-hand"
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
            <div className="node-masthead-rule" />
          </div>
          {/* 离线批注 */}
          <div
            className="text-base font-hand mb-2"
            style={{ color: "var(--ink-mute)", transform: "rotate(-1deg)" }}
          >
            offline
          </div>
          <div className="mt-auto">
          <PriceTags
            layout="grid2"
            price={basic.price}
            billing_cycle={basic.billing_cycle}
            expired_at={basic.expired_at}
            currency={basic.currency}
            tags={basic.tags}
          />
          </div>
        </div>
      </div>
    );
  }

  // 在线节点：便签卡 (Lumina 式紧凑分段, 信息不减)
  // 头 → 资源4列 → 流量2列 → 健康2列(ping/丢包,占位) → 连接·uptime → OS/CPU + 价格
  const osName = getOSName(basic.os);
  const cpuModel = basic.cpu_name
    ? `${basic.cpu_name}${basic.cpu_cores ? ` ×${basic.cpu_cores}` : ""}`
    : "";

  return (
    <div
      id={basic.uuid}
      className="paper-card node-card cursor-pointer transition-all w-full"
    >
      <div className="p-3 relative flex flex-col h-full gap-2.5">
        {/* 刊头: 编号 ···· uptime → 名称行 → 2px 粗线, 读作杂志目录里的一条 */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-0 min-w-0">
            <span className="eyebrow shrink-0">{entryNo}</span>
            <i className="leader" aria-hidden="true" />
            {/* uptime 放刊头右端: 版式上等同刊期/日期, 也让拥挤的脚注行让出一格 */}
            {liveData.uptime > 0 && (
              <span
                className="flex items-baseline gap-1 shrink-0 font-mono text-[11px]"
                style={{ color: "var(--ink-mute)" }}
                title={formatUptime(liveData.uptime, t)}
              >
                <Clock className="size-3 self-center" />
                {formatUptimeShort(liveData.uptime)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Flag flag={basic.region} />
            <Link to={`/instance/${basic.uuid}`} className="min-w-0 flex-1">
              <h3
                className="text-sm sm:text-base truncate"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {basic.name}
              </h3>
            </Link>
            {liveData.message && <Tips color="var(--destructive)">{liveData.message}</Tips>}
            {basic.group && (
              // 分组: 卡角随手写的红铅笔批注, 不加边框
              <span
                className="text-sm shrink-0 font-hand"
                style={{
                  color: "var(--pen-red)",
                  transform: "rotate(-2deg)",
                  display: "inline-block",
                }}
              >
                #{basic.group}
              </span>
            )}
            {showIpTags && ipVersionTag && (
              // 地址族与旗帜 / 分组同属"身份"信息, 归到名称行右端。
              // 实心墨块小标签 (.paper-tag): 卡内唯一的反白元素, 面积极小但
              // 一眼可见 —— 这里不能再用描边框, 卡内 1px 描边已经太多
              <span className="paper-tag shrink-0" title={ipVersionTitle}>
                {ipVersionTag}
              </span>
            )}
          </div>
          <div className="node-masthead-rule" />
        </div>

        {/* 一级 · 资源 2×2: 账本栏线 (无上框 / 下细线 / 中缝竖线), 视觉重心 */}
        <div className="node-metric-block grid grid-cols-2 gap-x-3 gap-y-2.5">
          {[
            {
              label: t("nodeCard.cpu"),
              pct: cpuPercent,
              sub: basic.cpu_cores ? `${basic.cpu_cores}C` : "",
            },
            {
              label: t("nodeCard.ram"),
              pct: memoryUsagePercent,
              sub:
                basic.mem_total > 0
                  ? `${formatBytes(liveData.ram.used)}/${formatBytes(basic.mem_total)}`
                  : "",
            },
            {
              label: t("nodeCard.disk"),
              pct: diskUsagePercent,
              sub:
                basic.disk_total > 0
                  ? `${formatBytes(liveData.disk.used)}/${formatBytes(basic.disk_total)}`
                  : "",
            },
            {
              label: t("nodeCard.load"),
              pct: loadPercent,
              value: liveData.load.load1.toFixed(2),
              // load1 折算成相对 CPU 核心数的百分比 + 5/15 分钟原始值
              sub: `${loadRatio.toFixed(0)}% · ${liveData.load.load5.toFixed(1)}·${liveData.load.load15.toFixed(1)}`,
            },
          ].map((m) => (
            <div key={m.label} className="min-w-0">
              {/* 底纹量程 = 整格宽度, 不是数值自身宽度。挂在数值上时 1% 的底纹
                  只有数字宽度的 1%, 等于看不见; 铺满整格后低值也有可辨的一小条 */}
              <NumWash percent={m.pct} className="block w-full">
                <span className="flex items-baseline justify-between gap-1 min-w-0">
                  <span className="eyebrow truncate">{m.label}</span>
                  <span className="text-2xl leading-none shrink-0">
                    {m.value ?? m.pct.toFixed(0)}
                    {m.value ? "" : <span className="text-[11px] opacity-55 ml-0.5">%</span>}
                  </span>
                </span>
              </NumWash>
              {m.sub && (
                <div
                  className="font-mono text-[11px] mt-1 truncate"
                  style={{ color: "var(--ink-mute)" }}
                  title={m.sub}
                >
                  {m.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 二级 · 健康: 延迟 / 丢包 一行两列, 各自标签行 + 半宽柱图 (hover tooltip) */}
        <div className="grid grid-cols-2 gap-x-3">
          {/* 延迟 */}
          <div className="min-w-0">
            {/* 这两格不加用量底纹: 底下的 MiniBars 是"逐点"着色 (哪一采样慢 /
                哪一采样丢包), 而底纹只能按聚合值涂成一整片单色, 盖在柱图后面
                会把逐点信息糊成一片 —— 延迟看不出"偶发尖峰", 丢包看不出
                "丢在哪一段"。数值本身的阈值色已经给出当前好坏, 够了。 */}
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="flex items-center gap-1 eyebrow">
                <Gauge className="size-3" />
                Latency
              </span>
              <span
                className="num-display text-base shrink-0"
                style={{
                  color:
                    ping?.latest == null
                      ? "var(--ink-mute)"
                      : healthColor(latencyLevel(ping.latest)),
                }}
              >
                {ping?.latest == null ? "—" : `${Math.round(ping.latest)}ms`}
              </span>
            </div>
            <MiniBars points={ping?.points ?? []} mode="latency" />
          </div>
          {/* 丢包 (0 绿 / <5% 零星丢包黄 / ≥5% 持续丢包红), 与延迟分级同一套色阶 */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="flex items-center gap-1 eyebrow">
                <Activity className="size-3" />
                Loss
              </span>
              <span
                className="num-display text-base shrink-0"
                style={{
                  color:
                    ping?.loss == null
                      ? "var(--ink-mute)"
                      : healthColor(lossLevel(ping.loss)),
                }}
              >
                {ping?.loss == null ? "—" : `${ping.loss.toFixed(1)}%`}
              </span>
            </div>
            <MiniBars points={ping?.points ?? []} mode="loss" />
          </div>
        </div>

        {/* 价格 + 到期剩余进度条 (取代底部 badge, 紧贴脚注上方作为元信息) */}
        {/* 二级 · 网络: 网速 / 流量 */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 font-mono font-tabular text-xs">
          <div className="min-w-0">
            <div className="eyebrow">Net</div>
            <div className="flex gap-2 mt-0.5">
              <span className="truncate">↑ {upSpeed}</span>
              <span className="truncate">↓ {downSpeed}</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-1">
              <span className="eyebrow">Traffic</span>
              {traffic.hasLimit ? (
                <span
                  className="font-semibold shrink-0"
                  style={{ color: usageColor(traffic.percent) }}
                  title={`${formatBytes(traffic.used)} / ${formatBytes(traffic.limit)}`}
                >
                  {traffic.percent.toFixed(0)}%
                </span>
              ) : (
                <span
                  className="font-hand shrink-0 text-sm leading-none"
                  style={{ color: "var(--ink-mute)" }}
                >
                  {t("nodeCard.unlimited", "Unlimited")}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-0.5">
              <span className="truncate">↑ {formatBytes(liveData.network.totalUp)}</span>
              <span className="truncate">↓ {formatBytes(liveData.network.totalDown)}</span>
            </div>
          </div>
        </div>

        <BillingBar
          price={basic.price}
          billing_cycle={basic.billing_cycle}
          expired_at={basic.expired_at}
          currency={basic.currency}
        />

        {/* 三级 · 脚注: 连接/进程/uptime + OS·arch·CPU, 淡色小字, 不抢视线 */}
        <div className="node-card-meta flex flex-col gap-0.5 text-[11px] min-w-0">
          {/* 连接 ···· 进程: 引导点线连接, 像目录条目 (uptime 已上移到刊头)。
              极窄卡片下点线先收缩, 仍放不下才裁切尾部, 完整内容挂在 title 上 */}
          <div
            className="flex items-baseline gap-0 font-mono min-w-0 overflow-hidden"
            title={`TCP ${liveData.connections?.tcp ?? 0} · UDP ${
              liveData.connections?.udp ?? 0
            } · P ${liveData.process ?? 0}`}
          >
            <span className="shrink-0">TCP {liveData.connections?.tcp ?? 0}</span>
            <i className="leader" aria-hidden="true" />
            <span className="shrink-0">UDP {liveData.connections?.udp ?? 0}</span>
            <i className="leader" aria-hidden="true" />
            <span className="shrink-0">P {liveData.process ?? 0}</span>
          </div>
          <div
            className="flex items-center gap-1.5 min-w-0"
            title={`${osName}${basic.arch ? ` · ${basic.arch}` : ""}${cpuModel ? ` · ${cpuModel}` : ""}`}
          >
            <img
              src={getOSImage(basic.os)}
              alt={basic.os}
              className="w-3.5 h-3.5 shrink-0"
            />
            <span className="truncate">
              {osName}
              {basic.arch ? ` · ${basic.arch}` : ""}
              {cpuModel ? ` · ${cpuModel}` : ""}
            </span>
          </div>
        </div>

        {/* 标签: 每行 2 个固定宽 + truncate + title (价格/到期已移到 BillingBar); 无 tags 不占位 */}
        {basic.tags && basic.tags.trim() !== "" && (
          <div className="-mt-1">
            <PriceTags layout="grid2" showPrice={false} tags={basic.tags} />
          </div>
        )}
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
    <div className="w-full mt-4 grid items-stretch gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {sortedNodes.map((node, i) => {
        const isOnline = onlineNodes.includes(node.uuid);
        const nodeData =
          liveData && liveData.data ? liveData.data[node.uuid] : undefined;
        return (
          <Node
            key={node.uuid}
            basic={node}
            live={nodeData}
            online={isOnline}
            index={i + 1}
          />
        );
      })}
    </div>
  );
};
