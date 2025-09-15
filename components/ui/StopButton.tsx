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
        "h-9 w-9 rounded-full",
        "bg-white/80 dark:bg-zinc-900/70 backdrop-blur",
        "ring-1 ring-zinc-300 hover:ring-red-400 dark:ring-zinc-700 shadow-sm",
        "flex items-center justify-center",
        "transition-colors hover:bg-white dark:hover:bg-zinc-900",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        className || ""
      ].join(" ")}
    >
      <Square className="h-4 w-4 text-zinc-700 dark:text-zinc-200" strokeWidth={2.25} />
      <span className="sr-only">Stop</span>
    </motion.button>
  );
}

