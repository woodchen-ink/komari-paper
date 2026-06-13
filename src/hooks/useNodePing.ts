import { useEffect, useState } from "react";
import { useRPC2Call } from "@/contexts/RPC2Context";

/**
 * 便签卡 ping 数据 hook: 按 uuid 拉最近 1h ping 记录, 汇总成单值供卡片迷你展示。
 *
 * 设计要点 (控制首页 N 节点请求量):
 *   - 模块级共享缓存: 同一 uuid 多个组件复用一份, 不重复发请求
 *   - 节流: 每个 uuid 60s 刷新一次, 错峰发起避免瞬时并发洪峰
 *   - 多 task 汇总: 取延迟最低的 task (最优路径), 丢包率取同一 task
 *   - 失败/无数据: 返回 null, 卡片侧显示占位
 */

interface PingRecord {
  client: string;
  task_id: number;
  time: string;
  value: number;
}
interface TaskInfo {
  id: number;
  name: string;
  interval: number;
  loss: number;
  latest?: number;
}

export interface NodePing {
  latest: number | null; // 最新延迟 (ms), null 表示无样本
  loss: number | null; // 丢包率 (%)
  points: PingPoint[]; // 最近若干采样, 供迷你柱图 + tooltip
}

export interface PingPoint {
  time: string; // ISO 时间, 供 tooltip
  value: number; // 延迟 (ms), 丢包点为 0
  lost: boolean; // 是否丢包 (原始 value < 0)
}

const REFRESH_MS = 60_000;
const PING_HOURS = 1;
const MINI_POINTS = 24; // 迷你柱图保留的采样点数

type CacheEntry = {
  data: NodePing | null;
  ts: number; // 上次成功拉取时间
  inflight: boolean;
  listeners: Set<(d: NodePing | null) => void>;
};

const cache = new Map<string, CacheEntry>();

/** 从原始记录 + 任务信息汇总出单值 (取延迟最低的 task) */
function summarize(records: PingRecord[], tasks: TaskInfo[]): NodePing | null {
  if (!records.length || !tasks.length) return null;

  // 按 task 分组, 选延迟最低的 task 作为代表
  const byTask = new Map<number, PingRecord[]>();
  for (const r of records) {
    if (!byTask.has(r.task_id)) byTask.set(r.task_id, []);
    byTask.get(r.task_id)!.push(r);
  }

  let best: { taskId: number; latest: number } | null = null;
  for (const [taskId, recs] of byTask) {
    // 该 task 最新有效延迟
    const valid = recs.filter((r) => r.value >= 0);
    if (!valid.length) continue;
    const latest = valid[valid.length - 1].value;
    if (best === null || latest < best.latest) best = { taskId, latest };
  }
  if (best === null) {
    // 全是丢包: 仍取第一个 task 报告 100% loss
    best = { taskId: tasks[0].id, latest: 0 };
  }

  const recs = byTask.get(best.taskId) ?? [];
  const total = recs.length;
  const lost = recs.filter((r) => r.value < 0).length;
  const loss = total ? (lost / total) * 100 : null;
  const validRecs = recs.filter((r) => r.value >= 0);
  const latest = validRecs.length
    ? validRecs[validRecs.length - 1].value
    : null;
  const points: PingPoint[] = recs.slice(-MINI_POINTS).map((r) => ({
    time: r.time,
    value: r.value < 0 ? 0 : r.value,
    lost: r.value < 0,
  }));

  return { latest, loss, points };
}

export function useNodePing(uuid: string, enabled = true): NodePing | null {
  const { call } = useRPC2Call();
  const [data, setData] = useState<NodePing | null>(
    () => cache.get(uuid)?.data ?? null,
  );

  useEffect(() => {
    if (!uuid || !enabled) return;

    let entry = cache.get(uuid);
    if (!entry) {
      entry = { data: null, ts: 0, inflight: false, listeners: new Set() };
      cache.set(uuid, entry);
    }
    const e = entry;
    const onUpdate = (d: NodePing | null) => setData(d);
    e.listeners.add(onUpdate);
    // 订阅时立即同步当前缓存
    setData(e.data);

    const fetchOnce = async () => {
      if (e.inflight) return;
      if (Date.now() - e.ts < REFRESH_MS && e.data !== null) return; // 缓存仍新鲜
      e.inflight = true;
      try {
        type RpcResp = { records?: PingRecord[]; tasks?: TaskInfo[] };
        const result = await call<any, RpcResp>("common:getRecords", {
          uuid,
          type: "ping",
          hours: PING_HOURS,
        });
        const records = (result?.records ?? []).sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        );
        e.data = summarize(records, result?.tasks ?? []);
        e.ts = Date.now();
        e.listeners.forEach((fn) => fn(e.data));
      } catch {
        // 失败保持旧值; 不抛出, 不阻塞卡片
      } finally {
        e.inflight = false;
      }
    };

    // 错峰首拉: 按 uuid 哈希散开 0~800ms, 避免首屏并发洪峰
    const jitter = (uuid.charCodeAt(0) * 37) % 800;
    const initial = setTimeout(fetchOnce, jitter);
    const timer = setInterval(fetchOnce, REFRESH_MS);

    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      e.listeners.delete(onUpdate);
    };
  }, [uuid, call, enabled]);

  return data;
}
