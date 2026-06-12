import { LiveDataProvider } from "@/contexts/LiveDataContext";
import NavBar from "../components/NavBar";
import { Outlet } from "react-router-dom";
import { NodeListProvider } from "@/contexts/NodeListContext";
import DynamicBackground from "../components/DynamicBackground";
import SmoothScroll from "../components/SmoothScroll";
import InstanceModal from "../components/InstanceModal";

// 纸 + 手写主题布局: DynamicBackground 渲染纸面装饰 (vignette + 咖啡渍)
const IndexLayout = () => {
  const InnerLayout = () => {
    return (
      <div className="layout flex flex-col w-full min-h-screen relative">
        <DynamicBackground />
        <SmoothScroll />
        <main className="main-content w-full px-3 md:px-4 pb-8 relative z-10 flex-1">
          {/* NavBar 仅占 5xl 宽度居中显示, 各路由自己决定内容宽度 */}
          <div className="w-full max-w-5xl mx-auto">
            <NavBar />
          </div>
          <Outlet />
        </main>
        {/* 节点详情弹窗: 由 /instance/:uuid 路由驱动, 叠加于首页之上 (首页保持挂载) */}
        <InstanceModal />
      </div>
    );
  };

  return (
    <LiveDataProvider>
      <NodeListProvider>
        <InnerLayout />
      </NodeListProvider>
    </LiveDataProvider>
  );
};

export default IndexLayout;
