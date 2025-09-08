"use client";
import ThemeToggle from "./ThemeToggle";
import TherapyToggle from "./TherapyToggle";
import CountryGlobe from "@/components/CountryGlobe";
import HeaderModeSwitch from "./HeaderModeSwitch";

export default function Header({
  onTherapyChange,
}: {
  onTherapyChange: (v: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-40 h-14 md:h-16 medx-glass">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base md:text-lg font-semibold">
          <div>MedX</div>
          <CountryGlobe />
        </div>
        <div className="flex items-center gap-2">
          <TherapyToggle onChange={onTherapyChange} />
          <HeaderModeSwitch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
