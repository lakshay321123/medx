"use client";

import Preferences from "../Preferences";

export default function DataControlsPanel() {
  return (
    <>
      <div className="px-5 py-3 text-[13px] text-slate-500 dark:text-slate-400">
        Adjust how MedX behaves and personalizes your care.
      </div>
      <div className="px-5 py-4">
        <Preferences />
      </div>
      {/* Export + Clear rows (stub) */}
    </>
  );
}
