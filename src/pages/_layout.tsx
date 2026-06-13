import { LiveDataProvider } from "@/contexts/LiveDataContext";
import NavBar from "../components/NavBar";
import { Outlet } from "react-router-dom";
import { NodeListProvider } from "@/contexts/NodeListContext";
import DynamicBackground from "../components/DynamicBackground";
import SmoothScroll from "../components/SmoothScroll";

// 纸 + 手写主题布局: DynamicBackground 渲染纸面装饰 (vignette + 咖啡渍)
const IndexLayout = () => {
  const InnerLayout = () => {
    return (
      <div className="layout flex flex-col w-full min-h-screen relative">
        <DynamicBackground />
        <SmoothScroll />
        <main className="main-content w-full px-3 md:px-4 pb-8 relative z-10 flex-1">
          {/* NavBar 与内容同宽居中 (固定 1536px), 各路由自己决定内容宽度 */}
          <div className="w-full max-w-384 mx-auto">
            <NavBar />
          </div>
          <Outlet />
        </main>
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
