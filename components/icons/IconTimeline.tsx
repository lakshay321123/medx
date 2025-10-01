import * as React from "react";
import { Glyph, IconProps } from "./Glyph";

/** Timeline — rail + three nodes */
export function IconTimeline(props: IconProps) {
  const { title = "Timeline", ...rest } = props;
  return (
    <Glyph title={title} {...rest}>
      <path d="M4 12h16" />
      <circle cx="8" cy="12" r="1.1" />
      <circle cx="12" cy="12" r="1.1" />
      <circle cx="16" cy="12" r="1.1" />
    </Glyph>
  );
}
