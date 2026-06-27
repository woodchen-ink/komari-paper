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

  // 到期计算: 剩余天数 + 已用周期占比
  const diffDays = Math.ceil(
    (new Date(expired_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const isLongTerm = diffDays > 36500;
  // 周期天数: 计费周期为有效正数时用作进度条分母, 否则不画条
  const cycleDays = billing_cycle > 0 ? billing_cycle : null;
  const showBar = !isLongTerm && diffDays > 0 && cycleDays !== null;

  // 已过周期占比 (0~100): 剩余越少占比越高
  const elapsedPercent = showBar
    ? Math.min(100, Math.max(0, ((cycleDays! - diffDays) / cycleDays!) * 100))
    : 0;

  // 阈值色: 与 PriceTags 到期分级一致
  const expiryColor =
    diffDays <= 0
      ? "var(--pen-red)"
      : diffDays <= 7
        ? "var(--pen-red)"
        : diffDays <= 15
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
              width: `${elapsedPercent}%`,
              minWidth: elapsedPercent > 0 ? "2px" : 0,
              backgroundColor: expiryColor,
              transition: "width 0.35s ease-out",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BillingBar;
