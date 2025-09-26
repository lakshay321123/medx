import React from "react";

type ClinicalBannerProps = {
  show?: boolean;
  className?: string;
};

export function ClinicalBanner({ show = true, className }: ClinicalBannerProps) {
  if (!show) return null;

  const baseClass = "md:hidden rounded-2xl p-4 bg-blue-700 text-white mb-2.5";
  return (
    <div className={className ? `${baseClass} ${className}` : baseClass}>
      <h2 className="text-sm font-bold">Clinical Mode: ON</h2>
      <p className="text-xs opacity-90">Evidence-ready, clinician-first. Research: On — web evidence</p>
    </div>
  );
}

export default ClinicalBanner;
