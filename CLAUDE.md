# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Komari Web UI 的「Editorial Paper」主题。设计语言参考 Stripe Press / Maggie Appleton / Are.na: 暖白纸面 + EB Garamond 人文衬线印刷骨架 + 极克制的手写批注 + JetBrains Mono 等宽数据。保持 Komari 原有数据层 (RPC2 + Context) 不变。

## Development Commands

- `npm install` — 安装依赖
- `npm run dev` — 启动 Vite 开发服务器
- `npm run build` — TypeScript 类型检查 + Vite 生产构建（输出到 `dist/`）
- `npm run lint` — ESLint
- `npm run preview` — 预览生产构建

## Architecture

### 数据层 (保留 Komari 原架构)
- `src/contexts/`: `PublicInfoContext`、`LiveDataContext` (实时数据)、`NodeListContext` (节点元信息)、`RPC2Context` (RPC 调用)
- `src/lib/api.ts`、`src/lib/rpc2.ts`: API / RPC 客户端
- `src/utils/regionHelper.ts`: 地区工具唯一归属地 —— `resolveRegionCode` (旗帜 emoji / 两字母 ISO / 特殊 emoji → 大写代码, 回退 `UN`, 结果即旗帜 SVG 文件名)、`regionFlagSrc` (**全项目唯一的旗帜路径约定, 勿在别处拼**)、`isRegionMatch` / `getRegionDisplayName` 等。`Flag.tsx` 只负责渲染, 不再自带解析逻辑
- `src/utils/groupingHelper.ts`: 分组维度抽象 —— `GroupDimension` (`"group" | "region"`)、`bucketKeyOf` (按维度取桶键, 无值返回 null)、`hasCustomGroups` (决定是否自动退回按地区)、`regionBucketsOf` (地区归桶 + 计数, 多者在前)。首页地区筛选与详情页侧栏共用这一份
- `src/types/LiveData.tsx`: `LiveData`、`Record` 实时数据类型
- `src/contexts/NodeListContext.tsx`: `NodeBasicInfo` 节点元信息类型

### 视觉层 (Editorial Paper)

