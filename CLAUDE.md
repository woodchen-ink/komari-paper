# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Komari Web UI 的「Editorial Paper」主题。设计语言参考 Stripe Press / Maggie Appleton / Are.na: 暖白纸面 + Fraunces 衬线印刷骨架 + 极克制的 Caveat 手写批注 + JetBrains Mono 等宽数据。保持 Komari 原有数据层 (RPC2 + Context) 不变。

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
- **字体栈**:
  - `--font-serif`: **Fraunces** (variable opsz/SOFT/WONK) + LXGW WenKai (中) — 主标题 / 正文 / UI
  - `--font-hand`: **Caveat** + LXGW WenKai — **仅** 用于批注 / 标签 / 空状态
  - `--font-mono`: **JetBrains Mono** + tabular-nums — 数字 / 流量 / 表格 / Recharts 坐标
  - 中文统一 LXGW WenKai (霞鹜文楷, jsDelivr CDN)
- **OpenType 特性**: `font-variant-numeric: oldstyle-nums proportional-nums` 默认; `.font-tabular` / `.font-mono` 切到 `tabular-nums lining-nums`
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
- `.eyebrow`: 杂志栏目名 (Fraunces italic + 字间距 + 全大写 + 极小号)
- `.drop-cap::first-letter`: 段首大字母, Fraunces 900 + opsz 144 + SOFT 100
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
- `src/components/Node.tsx`: 6 宫格节点卡 (`paper-card + node-card`)
  - 节点名 H3: Fraunces 600 + opsz 48
  - 分组: `#group` 红铅笔批注 (Caveat + var(--pen-red), 不加边框, 微旋)
  - 6 模块小标题: `.eyebrow` 类 (Fraunces italic 大写)
  - 6 模块数值: `font-mono font-tabular` 类 (JetBrains Mono + tabular)
  - 离线: 红铅笔点 + ink-pulse (透明度脉冲, 不是光晕)
- `src/components/NodeDisplay.tsx`:
  - 顶部章节: `eyebrow Fleet` + Fraunces 大号 H2 "Servers" + 右侧 mono 计数 (像杂志页眉)
  - 搜索框: 仅底部 1px 细线, focus 加红
  - GroupPill: 极简文字 tab + active 红铅笔下划 + 衬线 italic
- `src/components/UsageBar.tsx`: 极简方块条 (4-5px 高), 红/橙/墨色阈值; label 用 eyebrow 样式
- `src/components/NavBar.tsx`: 站点名 Fraunces 大号粗体 (opsz 144, WONK 1) + 副标 Caveat "— monitor" 微旋红色
- `src/pages/_layout.tsx`: 挂 `DynamicBackground` + `SmoothScroll` + `Outlet` + `InstanceModal` (详情弹窗常驻于布局, 叠加于首页之上)
- `src/pages/Index.tsx`: 渲染 `SummaryCards` (汇总卡组) + `NodeDisplay` (节点列表); 旧的单行 ticker 已替换
- `src/components/SummaryCards.tsx`: 首页顶部汇总卡组 (取代旧 ticker)
  - `eyebrow Overview` 章节标题 + 指标卡网格 (移动 2 列 / 平板 3 列 / 桌面 6 列): 在线节点 (走 `CountUp`) / 内存用量% / 磁盘用量% / 总流量↑↓ / 实时网速↑↓ / 月成本 (有计费节点才显示)
  - 每张卡: `eyebrow` 标签 + lucide 图标 + mono tabular 大号数值 + 副信息; 全部 `.no-tilt`
  - 下方地区概览条: 报刊式横排, 旗帜 + 在线计数 + 细竖线分隔
  - 派生计算全部在 `src/utils/summaryHelper.ts` (在线/地区数 / 内存磁盘求和 / 网络求和 / 财务); 月成本按 `billing_cycle` 折到 30 天, 剩余价值按距 `expired_at` 天数比例
  - 财务**经汇率折算成 CNY 统一汇总** (月成本 / 剩余价值显示人民币); 汇率源 `src/utils/exchangeRate.ts`: 以 CNY 为基准, 多源接口回退 (`open.er-api.com` → `exchangerate-api.com` → `frankfurter.app`, 均免 key), 当日 localStorage 缓存 + 过期缓存 + 内置默认值三级兜底, 离线/失败始终有可用汇率不阻塞渲染; `SummaryCards` 异步拉取, 未到位前先用默认汇率算
- `src/components/NavBar.tsx`: 站名走 `SplitText` 字符级入场, 副标 Caveat "— monitor" 静态保持
- 单节点详情 = **弹窗** (不再是独立页面):
  - `src/components/InstanceModal.tsx`: Radix `@radix-ui/react-dialog` 居中弹窗, 由路由 `/instance/:uuid` (`useMatch`) 驱动 open, 关闭则 `navigate("/")`; URL 仍保留 (可直达 / 刷新 / 分享)。Portal 内重新包一层 `<Theme>` (与 dropdown-menu / drawer 一致), 让 `SegmentedControl` 等 Radix Themes 组件正常渲染。样式见 global.css `.instance-modal-*` (暖墨遮罩, 无 backdrop-filter; 限宽 960px / 限高 + 内部滚动; 右上角红墨 ✕)
  - `src/pages/instance/InstanceDetail.tsx`: 详情内容 (供弹窗复用, 不含页面级布局/侧栏): `eyebrow Server` + Fraunces 大号 H1 (走 `SplitText`, `key={node.name}` 切换重跑) + mono UUID + `DetailsGrid` + Load/Ping 图表切换
  - 路由层: `/` 与 `/instance/:uuid` 都渲染 `Index` (首页保持挂载), 详情靠 `InstanceModal` 叠加; 旧 `src/pages/instance/index.tsx` (带侧栏的整页详情) 已删除
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
- 字体走 Google Fonts (`Fraunces` variable / `Caveat` / `JetBrains Mono`) + jsDelivr (`lxgw-wenkai-webfont`); 离线环境回退到系统衬线 (Georgia) / cursive / monospace
