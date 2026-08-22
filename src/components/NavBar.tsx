import LoginDialog from "./Login";
import { Link } from "react-router-dom";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import SplitText from "./SplitText";
import { TablerBrandGithub } from "./Icones/Tabler";

// 主题仓库地址 (与 komari-theme.json 的 url 保持一致)
const REPO_URL = "https://github.com/woodchen-ink/komari-paper";

const NavBar = () => {
  const { publicInfo } = usePublicInfo();
  return (
    <nav className="nav-bar flex items-center gap-2 md:gap-3 max-h-16 justify-end min-w-full p-2 px-4 mt-2">
      <div className="mr-auto flex items-baseline gap-3 min-w-0">
        <Link to="/" className="flex items-baseline gap-3 min-w-0">
          {/* 站点名: 大号衬线, 印刷感; 副标用 Caveat 做反差
              SplitText: 首次挂载字符级入场, 模仿活字落版 */}
          <SplitText
            text={publicInfo?.sitename ?? ""}
            step={45}
            duration={560}
            className="axis-cover text-[clamp(1.5rem,5vw,2.1rem)] whitespace-nowrap truncate leading-tight"
            style={{
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          />
          <span
            className="hidden sm:inline text-base whitespace-nowrap"
            style={{
              color: "var(--pen-red)",
              fontFamily: "var(--font-hand)",
              transform: "rotate(-2deg)",
              display: "inline-block",
              opacity: 0.85,
            }}
          >
            — monitor
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* GitHub: 跳转主题仓库, 印刷纸片风格方钮, 置于设置按钮左侧 */}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="paper-icon-btn"
          aria-label="GitHub repository"
          title="GitHub"
        >
          <TablerBrandGithub />
        </a>
        {publicInfo?.private_site && !document.cookie.includes("temp_key") ? (
          <LoginDialog
            autoOpen={
              publicInfo?.private_site && !document.cookie.includes("temp_key")
            }
            info="This is a private site, please login to view."
            onLoginSuccess={() => {
              window.location.reload();
            }}
          />
        ) : (
          <LoginDialog />
        )}
      </div>
    </nav>
  );
};

export default NavBar;