#### 全局样式 `src/global.css`
- **设计令牌**: 单一 light 主题, 暖白纸 + 暖灰墨, 不支持暗色
  - `--paper`: 主纸张 (#f4efe6, 暖白偏 Stripe Press 取色)
  - `--paper-card`: 卡片本体 (#fbf7ee, 近米白)
  - `--paper-cool`: 冷调副纸 (#ebe9e1, 用于侧栏 / 二级面板, 与主纸对比)
  - `--paper-soft`: hover / 内嵌格子色
  - `--ink` / `--ink-soft` / `--ink-mute`: 暖灰黑系文字 (#2a2622 / #4d463d / #7c7062)
  - `--ink-line` / `--ink-line-soft`: 边框 (主文字色实色 / 22% 透明软描边)
  - `--pen-red` / `--pen-blue`: 红蓝铅笔批注色 (其他笔色已删, 不堆多色)
  - `--data-1..5`: Recharts / 数据可视化色环 (与笔色同源, 偏冷静)
  - `--rule-line` (10% 暖墨色) / `--margin-line` (实红色, 装订线) / `--highlight` (荧光黄)
- **纸纹背景**: 单层 SVG `feTurbulence` 极淡噪点 (data URI 内联), 不再画笔记本横线 (=作业本廉价感)
- **字体加载写在 `index.html` 的 `<link>`, 不要写回 CSS**: Tailwind v4 的 `@import "tailwindcss"` 就地展开后, 后续 `@import url(...)` 不再位于文件顶部, 按 CSS 规范失效并被构建静默丢弃 (产物里搜不到 googleapis, 全站悄悄退回系统回退字体 —— 这个坑踩过一次, 整套字体从未真正上线)。`<link>` 形式还能与 JS/CSS 并行下载并配 `preconnect`
  - **只用 Google Fonts 一个来源** (`fonts.googleapis.com` + `fonts.gstatic.com`), 不引第三方 CDN; 三个拉丁族一次请求, 按 `unicode-range` 分片, 浏览器只下命中的分片
- **中文刻意不加载 webfont**: 三个栈都以通用族 (`serif` / `cursive` / `monospace`) 收尾, 中文由系统字体承担 (Windows 宋体 / macOS 宋体 SC, 都是衬线, 不与拉丁骨架冲突)。**不要往栈里加中文 webfont "修"它** —— 中文族体积远大于拉丁族, 而本主题中文只出现在节点名 / 分组 / 图表任务名等少量位置, 不值这个首屏代价
- **字体栈**:
  - `--font-serif`: **EB Garamond** (variable wght 400..800 + italic) — 主标题 / 正文 / UI。选它是要"有笔意": 16 世纪冲压字源的人文老式体, 重心倾斜、收笔带笔锋, 不是 Times 那种硬朗 transitional
  - `--font-hand`: **Caveat** — **仅** 用于批注 / 标签 / 空状态
  - `--font-mono`: **JetBrains Mono** — 数字 / 流量 / 表格 / Recharts 坐标
  - `--font-display` + `--display-axes`: 印刷主数值用。EB Garamond 只有 wght 轴故 axes 为 `normal`; **该 token 是换字体的唯一入口 —— 组件层不得再写任何字体专有的 `fontVariationSettings`** (换字体时那些设置会静默失效, 之前 Fraunces 的 opsz/SOFT/WONK 就是这么散在 5 个组件里的)
- **必须覆盖 Radix Themes 字体 token**: Radix 在 `.radix-themes` 上定义 `--default-font-family: -apple-system, …, "Segoe UI"` 等 6 个 token, 且是**非 layer 规则**, 压过 `@layer base` 的 `html/body`; `main.tsx` 里 `global.css` 又先于 Radix 样式导入, 同特异性下 Radix 获胜 → 所有 `.rt-*` 组件退回系统 sans。`global.css` 用双类名 `.radix-themes.radix-themes` (0,2,0) 把 6 个 token 接到纸质字体栈, 不依赖导入顺序也不用 `!important`
- **OpenType 特性**: `font-variant-numeric: oldstyle-nums proportional-nums` 默认; `.font-tabular` / `.font-mono` / `.num-display` 切到 `tabular-nums lining-nums`
- **暗色变体**: 不存在。`@custom-variant dark` 指向 `.never-active`, shadcn / Tailwind 的 `dark:` 前缀永不命中
- **没有 backdrop-filter**: 整个项目不再使用毛玻璃 / SVG 折射

#### 卡片类
- `.paper-card`: 主卡片 (Node 卡 / Summary / 详情弹窗 / 图表块)
  - 暖白底 + 1px 软描边 (主文字色 22% 透明) + 几乎方角 (`2px 3px 2px 3px`)
  - 双层阴影: 1px 硬偏移 (纸厚) + 12-24px 大柔影 (悬浮)
  - **卡片不再歪斜**: `--tilt` 旋转 + `nth-child(6n+1..6)` 角度规则已全部移除
  - hover: 仅 translateY(-2px) + 阴影加深, 35ms cubic-bezier (无旋转回正)
  - 工具类 `.no-tilt`: 卡片歪斜已全局移除, 此类退化为 no-op 别名, 兼容历史标记
- `.paper-strip`: NavBar / 不可旋转的纸条 (单层硬阴影)

#### Editorial 装饰类 (按需用, 高度克制)
- `.eyebrow`: 杂志栏目名 (衬线 italic + 字间距 + 全大写 + 极小号)
- `.num-display`: **印刷主数值** (衬线 + `--display-axes` + tabular/lining)。卡内只给主数值用 (资源百分比 / 延迟 / 丢包), 辅助小字继续 `.font-mono`, 靠"衬线大数 + 等宽附表"建立印刷层次而非通篇等宽的终端感。定义在 `@layer base` 之外, 天然压过 base 里 `.font-mono` 的 `!important` 字族
- `.leader`: **引导点线** (目录 / 账本里连接标签与数值的那排点)。作 flex 子项吃掉中间空档, 空间不足先缩自己 (`min-width: .6rem` 保底)
- `.rule-bar` / `.rule-bar-fill`: **标尺式用量条** (基线 + 四分刻度 + 3px 实心墨条), 取代纯实色填充块 —— 后者是最"web 仪表盘"的元素
- `.node-masthead-rule`: 节点卡标题下的 2px 粗墨线 (刊头骨架)
- `.drop-cap::first-letter`: 段首大字母, 衬线 800 (EB Garamond 最粗档)
- `.editorial-rule` / `.thick`: 极细 (1px) / 加粗 (2px) 水平分隔线
- `.editorial-margin::before`: 元素左侧 1px 红墨竖线 (装订线 / 强调段)
- `.corner-stamp`: 卡片右上角圆形红圈印章 (Caveat 字 + 旋转 -12deg, absolute)
- `.hand-underline`: 红波浪下划
- `.hand-highlight`: 荧光笔黄背景
- `.font-hand`: 强制 Caveat (用作批注/便签贴)

#### 动效组件 (手撸, 不引第三方动画库)
- `src/components/SplitText.tsx`: 字符级 stagger 入场, `Array.from` 拆 codepoint (兼容中文/emoji); 默认 step 35ms / duration 520ms / ease-out cubic + 微下移 + 2px blur; `[data-split-text] .split-text-char` keyframe 在 `global.css` 定义, `prefers-reduced-motion` 自动停。**只用于首屏封面感**: NavBar 站名 / 详情页 H1 服务器名
- `src/components/CountUp.tsx`: `requestAnimationFrame` + ease-out cubic 数字滚动, 600ms; 接收 `string | number`, 仅滚动第一段整数 (前后缀如 ` / 10` 原样穿过); `currentRef` 兜底动画中断; reduced-motion 直显; 用于首页 Summary 在线节点数等纯整数项, 不用于带单位/方向箭头的传输量

#### 关键组件
- `src/components/DynamicBackground.tsx`: 极简, 仅渲染极淡 vignette + 用户自定义背景图 (sepia + multiply 半透明叠层, "夹照片"风格); 不再画咖啡渍 / 墨点
- `src/components/Node.tsx`: 便签风格紧凑节点卡 (`paper-card + node-card`), 信息密度高且分三级层次; `NodeGrid` 响应式网格 (手机 1 / 平板 2 / 笔记本 3 / 大屏 `2xl` 4 列, `items-stretch` 同行等高)
  - **三级信息层次** (靠规尺线 + 字阶分层, 不靠底色块): ① 资源块 (`.node-metric-block` 账本栏线 —— 无上框 / 下细线 / `::after` 中缝竖线, 视觉重心) ② 网络/健康 (主纸平铺墨色) ③ 脚注 (`.node-card-meta` 淡色 + 顶部细线)
  - **印刷收敛**: 卡内常态只有墨黑 + 少量红。用量条 / MiniBars / BillingBar 到期的常态档全部走墨色, 只有警示 (赭黄) 与危险 (红) 才上色; IP 版本 badge 也从绿底绿字收敛为墨色描边。满屏绿会稀释红的警示力
  - 卡内结构 (在线): **刊头** (`No.03` ···· uptime, `.leader` 点线连接。uptime 放这里是因为版式上它等同刊期/日期, 也让脚注行让出一格; 右端**不放地区代码** —— 旗帜与 `#group` 已各带一次地域信息, 且不少用户直接按国家简码分组, 再加一次是三重冗余) → 名称行 (旗 + 名衬线 600 + `#group` 红铅笔批注) → `.node-masthead-rule` 2px 粗线 → **资源 2×2** (CPU/内存/磁盘/负载, 每格 `eyebrow` 标签 + `.num-display` 数值 + `UsageBar compact` + 已用/总量 mono 小字) → **网络 2 列** (实时网速 ↑↓ / 总流量 ↑↓) → **健康 2 列** (延迟 / 丢包, `.num-display` 数值带阈值色 + `MiniBars`; 延迟 ≤100 墨 / ≤300 黄 / 更高红, 丢包 0 墨 / <5% 黄 / ≥5% 红) → `BillingBar` (价格 ···· 到期, 点线连接) → **脚注** (TCP ···· UDP ···· 进程 点线连接 / OS·arch·CPU型号) → tags (`PriceTags layout="grid2" showPrice={false}`, 仅自定义 tags, 无 tags 不占位)
  - 刊头编号来自 `NodeGrid` 传入的 `index` prop (从 1 起)
  - 脚注点线行在极窄卡片下先缩点线, 仍放不下才裁切尾部 (`overflow-hidden`), 完整内容挂在 `title` 上
  - 价格/到期不再走底部 badge: 改由 `BillingBar` 在脚注上方渲染 (价格 `Wallet` 图标 + 文本 ···· 到期剩余充裕度进度条 + 剩余天数, 阈值色 ≤15% 红 / ≤30% 橙 / 其余墨色; 无有效周期不画条)。**长期 = 墨色 45° 斜纹满条** (印刷里斜纹表示"不适用 / 无限", 与"真剩满格"的实心条区分); 原 `--chart-bright-1..6` 七彩渐变已删, token 一并移除
  - 卡片 `flex flex-col h-full gap-2.5`; tags 区 `mt-auto` (有 tags 才渲染), 网格同行等高靠 `items-stretch`
  - 负载基准: `load1 / cpu_cores` 折百分比; 文字显示真实比例 (可超过 100%), 进度条按 100% 封顶; 多 ping task 取延迟最低的 task
  - 离线: 红铅笔脉冲点 + 名 + 分组 + Caveat "offline" 批注 + 价格 (离线卡仍走 `PriceTags` 带价格); ping 不拉取
  - `formatUptime` 仍 export (被 `DetailsGrid` / `NodeTable` 引用)
- `src/hooks/useNodePing.ts`: 便签卡 ping 数据 hook —— RPC2 `common:getRecords` 按 uuid 拉最近 1h, 汇总成 `{latest, loss, values[]}`
  - **控制首页 N 节点请求量**: 模块级 `cache` (同 uuid 多组件共享一份, 不重复请求) + 60s 节流 + 按 uuid 错峰 0~800ms 首拉 + 离线节点 `enabled=false` 不拉
  - 多 task 取延迟最低者; 丢包率 = `value<0 计数 / 总计 × 100`; 失败/无数据返回 null 不阻塞
- `src/components/MiniBars.tsx`: 纯 CSS 迷你柱图 (不引 Recharts), 柱高 = 延迟相对峰值占比, 阈值色 (≤100 墨色 `--ink-soft` / ≤300 赭黄 `--data-3` / 更高 + 丢包点红 `--pen-red`; loss 模式正常点用 `--ink-line-soft` 压成底噪); 跨洋线路正常延迟 (150~280ms) 落在黄档, 红色只留给真故障
- `src/components/DetailsGrid.tsx`: 单节点详情主信息区, 三段 (Live 实时指标 / GPU / Spec 静态规格)
  - Live: CPU/内存/磁盘/swap (% + 已用/总量 + bar) + 网速 + 总流量 + 负载 1/5/15 + 连接/进程 + uptime
  - 负载详情与首页便签卡同口径: `load1 / cpu_cores` 的真实百分比用于文字, 进度条只显示 0-100% 范围
  - GPU: 有才显示, 每块利用率 + 显存 + 温度; Spec: CPU型号·核心 / arch / 虚拟化 / GPU名 / OS / 内核 / 最后更新
  - 便签卡收紧后, 流量/连接/负载/swap/CPU用量/内存磁盘明细/GPU 的**完整数据全在此查看**
- `src/components/PriceTags.tsx`: 价格/到期/标签徽章组, `layout` prop —— `"flow"` (默认, Flex 自由换行, 表格/admin 用) / `"grid2"` (每行 2 个定宽 + truncate + title, 便签卡用); `showPrice` prop —— `false` 时只渲染自定义 tags, 价格/到期交给 `BillingBar` (便签卡在线卡用)
- `src/components/BillingBar.tsx`: 便签卡价格 + 到期剩余进度条 (取代底部价格/到期 badge), 价格 `Wallet` 图标 + 文本, 到期 = 已过周期占比纯 div 进度条 + 剩余天数文本 (阈值色与 PriceTags 到期分级一致); `price===0` 不渲染, 免费/长期/一次性/无有效周期只出文本不画条
- `src/components/NodeDisplay.tsx`:
  - 顶部章节: `eyebrow Fleet` + 衬线大号 H2 "Servers" + 右侧 mono 计数 (像杂志页眉; 有筛选时显示 `N online · M in <范围>`)
  - 过滤链 = 地区 → 分组 → 搜索词; 地区与分组可叠加, 搜索只在已筛定范围 (`scopedNodes`) 内进行
  - **不自建地区筛选行**: 地区的选择入口是 `SummaryCards` 的地区条, 本组件只接收 `activeRegion` prop。概览与筛选是同一份数据, 各画一条就是重复
  - `GroupPill`: 极简文字 tab + active 红铅笔下划 + 衬线 italic, 选中值存 localStorage `nodeSelectedGroup`
  - 搜索框: 仅底部 1px 细线, focus 加红
- `src/components/UsageBar.tsx`: 标尺式用量条 (`.rule-bar`), 阈值色 **常态墨色 `--ink-soft` / ≥60 赭黄 / ≥80 红**; 非 compact 变体额外出 eyebrow label + `.num-display` 百分比
- `src/components/NavBar.tsx`: 站点名衬线大号粗体 + 副标 Caveat "— monitor" 微旋红色
- `src/pages/_layout.tsx`: 挂 `DynamicBackground` + `SmoothScroll` + `Outlet`; 首页内容区固定 `max-w-384` (1536px), NavBar 同宽对齐 (`mainContentWidth` 主题配置项未接入, 宽度写死)
- `src/pages/Index.tsx`: 渲染 `SummaryCards` (汇总卡组) + `NodeDisplay` (节点列表); 内容壳同样 `max-w-384`; 旧的单行 ticker 已替换
- `src/components/SummaryCards.tsx`: 首页顶部汇总卡组 (取代旧 ticker)
  - `eyebrow Overview` 章节标题 + 指标卡网格 (移动 2 列 / 平板 3 列 / 桌面 6 列): 在线节点 (走 `CountUp`) / 内存用量% / 磁盘用量% / 总流量↑↓ / 实时网速↑↓ / 月成本 (有计费节点才显示)
  - 每张卡: `eyebrow` 标签 + lucide 图标 + mono tabular 大号数值 + 副信息; 全部 `.no-tilt`
  - 下方地区条 (`RegionChip`): 报刊式横排, 旗帜 + 大写代码 + 计数, **同时是节点列表的地区筛选器** (概览与筛选同源, 不再各画一条); 计数走**总节点数**而非在线数 —— 必须与点下去筛出的数量一致
  - 地区筛选状态的唯一真值在 `src/pages/Index.tsx`: 该页持有 `selectedRegion` (localStorage `nodeSelectedRegion`) 与 `regionBucketsOf` 派生的 `regions`, 校验后把 `activeRegion` 同时下发给 `SummaryCards` (选) 和 `NodeDisplay` (筛)。**不要改回各组件自己 `useLocalStorage`** —— 该 hook 是各组件独立 state, 同 key 不跨组件同步
  - 派生计算全部在 `src/utils/summaryHelper.ts` (在线/地区数 / 内存磁盘求和 / 网络求和 / 财务); 月成本按 `billing_cycle` 折到 30 天, 月成本卡副行显示年成本估算 (`月成本 × 12`, 直观年度支出, 不再用剩余价值——月付节点几乎不计入无意义)
  - 财务**经汇率折算成 CNY 统一汇总** (月成本 / 年成本估算显示人民币); 汇率源 `src/utils/exchangeRate.ts`: 以 CNY 为基准, 多源接口回退 (`open.er-api.com` → `exchangerate-api.com` → `frankfurter.app`, 均免 key), 当日 localStorage 缓存 + 过期缓存 + 内置默认值三级兜底, 离线/失败始终有可用汇率不阻塞渲染; `SummaryCards` 异步拉取, 未到位前先用默认汇率算
- `src/components/NavBar.tsx`: 站名走 `SplitText` 字符级入场, 副标 Caveat "— monitor" 静态保持
- 单节点详情 = **独立页面** (`/instance/:uuid` 走独立路由, 非弹窗):
  - `src/pages/instance/index.tsx`: 整页布局, 锁 `calc(100vh - 5rem)` 高度、左右两栏各自内部滚动
    - 左侧栏 (`showServerListInDetails` 开 + 非移动端才显示): `.no-tilt` 纸卡, 顶部 `eyebrow Index` + 衬线 "Servers", 分桶用 `.eyebrow` sticky 章节, active 项左侧红铅笔 3px 实线
    - **分组维度可切**: 标题右侧 `DimensionTab` (`Group / Region`, eyebrow 尺寸文字 tab, active 红铅笔色), 选择存 localStorage `instanceGroupDimension`; 全站**一个自定义分组都没有时自动按地区分**并隐藏该切换 (否则只会剩一个 "Ungrouped" 桶, 等于没分组)
    - 主区头卡: `.no-tilt` + `eyebrow Server` + 衬线大号 H1 (走 `SplitText`, `key={node.name}` 切换重跑) + mono UUID + `DetailsGrid` + Load/Ping 图表切换
- 图表 (`PingChart`, `LoadChart`):
  - 折线色: 墨水笔色环 (#c23b22 红 / #2c5d8f 蓝 / #5a7a3a 绿 / #b07a1f 黄褐 / #7e4ea2 紫 / ...)
  - 网格: 1px 极淡虚线 (`stroke-dasharray: 2 4`)
  - 折线粗细: 1.5px 干净, 不加墨晕
  - 坐标 / tooltip 数字: JetBrains Mono
  - **PingChart 高度约束**: `ChartContainer` 必须用 `aspect-auto h-[clamp(220px,38vh,360px)]` 覆盖 shadcn 默认 `aspect-video`, 否则 2k+ 屏图表会撑到 600+px; latestValues 卡 `minmax(200px,1fr)` + `p-3`; 整页 `Flex gap="2"`; cutPeak/showAll 行用 `border-t border-(--ink-line-soft)` 挂在图表底

### Provider 层级 (src/main.tsx)
```
ErrorBoundary → BrowserRouter → ThemeContext (固定 light) → Radix <Theme appearance="light"> → RPC2Provider → PublicInfoProvider → 路由
```
`appearance` / `setAppearance` 仍由 `ThemeContext` 提供但永远固定为 `"light"`, `<ThemeSwitch>` 是 no-op 组件 (避免 admin 调用点报错)。

### 关键数据字段映射 (nezha → komari)
| Nezha 字段 | Komari 字段 |
|---|---|
| `cpu` | `live.cpu.usage` |
| `mem` / `mem_total` | `live.ram.used` / `basic.mem_total` |
| `stg` / `disk_total` | `live.disk.used` / `basic.disk_total` |
| `up` / `down` | `live.network.up` / `live.network.down` |
| `net_in/out_transfer` | `live.network.totalDown` / `totalUp` |
| `country_code` | `basic.region` (国家旗帜) |
| `tcp` / `udp` / `process` | `live.connections.tcp/udp` / `live.process` |
| `uptime` | `live.uptime` |
| `load_1/5/15` | `live.load.load1/5/15` |
| `platform` / `arch` | `basic.os` / `basic.arch` |

## 主题配置 (komari-theme.json)
- `name`: "Komari Paper"
- `short`: "paper"
- 保留 Komari 原有 6 项配置: `showIpTagsInCard`、`showServerListInDetails`、`backgroundImageUrlDesktop/Mobile`、`offlineServerPosition`、`customFooterHtml`、`mainContentWidth`

## 构建产出
- `dist/`: 静态资源
- 主题打包: `dist/` + 根目录的 `komari-theme.json` + `preview.png` → 压缩为 ZIP, 在 Komari 后台主题管理上传

## 自动发布 (`.github/workflows/release.yaml`)
- 触发: 推送到 `main` 分支, 或在 Actions 页面手动 `workflow_dispatch`
- 版本号: `YY.MM.DD` (同一天多次发布自动追加 `-2` / `-3` 序号), tag 为 `vYY.MM.DD[-N]`
- 流程: `npm ci` → `npm run build` → 注入版本到 `komari-theme.json` → 回写 commit 到 `main` 分支 (带 `[skip ci]`) → 打包 `dist/ + komari-theme.json + preview.png` 为 `komari-paper-vYY.MM.DD[-N].zip` → 创建正式 GitHub Release (`prerelease: false` + `make_latest: true`) + artifact
- Release 说明: 自动聚合上一个 tag 至 HEAD 之间的非合并提交作为 changelog
- 安装: 在 Releases 页面下载该 zip, 上传到 Komari 后台 → 主题管理

## 已知约定
- 禁止使用 `localStorage` 存认证态 (保持 Komari 现有 cookie 机制)
- **不再有暗色模式**: html 上不挂 `.dark` / `.dark-theme`; 全部 shadcn / Tailwind 的 `dark:` 前缀永不命中。如要重新启用暗色, 需在 `global.css` 恢复 `@custom-variant dark` 的真实选择器, 并新增 `.dark` 块的 token 定义
- 网页 `theme-color` meta 与 `index.html` 首屏骨架 `html/body` 背景统一为暖白纸 `#f4efe6`
- 字体全部走 Google Fonts (`EB Garamond` / `Caveat` / `JetBrains Mono`), **不引第三方 CDN**, 不加载中文 webfont; 离线环境回退到系统衬线 (Georgia) / cursive / monospace
