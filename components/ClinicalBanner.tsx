import React from "react";

type ClinicalBannerProps = {
  show?: boolean;
  className?: string;
};

export function ClinicalBanner({ show = true, className }: ClinicalBannerProps) {
  if (!show) return null;

  const baseClass = "md:hidden rounded-2xl bg-blue-700 p-4 text-white";
  return (
    <div className={className ? `${baseClass} ${className}` : baseClass}>
      <h2 className="text-base font-bold">Clinical Mode: ON</h2>
      <p className="text-xs opacity-90">
        Evidence-ready, clinician-first. Research: On — web evidence
      </p>
    </div>
  );
}

export default ClinicalBanner;
