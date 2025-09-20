import ShellLive from "@/components/layout/ShellLive";
import SidebarAdapter from "@/components/layout/SidebarAdapter";
import MainAdapter from "@/components/layout/MainAdapter";
import ComposerAdapter from "@/components/layout/ComposerAdapter";

export default function Page() {
  return (
    <ShellLive
      Sidebar={SidebarAdapter}
      Main={MainAdapter}
      Composer={ComposerAdapter}
    />
  );
}
