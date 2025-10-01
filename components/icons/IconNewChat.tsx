import * as React from "react";
import { Glyph, IconProps } from "./Glyph";

/** New Chat — chat bubble with plus */
export function IconNewChat(props: IconProps) {
  const { title = "New chat", ...rest } = props;
  return (
    <Glyph title={title} {...rest}>
      <path d="M7 5.25h10a3.25 3.25 0 0 1 3.25 3.25v4.5A3.25 3.25 0 0 1 17 16.25h-3.25L9.5 19.5v-3.25H7A3.25 3.25 0 0 1 3.75 13V8.5A3.25 3.25 0 0 1 7 5.25Z" />
      <path d="M12 9.25v4" />
      <path d="M10 11.25h4" />
    </Glyph>
  );
}
