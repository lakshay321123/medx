"use client";
import { useEffect, useState } from "react";
import { ENABLE_MOBILE_UI } from "@/env";

export default function FeatureDebug() {
  const [size, setSize] = useState<{ width: number | null; height: number | null }>({ width: null, height: null });

  useEffect(() => {
    const update = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { width, height } = size;
  const md = width !== null && width >= 768;
  const lg = width !== null && width >= 1024;

  return (
    <div className="fixed bottom-2 left-2 z-[9999] rounded bg-black/70 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
      UI:{ENABLE_MOBILE_UI ? "ON" : "OFF"} | {width ?? "?"}×{height ?? "?"} | md≥768? {md ? "yes" : "no"} | lg≥1024? {lg ? "yes" : "no"}
    </div>
  );
}
