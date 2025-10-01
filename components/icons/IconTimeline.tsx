import { Glyph, IconProps } from "./Glyph";

export function IconTimeline({ title = "Timeline", ...rest }: IconProps) {
  return (
    <Glyph title={title} {...rest}>
      <circle cx={12} cy={12} r={7.25} />
      <line x1={12} y1={8} x2={12} y2={16} />
      <circle cx={12} cy={9.5} r={0.9} />
      <circle cx={12} cy={12} r={0.9} />
      <circle cx={12} cy={14.5} r={0.9} />
    </Glyph>
  );
}
