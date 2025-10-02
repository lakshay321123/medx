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
      aria-label={title}
      title={title}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.92 }}
        className={[
          "flex h-9 w-9 items-center justify-center rounded-md border",
          "border-[var(--brand)] bg-transparent text-[var(--brand)]",
          "transition-colors hover:bg-[var(--hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
          className || ""
        ].join(" ")}
    >
      <Square className="h-4 w-4 text-current" strokeWidth={2.25} />
      <span className="sr-only">Stop</span>
    </motion.button>
  );
}

