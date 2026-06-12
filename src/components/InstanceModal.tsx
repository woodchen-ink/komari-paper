import { Suspense, lazy, useContext } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Theme } from "@radix-ui/themes";
import { useMatch, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { ChartSkeleton } from "@/components/Skeletons";
import { ThemeContext } from "@/contexts/ThemeContext";

const InstanceDetail = lazy(
  () => import("@/pages/instance/InstanceDetail"),
);

/**
 * 单节点详情弹窗.
 *
 * 由路由 /instance/:uuid 驱动 open: 路径匹配即打开, 关闭则导航回首页.
 * 首页保持挂载于弹窗之下 (本组件挂在根布局, 不走 Outlet 替换), 保留 URL 可直达/刷新/分享.
 */
export default function InstanceModal() {
  const match = useMatch("/instance/:uuid");
  const navigate = useNavigate();
  const { color } = useContext(ThemeContext);
  const uuid = match?.params.uuid;
  const open = Boolean(uuid);

  const handleOpenChange = (next: boolean) => {
    if (!next) navigate("/", { replace: false });
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="instance-modal-overlay" />
        <Dialog.Content
          className="instance-modal-content paper-card no-tilt"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Server detail</Dialog.Title>
          <Dialog.Close
            className="instance-modal-close"
            aria-label="Close detail"
          >
            <X size={18} />
          </Dialog.Close>
          {/* Radix Themes 组件 (SegmentedControl / Popover Tips 等) 经 Portal 渲染到
              最近的 <Theme> 容器, 故在此重新包一层 Theme. Theme 本身不滚动 (否则 Tips
              的 Popover portal 进来会被 overflow 裁掉), 滚动交给内层 instance-modal-scroll. */}
          <Theme
            appearance="light"
            accentColor={color}
            className="instance-modal-theme"
          >
            <div className="instance-modal-scroll">
              {uuid && (
                <Suspense fallback={<ChartSkeleton />}>
                  <InstanceDetail uuid={uuid} />
                </Suspense>
              )}
            </div>
          </Theme>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
