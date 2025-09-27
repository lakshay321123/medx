"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "solid" | "outline";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  primary?: boolean;
  small?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  variant = "outline",
  primary = false,
  small = false,
  type = "button",
  className = "",
  ...rest
}: ButtonProps) {
  const sizeClasses = small ? "px-3 text-[12px]" : "px-4 text-[13px]";
  const baseClasses =
    "inline-flex min-h-[44px] items-center justify-center rounded-full select-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

  let variantClasses = "";
  if (primary || variant === "solid") {
    variantClasses = "bg-blue-600 hover:bg-blue-500 text-white";
  } else {
    variantClasses =
      "border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-200 hover:bg-slate-50/60 dark:hover:bg-white/5";
  }

  return (
    <button type={type} className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`} {...rest}>
      {children}
    </button>
  );
}
