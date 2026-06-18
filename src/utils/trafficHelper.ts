import type { NodeBasicInfo } from "@/contexts/NodeListContext";

/**
 * 节点流量限额派生计算 (展示层业务语义).
 *
 * 职责: 把节点累计流量 (totalUp / totalDown) 按 traffic_limit_type 折成
 * "已用 vs 限额" 的比例, 供节点卡 / 详情页统一显示用量进度。
 * 边界: 后端固定, 这里只做展示层折算, 不改数据。type 走开放式映射 + 默认兜底,
 * 新增类型 (后端扩展) 自动落到 sum 行为, 不为每个值硬编码分支膨胀。
 */

export type TrafficUsage = {
  /** 是否设置了有效限额 (limit > 0); false 时下方比例字段无意义 */
  hasLimit: boolean;
  /** 按 type 折算出的已用字节 */
  used: number;
  /** 限额字节 (= traffic_limit) */
  limit: number;
  /** 用量百分比 (0~100, 已 clamp); 无限额时为 0 */
  percent: number;
};

/**
 * 按 traffic_limit_type 从累计上下行折算已用流量:
 * up=仅上行 / down=仅下行 / max=取大 / min=取小 / 其余(含 sum)=上下行求和
 */
function usedByType(
  type: NodeBasicInfo["traffic_limit_type"],
  totalUp: number,
  totalDown: number,
): number {
  switch (type) {
    case "up":
      return totalUp;
    case "down":
      return totalDown;
    case "max":
      return Math.max(totalUp, totalDown);
    case "min":
      return Math.min(totalUp, totalDown);
    default:
      // sum 及未来未知类型: 求和兜底
      return totalUp + totalDown;
  }
}

/**
 * 计算节点流量用量比例.
 * @param node 节点元信息 (取 traffic_limit / traffic_limit_type)
 * @param totalUp 累计上行字节 (live.network.totalUp)
 * @param totalDown 累计下行字节 (live.network.totalDown)
 */
export function computeTrafficUsage(
  node: Pick<NodeBasicInfo, "traffic_limit" | "traffic_limit_type"> | undefined,
  totalUp: number,
  totalDown: number,
): TrafficUsage {
  const limit = node?.traffic_limit ?? 0;
  const used = usedByType(node?.traffic_limit_type, totalUp, totalDown);
  if (!limit || limit <= 0) {
    return { hasLimit: false, used, limit: 0, percent: 0 };
  }
  const percent = Math.min(Math.max((used / limit) * 100, 0), 100);
  return { hasLimit: true, used, limit, percent };
}

/**
 * 用量阈值色 (与 UsageBar 同源): ≥80 红 / ≥60 橙 / 其余墨色.
 * 返回 CSS 变量, 节点卡百分比文字与进度条共用一套配色。
 */
export function usageColor(percent: number): string {
  if (percent >= 80) return "var(--pen-red)";
  if (percent >= 60) return "var(--pen-amber)";
  return "var(--ink)";
}
