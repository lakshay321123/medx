import Sidebar from "@/components/Sidebar";
import ModeBar from "@/components/modes/ModeBar";
import SearchDock from "@/components/search/SearchDock";
import PanelRouter from "@/components/panels/PanelRouter";
import { type FC } from "react";

interface HomeProps {
  searchParams?: { panel?: string; query?: string };
}

const TopBar: FC = () => (
  <div className="sticky top-0 z-40 bg-background/70 backdrop-blur border-b border-border">
    <ModeBar />
  </div>
);

export default function Home({ searchParams }: HomeProps) {
  const hasPanel = !!searchParams?.panel;

  return (
    <div className="grid min-h-screen grid-cols-[280px_1fr]">
      <Sidebar />
      <main className="relative">
        <TopBar />
        {hasPanel ? (
          <PanelRouter searchParams={searchParams} />
        ) : (
          <section
            className="landing-bg grid min-h-[calc(100svh-56px)] place-items-center px-4"
          >
            <SearchDock />
          </section>
        )}
      </main>
    </div>
  );
}

