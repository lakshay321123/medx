import * as React from "react";
import { Glyph, IconProps } from "./Glyph";

/** New Chat — minimal plus (container-free) */
export function IconNewChat(props: IconProps) {
  const { title = "New chat", ...rest } = props;
  return (
    <Glyph title={title} {...rest}>
      <path d="M12 7.25v9.5" />
      <path d="M7.25 12h9.5" />
    </Glyph>
  );
}
