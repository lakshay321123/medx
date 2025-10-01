import React from "react";

type Props = React.PropsWithChildren<{
  className?: string;
}>;

/**
 * Desktop-only center column that matches the Chat Composer width exactly.
 * IMPORTANT: Replace the placeholder WIDTH_SIGNATURE below with the EXACT
 * className you copied from the Composer’s outer wrapper. Do not change values.
 */
export const CenterCol: React.FC<Props> = ({ className = "", children }) => {
  return (
    <div
      className={
        [
          // ---- WIDTH_SIGNATURE (copy from Composer) ----
          // Example: "mx-auto max-w-[720px] px-6"
          "mx-auto max-w-3xl space-y-3 px-4 py-4",
          // ----------------------------------------------
          // Desktop only: on mobile/tablet we do nothing
          "hidden lg:block",
          className,
        ].join(" ")
      }
    >
      {children}
    </div>
  );
};

export default CenterCol;
