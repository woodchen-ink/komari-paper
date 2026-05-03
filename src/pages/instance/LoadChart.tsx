import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveData } from "../../contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import { Flex, SegmentedControl } from "@radix-ui/themes";
import { formatBytes } from "@/utils/unitHelper";
import { useNodeList } from "@/contexts/NodeListContext";
import fillMissingTimePoints, { type RecordFormat } from "@/utils/RecordHelper";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { ChartGridSkeleton } from "@/components/Skeletons";
// #region 图表
type LoadChartProps = {
  data: RecordFormat[];
  intervalSec?: number; // 数据间隔，单位秒
};

const LoadChart = ({ data = [] }: LoadChartProps) => {
  const { t } = useTranslation();
  const { live_data: all_live_data } = useLiveData();
  const { uuid } = useParams<{ uuid: string }>();
  const { nodeList } = useNodeList();
  const { publicInfo } = usePublicInfo();
  const max_record_preserve_time = publicInfo?.record_preserve_time || 0;
  // 计算可用视图
  const [hoursView, setHoursView] = useState<string>("real-time");
  const [remoteData, setRemoteData] = useState<RecordFormat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 选择第一个可用视图为默认
  useEffect(() => {
    if (avaliableView.length > 0) {
      setHoursView(avaliableView[0].label);
    }
  }, [max_record_preserve_time]);

  // real-time 总是可用
  // 其余根据 max_record_preserve_time (单位: 小时) 动态生成
  // 4hour, 1day(24h), 7day(168h), 30day(720h)
  // 超过最大预设则显示 "xxx hours"
  const presetViews = [
    { label: t("chart.hours", { count: 4 }), hours: 4 },
    { label: t("chart.days", { count: 1 }), hours: 24 },
    { label: t("chart.days", { count: 7 }), hours: 168 },
    { label: t("chart.days", { count: 30 }), hours: 720 },
  ];
  const avaliableView: { label: string; hours?: number }[] = [
    { label: t("common.real_time") },
  ];
  if (
    typeof max_record_preserve_time === "number" &&
    max_record_preserve_time > 0
  ) {
    for (const v of presetViews) {
      if (max_record_preserve_time >= v.hours) {
        avaliableView.push({ label: v.label, hours: v.hours });
      }
    }
    // 如果大于最大预设，显示 "xxx hours"
    const maxPreset = presetViews[presetViews.length - 1];
    if (max_record_preserve_time > maxPreset.hours) {
      // 若能被24整除，显示为“xx天”，否则显示为“xx小时”
      const dynamicLabel =
        max_record_preserve_time % 24 === 0
          ? `${t("chart.days", {
              count: Math.floor(max_record_preserve_time / 24),
            })}`
          : `${t("chart.hours", { count: max_record_preserve_time })}`;
      avaliableView.push({
        label: dynamicLabel,
        hours: max_record_preserve_time,
      });
    } else if (
      max_record_preserve_time > 4 &&
      !presetViews.some((v) => v.hours === max_record_preserve_time)
    ) {
      // 如果不是预设但大于4小时，显示具体小时
      const dynamicLabel =
        max_record_preserve_time % 24 === 0
          ? `${t("chart.days", {
              count: Math.floor(max_record_preserve_time / 24),
            })}`
          : `${t("chart.hours", { count: max_record_preserve_time })}`;
      avaliableView.push({
        label: dynamicLabel,
        hours: max_record_preserve_time,
      });
    }
  }

  // 根据 hoursView 拉取数据
  // 优化: 切换时间窗口时不清空旧 remoteData (保留旧曲线作过渡), 只在最终覆盖
  // 性能: GPU 合并改用 Map 索引, O(N+M) 替代 O(N*M*device_count)
  useEffect(() => {
    const selected = avaliableView.find((v) => v.label === hoursView);
    if (!uuid) return;
    if (!selected || !selected.hours) {
      setRemoteData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    fetch(`/api/records/load?uuid=${uuid}&hours=${selected.hours}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((resp) => {
        const records: RecordFormat[] = resp.data?.records || [];
        const gpuDevices: Record<string, { records?: any[] }> =
          resp.data?.gpu_devices || {};

        // 把每个 GPU 设备的 records 预先索引成 Map<timestampMs, gpuRecord>, 一次性 O(M)
        const gpuIndex: Array<Map<number, any>> = [];
        for (const deviceIndex in gpuDevices) {
          const map = new Map<number, any>();
          const arr = gpuDevices[deviceIndex]?.records || [];
          for (const gr of arr) {
            map.set(new Date(gr.time).getTime(), gr);
          }
          gpuIndex.push(map);
        }

        // O(N * deviceCount), 每条 record 在每个 device map 里 O(1) 查询
        const mergedRecords: RecordFormat[] = records.map((record) => {
          const ts = new Date(record.time).getTime();
          const gpuDetailed: any[] = [];
          for (const map of gpuIndex) {
            const gr = map.get(ts);
            if (gr) {
              gpuDetailed.push({
                usage: gr.utilization,
                memory: (gr.mem_used / gr.mem_total) * 100,
                temperature: gr.temperature,
                device_index: gr.device_index,
                device_name: gr.device_name,
                mem_total: gr.mem_total,
                mem_used: gr.mem_used,
              });
            }
          }
          return {
            ...record,
            gpu_detailed: gpuDetailed.length > 0 ? gpuDetailed : undefined,
          };
        });

        // 按时间升序排序
        mergedRecords.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        );
        setRemoteData(mergedRecords);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err.message || "Error");
        setLoading(false);
      });
    return () => controller.abort();
  }, [hoursView, uuid]);

  // colors: 改为墨水笔色 (红 / 黄褐 / 绿 / 蓝), 与新主题统一
  // 用 hex 直填, recharts 不解析 CSS var
  const colors = ["#c23b22", "#b07a1f", "#5a7a3a", "#2c5d8f"];
  const primaryColor = colors[0];
  const secondaryColor = colors[1];
  const cn = "paper-card p-4 min-w-0 flex flex-col w-full h-full gap-4";
  const chartMargin = {
    top: 0,
    right: 16,
    bottom: 0,
    left: 16,
  };
  const live_data = all_live_data?.data?.data[uuid ?? ""];
  const timeFormatter = (value: any, index: number) => {
    if (index === 0 || index === chartData.length - 1) {
      if (
        presetViews[0].label === hoursView ||
        hoursView === "real-time" ||
        hoursView === t("common.real_time")
      ) {
        return new Date(value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return new Date(value).toLocaleDateString([], {
        month: "2-digit",
        day: "2-digit",
      });
    }
    return "";
  };
  const node = nodeList?.find((n) => n.uuid === uuid);
  const lableFormatter = (value: any) => {
    const date = new Date(value);
    if (hoursView === t("common.real_time") || hoursView === "real-time") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    return date.toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const percentageFormatter = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  const ChartTitle = (text: string, left: React.ReactNode) => {
    return (
      <Flex justify="between" align="center" className="mb-2">
        <label className="text-xl font-bold">{text}</label>
        <label className="text-sm text-muted-foreground">{left}</label>
      </Flex>
    );
  };
  const minute = 60;
  const hour = minute * 60;
  // 限制实时模式的数据点数量，避免长时间运行时数据无限增长
  const MAX_REALTIME_POINTS = 30 * 5; // 与父组件 recent.length 一致（150）
  const isRealtime =
    hoursView === t("common.real_time") || hoursView === "real-time";
  const realtimeData = Array.isArray(data)
    ? data.slice(-MAX_REALTIME_POINTS)
    : data;

  const chartData = isRealtime
    ? realtimeData
    : hoursView === presetViews[0].label
    ? fillMissingTimePoints(remoteData ?? [], minute, hour * 4, minute * 2)
    : (() => {
        const selectedHours =
          presetViews.find((v) => v.label === hoursView)?.hours ||
          avaliableView.find((v) => v.label === hoursView)?.hours ||
          24;
        const interval = selectedHours > 120 ? hour : minute * 15;
        const maxGap = interval * 2;
        return fillMissingTimePoints(
          remoteData ?? [],
          interval,
          hour * selectedHours,
          maxGap
        );
      })();

  return (
    <Flex
      direction="column"
      align="center"
      gap="4"
      className="w-full max-w-screen"
    >
      <div className="w-full overflow-x-auto px-2">
        <div className="w-max mx-auto">
          <SegmentedControl.Root value={hoursView} onValueChange={setHoursView}>
            {avaliableView.map((view) => (
              <SegmentedControl.Item
                key={view.label}
                value={view.label}
                className="capitalize"
              >
                {view.label === "real-time"
                  ? t("common.real_time")
                  : view.label}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        </div>
      </div>
      {error && (
        <div style={{ color: "#f87171", textAlign: "center", width: "100%" }}>
          {error}
        </div>
      )}
      {/* 切换时间窗口期间显示骨架占位; 一旦 remoteData 到位即被真实图表替换 */}
      {loading && !remoteData && <ChartGridSkeleton count={4} />}
      <div
        className="gap-2 grid w-full justify-items-stretch"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(288px, 1fr))",
          opacity: loading && remoteData ? 0.55 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {/* CPU */}
        <div className={cn}>
          {ChartTitle(
            "CPU",
            live_data?.cpu?.usage ? `${live_data.cpu.usage.toFixed(2)}%` : "-"
          )}
          <ChartContainer
            config={{
              cpu: {
                label: "CPU",
                color: primaryColor,
              },
            }}
          >
            <AreaChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}%` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={percentageFormatter}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="cpu"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
        {/* Ram */}
        <div className={cn}>
          {ChartTitle(
            "Ram",
            <Flex gap="0" direction="column" align="end" className="text-sm">
              <label>
                {live_data?.ram?.used
                  ? `${formatBytes(live_data.ram.used)} / ${formatBytes(
                      node?.mem_total || 0
                    )}`
                  : "-"}
              </label>
              <label>
                {live_data?.swap?.used
                  ? `${formatBytes(live_data.swap.used)} / ${formatBytes(
                      node?.swap_total || 0
                    )}`
                  : "-"}
              </label>
            </Flex>
          )}
          <ChartContainer
            config={{
              ram: {
                label: "Ram",
                color: primaryColor,
              },
              swap: {
                label: "Swap",
                color: secondaryColor,
              },
            }}
          >
            <AreaChart
              data={chartData.map((item) => ({
                time: item.time,
                ram: ((item.ram ?? 0) / (node?.mem_total ?? 1)) * 100,
                ram_raw: item.ram,
                swap: ((item.swap ?? 0) / (node?.swap_total ?? 1)) * 100,
                swap_raw: item.swap,
                client: item.client,
              }))}
              accessibilityLayer
              margin={chartMargin}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}%` : ""
                }
                orientation="left"
                type="number"
                // 让Y轴显示在图表内侧
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={(value, name, props) => {
                  // value: 百分比
                  // name: ram/swap
                  // props: { payload, ... }
                  const payload = props?.payload || {};
                  let rawValue = 0;
                  if (name === "ram") {
                    rawValue = payload.ram_raw ?? 0;
                  } else if (name === "swap") {
                    rawValue = payload.swap_raw ?? 0;
                  }
                  let percent = 0;
                  if (typeof value === "number") {
                    percent = value;
                  } else if (typeof value === "string") {
                    const parsed = parseFloat(value);
                    percent = isNaN(parsed) ? 0 : parsed;
                  } else if (Array.isArray(value)) {
                    percent =
                      typeof value[0] === "number"
                        ? value[0]
                        : parseFloat(value[0] || "0");
                  }
                  return `${formatBytes(rawValue)} (${percent.toFixed(0)}%)`;
                }}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="ram"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
              <Area
                dataKey="swap"
                animationDuration={0}
                stroke={secondaryColor}
                fill={secondaryColor}
                opacity={0.8}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
        {/* Disk */}
        <div className={cn}>
          {ChartTitle(
            "Disk",
            live_data?.disk?.used
              ? `${formatBytes(live_data.disk.used)} / ${formatBytes(
                  node?.disk_total || 0
                )}`
              : "-"
          )}
          <ChartContainer
            config={{
              disk: {
                label: "Disk",
                color: primaryColor,
              },
            }}
          >
            <AreaChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, node?.disk_total || 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${formatBytes(value)}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={formatBytes}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="disk"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
        {/* Netwodk */}
        <div className={cn}>
          {ChartTitle(
            t("nodeCard.networkSpeed"),
            <Flex gap="0" align="end" direction="column" className="text-sm">
              <span>
                ↑ {formatBytes(live_data?.network.up || 0)}
                /s
              </span>
              <span>
                ↓ {formatBytes(live_data?.network.down || 0)}
                /s
              </span>
            </Flex>
          )}
          <ChartContainer
            config={{
              net_in: {
                label: t("chart.network_down"),
                color: primaryColor,
              },
              net_out: {
                label: t("chart.network_up"),
                color: colors[3],
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${formatBytes(value)}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={formatBytes}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="net_in"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
              <Line
                dataKey="net_out"
                animationDuration={0}
                stroke={colors[3]}
                fill={colors[3]}
                opacity={0.8}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
        {/* Connections */}
        <div className={cn}>
          {ChartTitle(
            t("chart.connections"),
            <Flex gap="0" align="end" direction="column" className="text-sm">
              <span>TCP: {live_data?.connections.tcp}</span>
              <span>UDP: {live_data?.connections.udp}</span>
            </Flex>
          )}
          <ChartContainer
            config={{
              connections: {
                label: "TCP",
                color: primaryColor,
              },
              connections_udp: {
                label: "UDP",
                color: colors[3],
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="connections"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
              <Line
                dataKey="connections_udp"
                animationDuration={0}
                stroke={colors[3]}
                fill={colors[3]}
                opacity={0.8}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
        {/* Process */}
        <div className={cn}>
          {ChartTitle(t("chart.process"), live_data?.process)}
          <ChartContainer
            config={{
              process: {
                label: t("chart.process"),
                color: primaryColor,
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="process"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
        {/* GPU Charts - Each GPU gets its own chart */}
        {live_data?.gpu &&
          live_data.gpu.count > 0 &&
          live_data.gpu.detailed_info?.map((gpu, index) => (
            <div key={`gpu-${index}`} className={cn}>
              <Flex direction="column" gap="2" className="mb-2">
                <div className="flex items-center justify-between">
                  <label className="text-xl font-bold">{`GPU ${index + 1}: ${
                    gpu.name
                  }`}</label>
                  <span className="text-sm text-muted-foreground">
                    {formatBytes(gpu.memory_total)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="text-center">
                    <div className="font-medium">{t("chart.usage")}</div>
                    <div className="text-lg font-bold text-foreground">
                      {gpu.utilization}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{t("chart.gpu_memory")}</div>
                    <div className="text-lg font-bold text-foreground">
                      {((gpu.memory_used / gpu.memory_total) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">
                      {t("nodeCard.temperature")}
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {gpu.temperature}°C
                    </div>
                  </div>
                </div>
              </Flex>
              <ChartContainer
                config={{
                  gpu_usage: {
                    label: "GPU",
                    color: primaryColor,
                  },
                  gpu_memory: {
                    label: t("chart.gpu_memory"),
                    color: secondaryColor,
                  },
                  gpu_temp: {
                    label: t("nodeCard.temperature"),
                    color: colors[2],
                  },
                }}
              >
                <AreaChart
                  data={chartData.map((item) => ({
                    time: item.time,
                    gpu_usage:
                      item.gpu_detailed?.[index]?.usage ?? item.gpu_usage ?? 0,
                    gpu_memory:
                      item.gpu_detailed?.[index]?.memory ??
                      item.gpu_memory ??
                      0,
                    gpu_memory_raw:
                      item.gpu_detailed?.[index]?.mem_used ??
                      (gpu.memory_total *
                        (item.gpu_detailed?.[index]?.memory || 0)) /
                        100,
                    gpu_temp: item.gpu_detailed?.[index]?.temperature ?? 0,
                    client: item.client,
                  }))}
                  accessibilityLayer
                  margin={chartMargin}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    tickFormatter={timeFormatter}
                    interval={0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value, index) =>
                      index !== 0 ? `${value}%` : ""
                    }
                    orientation="left"
                    type="number"
                    tick={{ dx: -10 }}
                    mirror={true}
                  />
                  <ChartTooltip
                    cursor={false}
                    formatter={(value, name, props) => {
                      if (name === "gpu_temp") {
                        return `${value}°C`;
                      }
                      if (name === "gpu_usage") {
                        return `${Number(value).toFixed(1)}%`;
                      }
                      if (name === "gpu_memory") {
                        const percentage = Number(value).toFixed(1);
                        const rawValue = props.payload?.gpu_memory_raw || 0;
                        return `${formatBytes(rawValue)}(${percentage}%)`;
                      }
                      return `${Number(value).toFixed(1)}`;
                    }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={lableFormatter}
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    dataKey="gpu_usage"
                    animationDuration={0}
                    stroke={primaryColor}
                    fill={primaryColor}
                    opacity={0.8}
                    dot={false}
                  />
                  <Area
                    dataKey="gpu_memory"
                    animationDuration={0}
                    stroke={secondaryColor}
                    fill={secondaryColor}
                    opacity={0.8}
                    dot={false}
                  />
                  <Area
                    dataKey="gpu_temp"
                    animationDuration={0}
                    stroke={colors[2]}
                    fill={colors[2]}
                    opacity={0.6}
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          ))}
      </div>
    </Flex>
  );
};

export default LoadChart;
