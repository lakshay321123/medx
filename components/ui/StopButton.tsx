import * as React from "react";
import { motion } from "framer-motion";
import { Square } from "lucide-react";

type Props = {
  onClick: () => void;
  className?: string;
  title?: string;
};

export function StopButton({ onClick, className, title = "Stop generating (Esc)" }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Stop generating"
      title={title}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.92 }}
      className={[
        "h-8 w-8 rounded-full",
        "bg-[var(--so-bg-secondary,#F2F2F7)] dark:bg-[#2C2C2E]",
        "border border-[var(--so-border,#E5E5EA)] dark:border-[#3A3A3C]",
        "flex items-center justify-center",
        "transition-all hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
        "focus:outline-none focus:ring-2 focus:ring-[var(--so-accent,#06B6D4)]",
        className || ""
      ].join(" ")}
    >
      <Square className="h-3 w-3 text-[var(--so-text-secondary,#8E8E93)]" strokeWidth={2.5} fill="currentColor" />
      <span className="sr-only">Stop</span>
    </motion.button>
  );
}
