import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "../types/LiveData";
import { NodeGrid } from "./Node";
import { isRegionMatch, resolveRegionCode } from "@/utils/regionHelper";

interface NodeDisplayProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
  /**
   * 生效中的地区代码 ("all" 表示不筛)。选择入口是 SummaryCards 的地区条 ——
   * 概览与筛选是同一份数据, 这里不再自建第二条地区行。
   */
  activeRegion: string;
}

// 节点列表展示: 搜索 + 分组筛选 + 网格列表 (Liquid Glass 主题, 仅保留 grid 视图)
const NodeDisplay: React.FC<NodeDisplayProps> = ({
  nodes,
  liveData,
  activeRegion,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useLocalStorage<string>(
    "nodeSelectedGroup",
    "all",
  );
  const searchRef = useRef<HTMLInputElement>(null);

  // 收集所有非空分组
  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    nodes.forEach((node) => {
      if (node.group && node.group.trim()) {
        groupSet.add(node.group);
      }
    });
    return Array.from(groupSet).sort();
  }, [nodes]);

  const showGroupSelector = groups.length >= 1;

  // 键盘快捷键: "/" 聚焦搜索, ESC 清空
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
      if (e.key === "Escape" && searchTerm) {
        setSearchTerm("");
        searchRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm]);

  // 过滤链: 地区 → 分组 (两者可叠加) → 搜索词
  const scopedNodes = useMemo(() => {
    let result = nodes;
    if (activeRegion !== "all") {
      result = result.filter(
        (node) => node.region && resolveRegionCode(node.region) === activeRegion,
      );
    }
    if (selectedGroup !== "all") {
      result = result.filter((node) => node.group === selectedGroup);
    }
    return result;
  }, [nodes, activeRegion, selectedGroup]);

  // 搜索词匹配 名称/系统/架构/地区/价格/状态, 只在已筛定的范围内进行
  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return scopedNodes;

    const term = searchTerm.toLowerCase().trim();
    return scopedNodes.filter((node) => {
      const basicMatch =
        node.name.toLowerCase().includes(term) ||
        node.os.toLowerCase().includes(term) ||
        node.arch.toLowerCase().includes(term);
      const regionMatch = isRegionMatch(node.region, term);
      const priceMatch =
        !isNaN(Number(term)) && node.price.toString().includes(term);
      const isOnline = liveData?.online?.includes(node.uuid) || false;
      const statusMatch =
        (term === "online" && isOnline) ||
        (term === "offline" && !isOnline);
      return basicMatch || regionMatch || priceMatch || statusMatch;
    });
  }, [scopedNodes, searchTerm, liveData]);

  const totalCountInScope = scopedNodes.length;
  const onlineInFiltered = filteredNodes.filter((n) =>
    liveData?.online?.includes(n.uuid),
  ).length;
  // 当前生效的筛选范围描述, 用于页眉计数行 (两个维度都可能生效)
  const scopeLabel = [
    activeRegion !== "all" ? activeRegion : null,
    selectedGroup !== "all" ? selectedGroup : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="w-full">
      {/* 控制栏: 章节标题 (eyebrow) + 计数 + 搜索 + 分组 */}
      <div className="mt-8 mb-4 flex flex-col gap-4">
        {/* 章节标题 + 元信息 (像杂志页眉) */}
        <div className="flex items-end justify-between gap-4 border-b border-[var(--ink-line)] pb-2">
          <div>
            <div className="eyebrow">Fleet</div>
            <h2
              className="mt-0.5"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: "clamp(1.4rem, 2.5vw, 1.8rem)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Servers
            </h2>
          </div>
          <div
            className="font-mono text-sm hidden sm:block"
            style={{ color: "var(--ink-mute)" }}
          >
            {searchTerm.trim() ? (
              <>{filteredNodes.length} / {totalCountInScope}</>
            ) : scopeLabel === "" ? (
              <>{liveData?.online?.length || 0} online · {nodes.length} total</>
            ) : (
              <>{onlineInFiltered} online · {filteredNodes.length} in {scopeLabel}</>
            )}
          </div>
        </div>

        {/* 搜索框 + 分组横排 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--ink-mute)" }}
            />
            <input
              ref={searchRef}
              type="text"
              placeholder='Search…  press "/"'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-8 pr-8 outline-none transition-all text-sm"
              style={{
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--ink-line)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                borderRadius: 0,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderBottomColor = "var(--pen-red)";
                e.currentTarget.style.borderBottomWidth = "2px";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderBottomColor = "var(--ink-line)";
                e.currentTarget.style.borderBottomWidth = "1px";
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  searchRef.current?.focus();
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center"
                style={{ color: "var(--pen-red)" }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {showGroupSelector && (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hidden -mx-1 px-1">
              <GroupPill
                active={selectedGroup === "all"}
                onClick={() => setSelectedGroup("all")}
                label="All"
              />
              {groups.map((group) => (
                <GroupPill
                  key={group}
                  active={selectedGroup === group}
                  onClick={() => setSelectedGroup(group)}
                  label={group}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 节点显示区域 */}
      {filteredNodes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16"
          style={{ color: "var(--ink-soft)" }}
        >
          <p
            className="text-2xl mb-2 font-hand"
            style={{ color: "var(--pen-red)", transform: "rotate(-2deg)" }}
          >
            {searchTerm.trim() || scopeLabel
              ? "Nothing here."
              : "No servers yet."}
          </p>
          {(searchTerm.trim() || scopeLabel) && (
            <p className="text-sm" style={{ color: "var(--ink-mute)" }}>
              {searchTerm.trim() ? "Try another keyword" : `No server in ${scopeLabel}`}
            </p>
          )}
        </div>
      ) : (
        <NodeGrid nodes={filteredNodes} liveData={liveData} />
      )}
    </div>
  );
};

// 分组筛选: 极简下划文字按钮 (报刊版面 tab 风); active 用红铅笔下划
const GroupPill: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = React.memo(({ active, onClick, label }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 h-8 inline-flex items-center text-sm whitespace-nowrap transition-colors shrink-0 bg-transparent"
      style={{
        color: active ? "var(--pen-red)" : "var(--ink-soft)",
        fontFamily: "var(--font-serif)",
        fontWeight: active ? 600 : 400,
        fontStyle: active ? "italic" : "normal",
        borderBottom: active
          ? "2px solid var(--pen-red)"
          : "2px solid transparent",
        borderRadius: 0,
      }}
    >
      {label}
    </button>
  );
});

export default NodeDisplay;
