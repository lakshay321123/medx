import { Glyph, IconProps } from "./Glyph";

export function IconNewChat({ title = "New Chat", ...rest }: IconProps) {
  return (
    <Glyph title={title} {...rest}>
      <circle cx={12} cy={12} r={7.25} />
      <line x1={12} y1={9} x2={12} y2={15} />
      <line x1={9} y1={12} x2={15} y2={12} />
    </Glyph>
  );
}
