import { Glyph, IconProps } from "./Glyph";

export function IconMedicalProfile({ title = "Medical Profile", ...rest }: IconProps) {
  return (
    <Glyph title={title} {...rest}>
      <circle cx={12} cy={12} r={7.25} />
      <rect x={9} y={9} width={6} height={6} rx={1.25} />
      <line x1={12} y1={10.5} x2={12} y2={13.5} />
      <line x1={10.5} y1={12} x2={13.5} y2={12} />
    </Glyph>
  );
}
