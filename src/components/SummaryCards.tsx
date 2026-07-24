import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Server,
  Cpu,
  HardDrive,
  ArrowDownUp,
  Gauge,
  Wallet,
} from "lucide-react";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import { formatBytes } from "@/utils/unitHelper";
import {
  computeFleetStats,
  computeResourceTotals,
  computeNetworkTotals,
  computeFinance,
  formatCNY,
} from "@/utils/summaryHelper";
import {
  getDailyExchangeRates,
  DEFAULT_EXCHANGE_RATES,
  type ExchangeRates,
} from "@/utils/exchangeRate";
import Flag from "./Flag";
import CountUp from "./CountUp";

interface SummaryCardsProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData | undefined;
}

/** 网速格式化 (B/s 自适配, 与 Node.tsx 同口径) */
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

/**
 * 首页汇总卡组 (Editorial Paper).
 *
 * 取代旧的单行 ticker, 铺开为一组纸卡: 在线 / 内存 / 磁盘 / 总流量 / 实时网速 / 财务,
 * 下方附按地区分布的报刊式概览条. 全部派生计算走 summaryHelper, 本组件只排版.
 */
const SummaryCards: React.FC<SummaryCardsProps> = ({ nodes, liveData }) => {
  const { t } = useTranslation();

  const fleet = useMemo(
    () => computeFleetStats(nodes, liveData),
    [nodes, liveData],
  );
  const resource = useMemo(
    () => computeResourceTotals(nodes, liveData),
    [nodes, liveData],
  );
  const network = useMemo(
    () => computeNetworkTotals(nodes, liveData),
    [nodes, liveData],
  );

  // 当日汇率: 异步拉取 (缓存/兜底见 exchangeRate.ts), 拉到前先用默认值算, 不阻塞渲染
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  useEffect(() => {
    let alive = true;
    getDailyExchangeRates().then((r) => {
      if (alive) setRates(r);
    });
    return () => {
      alive = false;
    };
  }, []);
  const finance = useMemo(
    () => computeFinance(nodes, rates),
    [nodes, rates],
  );

  // 按地区聚合在线节点数, 倒序
  const regionRows = useMemo(() => {
    const onlineSet = new Set(liveData?.online ?? []);
    const map = new Map<string, number>();
    for (const n of nodes) {
      if (!onlineSet.has(n.uuid) || !n.region) continue;
      map.set(n.region, (map.get(n.region) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);
  }, [nodes, liveData]);

  const memPercent = resource.memTotal
    ? (resource.memUsed / resource.memTotal) * 100
    : 0;
  const diskPercent = resource.diskTotal
    ? (resource.diskUsed / resource.diskTotal) * 100
    : 0;

  const hasFinance = finance.paidCount > 0;

  return (
    <section className="summary-card mt-4">
      <div className="eyebrow mb-3">{t("summary.overview")}</div>

      {/* 指标卡组: 移动 2 列 / 平板 3 列 / 桌面 6 列 (有财务时第 6 张占位) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={<Server className="size-4" />}
          label={t("current_online")}
          value={
            <>
              <CountUp value={fleet.online} duration={600} />
              <span style={{ color: "var(--ink-mute)" }}> / {fleet.total}</span>
            </>
          }
          sub={t("summary.regions", { count: fleet.regions })}
        />
        <StatCard
          icon={<Cpu className="size-4" />}
          label={t("nodeCard.ram")}
          value={`${memPercent.toFixed(1)}%`}
          sub={`${formatBytes(resource.memUsed)} / ${formatBytes(resource.memTotal)}`}
        />
        <StatCard
          icon={<HardDrive className="size-4" />}
          label={t("nodeCard.disk")}
          value={`${diskPercent.toFixed(1)}%`}
          sub={`${formatBytes(resource.diskUsed)} / ${formatBytes(resource.diskTotal)}`}
        />
        <StatCard
          icon={<ArrowDownUp className="size-4" />}
          label={t("traffic_overview")}
          value={`↓ ${formatBytes(network.totalDown)}`}
          sub={`↑ ${formatBytes(network.totalUp)}`}
        />
        <StatCard
          icon={<Gauge className="size-4" />}
          label={t("network_speed")}
          value={`↓ ${formatSpeed(network.speedDown)}`}
          sub={`↑ ${formatSpeed(network.speedUp)}`}
        />
        {hasFinance && (
          <StatCard
            icon={<Wallet className="size-4" />}
            label={t("summary.monthly_cost")}
            value={formatCNY(finance.monthlyCNY)}
            sub={t("summary.yearly", {
              value: formatCNY(finance.yearlyCNY),
            })}
          />
        )}
      </div>

      {/* 地区概览条: 报刊式横排, 旗帜 + 计数 + 细竖线分隔 */}
      {regionRows.length > 0 && (
        <div className="paper-card no-tilt mt-3 px-4 py-2.5 overflow-x-auto scrollbar-hidden">
          <div className="flex items-center gap-x-4 whitespace-nowrap">
            <span
              className="eyebrow shrink-0"
              style={{ fontSize: "0.66rem" }}
            >
              {t("region_overview")}
            </span>
            {regionRows.map((r, i) => (
              <div
                key={r.region}
                className="inline-flex items-center gap-2 shrink-0"
              >
                {i > 0 && (
                  <span
                    aria-hidden
                    className="inline-block h-3 w-px self-center"
                    style={{ background: "var(--ink-line-soft)" }}
                  />
                )}
                <Flag flag={r.region} />
                <span
                  className="font-mono font-tabular text-sm"
                  style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}
                >
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
};

// 单张指标纸卡: 顶部 eyebrow 标签 + 图标, 中间大号数值 (mono tabular), 底部副信息
const StatCard: React.FC<StatCardProps> = React.memo(
  ({ icon, label, value, sub }) => {
    return (
      <div className="paper-card no-tilt p-3 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow truncate">{label}</span>
          <span style={{ color: "var(--ink-mute)" }} className="shrink-0">
            {icon}
          </span>
        </div>
        <div
          className="font-mono font-tabular truncate"
          style={{
            color: "var(--ink)",
            fontWeight: 600,
            fontSize: "1.05rem",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
        {sub && (
          <div
            className="font-mono font-tabular truncate"
            style={{ color: "var(--ink-mute)", fontSize: "0.7rem" }}
          >
            {sub}
          </div>
        )}
      </div>
    );
  },
);

export default SummaryCards;
