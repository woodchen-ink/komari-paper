import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { resolveRegionCode } from "./regionHelper";

/**
 * 节点分组维度。
 * - `group`  后端自定义分组 (node.group)
 * - `region` 归一化后的地区代码 (旗帜 emoji 与两字母代码统一成大写 ISO 码)
 */
export type GroupDimension = "group" | "region";

/** 节点在指定维度下的桶键; 该维度无值时返回 null (调用方渲染为 Ungrouped) */
export const bucketKeyOf = (
  node: NodeBasicInfo,
  dim: GroupDimension,
): string | null => {
  if (dim === "region") return node.region ? resolveRegionCode(node.region) : null;
  return node.group && node.group.trim() ? node.group : null;
};

/**
 * 是否存在任何非空自定义分组。
 * 为 false 时调用方应把维度自动退回 `region` —— 否则整个侧栏 / 筛选器只剩一个
 * "Ungrouped" 桶, 等于没有分组。
 */
export const hasCustomGroups = (nodes: NodeBasicInfo[]): boolean =>
  nodes.some((node) => !!node.group && node.group.trim() !== "");

/** 桶键 → 该桶内任一节点的原始 region 值 (给筛选器取旗帜图用) */
export interface RegionBucket {
  /** 归一化大写地区代码, 如 "US" */
  code: string;
  /** 原始 region 值 (可能是 emoji 或两字母码), 用于渲染旗帜 */
  raw: string;
  count: number;
}

/** 按地区归桶并计数, 数量多者在前 (同数量按代码字典序), 便于"快速选常用地区" */
export const regionBucketsOf = (nodes: NodeBasicInfo[]): RegionBucket[] => {
  const buckets = new Map<string, RegionBucket>();
  nodes.forEach((node) => {
    if (!node.region) return;
    const code = resolveRegionCode(node.region);
    const hit = buckets.get(code);
    if (hit) hit.count += 1;
    else buckets.set(code, { code, raw: node.region, count: 1 });
  });
  return Array.from(buckets.values()).sort(
    (a, b) => b.count - a.count || a.code.localeCompare(b.code),
  );
};
