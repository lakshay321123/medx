import * as React from "react";
import { Glyph, IconProps } from "./Glyph";

/** Medical Profile — document + cross */
export function IconMedicalProfile(props: IconProps) {
  const { title = "Medical profile", ...rest } = props;
  return (
    <Glyph title={title} {...rest}>
      <path d="M8 4.5h6l3.5 3.5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z" />
      <path d="M14 4.5V8h3.5" />
      <path d="M11.75 10v4" />
      <path d="M9.75 12h4" />
    </Glyph>
  );
}
