import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import {
  toCNY,
  CURRENCY_SYMBOLS,
  type ExchangeRates,
} from "@/utils/exchangeRate";

/**
 * 首页汇总指标计算 (纯展示层聚合).
 *
 * 职责: 把 nodeList (元信息) + liveData (实时) 折叠成首页 summary 卡所需的派生数字.
 * 边界: 本主题没有可改的后端, Komari 数据层固定, 这里只做展示层求和/折算, 不做业务规则.
 * 货币: 各币种价格经汇率折算成 CNY 统一汇总 (汇率源见 exchangeRate.ts, 离线有兜底).
 */

const MONTH_DAYS = 30;

/** 在线/总数 + 地区数 */
export function computeFleetStats(
  nodes: NodeBasicInfo[],
  live: LiveData | undefined,
) {
  const onlineSet = new Set(live?.online ?? []);
  const online = nodes.filter((n) => onlineSet.has(n.uuid)).length;
  const regions = new Set(
    nodes
      .filter((n) => onlineSet.has(n.uuid) && n.region)
      .map((n) => n.region),
  ).size;
  return { online, total: nodes.length, regions };
}

/** 在线节点的内存 / 磁盘 used 求和; total 按全量库存 (离线节点 used 为 0) */
export function computeResourceTotals(
  nodes: NodeBasicInfo[],
  live: LiveData | undefined,
) {
  const data = live?.data ?? {};
  let memUsed = 0;
  let diskUsed = 0;
  let memTotal = 0;
  let diskTotal = 0;
  for (const n of nodes) {
    memTotal += n.mem_total || 0;
    diskTotal += n.disk_total || 0;
    const rec = data[n.uuid];
    if (rec) {
      memUsed += rec.ram?.used || 0;
      diskUsed += rec.disk?.used || 0;
    }
  }
  return { memUsed, memTotal, diskUsed, diskTotal };
}

/** 在线节点的总流量 (totalUp / totalDown) 与实时速率 (up / down) 求和 */
export function computeNetworkTotals(
  nodes: NodeBasicInfo[],
  live: LiveData | undefined,
) {
  const data = live?.data ?? {};
  const onlineSet = new Set(live?.online ?? []);
  let totalUp = 0;
  let totalDown = 0;
  let speedUp = 0;
  let speedDown = 0;
  for (const n of nodes) {
    if (!onlineSet.has(n.uuid)) continue;
    const rec = data[n.uuid];
    if (!rec) continue;
    totalUp += rec.network?.totalUp || 0;
    totalDown += rec.network?.totalDown || 0;
    speedUp += rec.network?.up || 0;
    speedDown += rec.network?.down || 0;
  }
  return { totalUp, totalDown, speedUp, speedDown };
}

export type FinanceTotals = {
  /** 有计费节点数 (price > 0) */
  paidCount: number;
  /** 月均成本 (CNY): price 按 billing_cycle 折到 30 天后求和 */
  monthlyCNY: number;
  /** 总价值 (CNY): 各节点单周期价格折算后求和 */
  totalCNY: number;
  /** 剩余价值 (CNY): price 按 expired_at 距今天数 / billing_cycle 比例 */
  remainingCNY: number;
};

/**
 * 汇总月成本 / 总价值 / 剩余价值, 全部折算成 CNY 后求和.
 * - price <= 0 (免费 / 未设) 跳过
 * - billing_cycle <= 0 视为一次性, 不参与月均折算 (但计入总价值)
 * - rates: 当日汇率 (1 CNY = N 外币); 折算见 exchangeRate.toCNY
 */
export function computeFinance(
  nodes: NodeBasicInfo[],
  rates: ExchangeRates,
): FinanceTotals {
  const now = Date.now();
  let paidCount = 0;
  let monthlyCNY = 0;
  let totalCNY = 0;
  let remainingCNY = 0;

  for (const n of nodes) {
    if (!n.price || n.price <= 0) continue;
    paidCount++;

    const priceCNY = toCNY(n.price, n.currency, rates);
    totalCNY += priceCNY;

    const cycle = n.billing_cycle;
    if (cycle && cycle > 0) {
      monthlyCNY += (priceCNY / cycle) * MONTH_DAYS;

      // 剩余价值: 距过期天数占一个计费周期的比例 × 单周期价格, 上限一个周期
      const expMs = n.expired_at ? new Date(n.expired_at).getTime() : 0;
      if (expMs > now) {
        const daysLeft = (expMs - now) / (1000 * 60 * 60 * 24);
        const ratio = Math.min(daysLeft / cycle, 1);
        remainingCNY += priceCNY * ratio;
      }
    }
  }

  return { paidCount, monthlyCNY, totalCNY, remainingCNY };
}

/** CNY 金额格式化: 千分位 + 2 位小数, 前缀人民币符号 */
export function formatCNY(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const value = new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Math.abs(safe) < 100000 ? 2 : 0,
    notation: Math.abs(safe) >= 100000 ? "compact" : "standard",
  }).format(safe);
  return `${CURRENCY_SYMBOLS.CNY}${value}`;
}
