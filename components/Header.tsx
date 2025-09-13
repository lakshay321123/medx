import ModeBar from "@/components/modes/ModeBar";
import Brand from "@/components/nav/Brand";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <Brand />
      <ModeBar />
    </header>
  );
}
