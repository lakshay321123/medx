"use client";

import * as React from "react";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ className, type = "button", ...props }, ref) {
  const base =
    "inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const cls = className ? `${base} ${className}` : base;
  return <button ref={ref} type={type} className={cls} {...props} />;
});

