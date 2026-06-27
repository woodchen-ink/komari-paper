import { useTranslation } from "react-i18next";
import { Wallet, CalendarClock } from "lucide-react";

/**
 * 价格 + 到期剩余进度条 (便签卡用, 取代底部价格/到期 badge)
 * - 价格: 图标 + 文本 (currency+price/周期), 与脚注同级淡色
 * - 到期: 剩余时长进度条 (已过周期占比) + 剩余天数文本, 阈值色 (≤7 红 / ≤15 橙 / 其余绿)
 * - 免费 / 长期 / 一次性 / 无价格: 不渲染进度条, 只按需出价格文本
 * 不引入图表库, 进度条为纯 div 宽度占比。
 */

type BillingBarProps = {
  price?: number;
  billing_cycle?: number;
  currency?: string;
  expired_at?: string | number;
};

/** 计费周期文案 (与 PriceTags 同源, 仅用于价格行) */
function getCycleText(
  billing_cycle: number,
  t: ReturnType<typeof useTranslation>[0],
): string {
  if (billing_cycle >= 27 && billing_cycle <= 32) return t("common.monthly");
  if (billing_cycle >= 87 && billing_cycle <= 95) return t("common.quarterly");
  if (billing_cycle >= 175 && billing_cycle <= 185) return t("common.semi_annual");
  if (billing_cycle >= 360 && billing_cycle <= 370) return t("common.annual");
  if (billing_cycle >= 720 && billing_cycle <= 750) return t("common.biennial");
  if (billing_cycle >= 1080 && billing_cycle <= 1150) return t("common.triennial");
  if (billing_cycle >= 1800 && billing_cycle <= 1850) return t("common.quinquennial");
  if (billing_cycle === -1) return t("common.once");
  return `${billing_cycle} ${t("nodeCard.time_day")}`;
}

const BillingBar = ({
  price = 0,
  billing_cycle = 30,
  currency = "￥",
  expired_at = Date.now() + 30 * 24 * 60 * 60 * 1000,
}: BillingBarProps) => {
  const [t] = useTranslation();

  // 无价格信息: 整块不渲染 (price === 0 视为未设置)
  if (price === 0) return null;

  const priceText =
    price === -1
      ? t("common.free")
      : `${currency}${price}/${getCycleText(billing_cycle, t)}`;

  // 到期计算: 剩余天数 (进度条用剩余充裕度, 见下方 fillPercent)
  const diffDays = Math.ceil(
    (new Date(expired_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const isLongTerm = diffDays > 36500;
  // 进度条分母: 一个计费周期天数 (有效正数才画条); 无周期 (一次性/未知) 不画条
  const cycleDays = billing_cycle > 0 ? billing_cycle : null;
  // 长期: 画七彩满条; 普通: 有有效周期且未过期才画条
  const showBar = isLongTerm || (diffDays > 0 && cycleDays !== null);

  // 填充 = 剩余时间的充裕度: 剩余占一个计费周期的比例, 剩余 ≥ 一个周期即满条。
  // 注: 拿不到本期续费起点, 故不画"已过占比"(会因周期<剩余天数而恒空), 改画"剩余充裕度"。
  const fillPercent = isLongTerm
    ? 100
    : cycleDays !== null
      ? Math.min(100, Math.max(0, (diffDays / cycleDays) * 100))
      : 0;

  // 阈值色: 按剩余充裕度百分比分档, 与进度条长度一致 (≤15% 红 / ≤30% 橙 / 其余绿)
  // 已过期 fillPercent=0 落入红; 长期 fillPercent=100 落入绿
  // 无法算充裕度时 (有价格但无有效周期, 不画条) 文本用中性墨色, 不误判为红
  const canRate = isLongTerm || cycleDays !== null;
  const expiryColor = !canRate
    ? "var(--ink-mute)"
    : fillPercent <= 15
      ? "var(--pen-red)"
      : fillPercent <= 30
        ? "var(--data-3)"
        : "var(--data-2)";

  const expiryText =
    diffDays <= 0
      ? t("common.expired")
      : isLongTerm
        ? t("common.long_term")
        : t("common.expired_in", { days: diffDays });

  return (
    <div className="flex flex-col gap-1 text-[11px]" style={{ color: "var(--ink-mute)" }}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="flex items-center gap-1 min-w-0 font-mono">
          <Wallet className="size-3 shrink-0" />
          <span className="truncate" title={priceText}>{priceText}</span>
        </span>
        <span
          className="flex items-center gap-1 shrink-0 font-mono font-semibold"
          style={{ color: expiryColor }}
        >
          <CalendarClock className="size-3" />
          {expiryText}
        </span>
      </div>
      {showBar && (
        <div
          style={{
            width: "100%",
            height: "4px",
            backgroundColor: "rgba(42, 38, 34, 0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${fillPercent}%`,
              minWidth: fillPercent > 0 ? "2px" : 0,
              // 长期: 明亮七彩渐变满条 (czl-code-skill §1.7.2 调色板); 普通: 单色阈值条
              background: isLongTerm
                ? "linear-gradient(90deg, var(--chart-bright-1), var(--chart-bright-2), var(--chart-bright-3), var(--chart-bright-6), var(--chart-bright-3), var(--chart-bright-5), var(--chart-bright-4))"
                : expiryColor,
              transition: "width 0.35s ease-out",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BillingBar;
