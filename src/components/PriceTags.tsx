import { Badge, Flex } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";

type BadgeColor =
  | "ruby" | "gray" | "gold" | "bronze" | "brown" | "yellow" | "amber"
  | "orange" | "tomato" | "red" | "crimson" | "pink" | "plum" | "purple"
  | "violet" | "iris" | "indigo" | "blue" | "cyan" | "teal" | "jade"
  | "green" | "grass" | "lime" | "mint" | "sky";

const TAG_COLORS: BadgeColor[] = [
  "ruby", "gray", "gold", "bronze", "brown", "yellow", "amber", "orange",
  "tomato", "red", "crimson", "pink", "plum", "purple", "violet", "iris",
  "indigo", "blue", "cyan", "teal", "jade", "green", "grass", "lime",
  "mint", "sky",
];

/** 解析带 <color> 后缀的自定义标签 */
function parseTagWithColor(tag: string): { text: string; color: BadgeColor | null } {
  const colorMatch = tag.match(/<(\w+)>$/);
  if (colorMatch) {
    const color = colorMatch[1].toLowerCase();
    const text = tag.replace(/<\w+>$/, "");
    if (TAG_COLORS.includes(color as BadgeColor)) {
      return { text, color: color as BadgeColor };
    }
  }
  return { text: tag, color: null };
}

/** 计算到期文案与颜色 (剩余天数分级: ≤7 红 / ≤15 橙 / 其余绿) */
function getExpiry(
  expired_at: string | number,
  t: ReturnType<typeof useTranslation>[0],
): { text: string; color: BadgeColor } {
  const diffDays = Math.ceil(
    (new Date(expired_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const color: BadgeColor = diffDays <= 7 ? "red" : diffDays <= 15 ? "orange" : "green";
  let text: string;
  if (diffDays <= 0) text = t("common.expired");
  else if (diffDays > 36500) text = t("common.long_term");
  else text = t("common.expired_in", { days: diffDays });
  return { text, color };
}

/** 计费周期文案 */
function getBillingText(
  price: number,
  billing_cycle: number,
  currency: string,
  t: ReturnType<typeof useTranslation>[0],
): string {
  if (price === -1) return t("common.free");
  let cycle: string;
  if (billing_cycle >= 27 && billing_cycle <= 32) cycle = t("common.monthly");
  else if (billing_cycle >= 87 && billing_cycle <= 95) cycle = t("common.quarterly");
  else if (billing_cycle >= 175 && billing_cycle <= 185) cycle = t("common.semi_annual");
  else if (billing_cycle >= 360 && billing_cycle <= 370) cycle = t("common.annual");
  else if (billing_cycle >= 720 && billing_cycle <= 750) cycle = t("common.biennial");
  else if (billing_cycle >= 1080 && billing_cycle <= 1150) cycle = t("common.triennial");
  else if (billing_cycle >= 1800 && billing_cycle <= 1850) cycle = t("common.quinquennial");
  else if (billing_cycle === -1) cycle = t("common.once");
  else cycle = `${billing_cycle} ${t("nodeCard.time_day")}`;
  return `${currency}${price}/${cycle}`;
}

type TagItem = { text: string; color: BadgeColor; title?: string };

/**
 * 价格 / 到期 / 自定义标签徽章组
 * layout="flow" (默认): Flex 自由换行, 徽章宽度随内容 (表格 / admin 用)
 * layout="grid2": 每行最多 2 个, 徽章定宽 + truncate + title 悬停看全 (便签卡用)
 */
const PriceTags = ({
  price = 0,
  billing_cycle = 30,
  currency = "￥",
  expired_at = Date.now() + 30 * 24 * 60 * 60 * 1000,
  tags = "",
  ip4 = "",
  ip6 = "",
  layout = "flow",
  ...props
}: {
  expired_at?: string | number;
  price?: number;
  billing_cycle?: number;
  currency?: string;
  tags?: string;
  ip4?: unknown;
  ip6?: unknown;
  layout?: "flow" | "grid2";
} & React.ComponentProps<typeof Flex>) => {
  const [t] = useTranslation();

  // 收集所有徽章为统一数据, 再按 layout 渲染
  const items: TagItem[] = [];
  if (ip4 || ip6) {
    items.push({
      text: ip4 && ip6 ? "V10" : ip4 ? "V4" : "V6",
      color: "green",
    });
  }
  if (price !== 0) {
    const billing = getBillingText(price, billing_cycle, currency, t);
    items.push({ text: billing, color: "iris", title: billing });
    const expiry = getExpiry(expired_at, t);
    items.push({ text: expiry.text, color: expiry.color, title: expiry.text });
  }
  const tagList = (tags ?? "").split(";").filter((tag) => tag.trim() !== "");
  tagList.forEach((tag, index) => {
    const { text, color } = parseTagWithColor(tag);
    items.push({
      text,
      color: color || TAG_COLORS[index % TAG_COLORS.length],
      title: text,
    });
  });

  if (items.length === 0) return null;

  // 便签卡: 每行 2 个固定宽, 超长省略号 + title 悬停看全
  if (layout === "grid2") {
    return (
      <div className="grid grid-cols-2 gap-1 w-full">
        {items.map((item, i) => (
          <Badge
            key={i}
            color={item.color}
            variant="soft"
            className="w-full min-w-0"
            title={item.title}
          >
            <span className="block w-full truncate text-xs">{item.text}</span>
          </Badge>
        ))}
      </div>
    );
  }

  // 默认 flow: 自由换行 (表格 / admin)
  return (
    <Flex gap="1" {...props} wrap="wrap">
      {items.map((item, i) => (
        <Badge key={i} color={item.color} variant="soft" className="text-sm">
          <label className="text-xs">{item.text}</label>
        </Badge>
      ))}
    </Flex>
  );
};

export default PriceTags;
