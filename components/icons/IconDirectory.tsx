import * as React from "react";
import { Glyph, IconProps } from "./Glyph";

/** Directory — list + subtle pin */
export function IconDirectory(props: IconProps) {
  const { title = "Directory", ...rest } = props;
  return (
    <Glyph title={title} {...rest}>
      <path d="M4.5 7.25h8.5" />
      <path d="M4.5 11h7.25" />
      <path d="M4.5 14.75h6" />
      <circle cx="17.5" cy="10" r="2.5" />
      <path d="M17.5 12.6c1.8 0 3.2 1.3 3.2 2.6 0 .7-.6 1.2-1.3 1.2h-3.8c-.7 0-1.3-.5-1.3-1.2 0-1.3 1.4-2.6 3.2-2.6z" />
    </Glyph>
  );
}
