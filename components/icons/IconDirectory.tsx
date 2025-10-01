import { Glyph, IconProps } from "./Glyph";

export function IconDirectory({ title = "Directory", ...rest }: IconProps) {
  return (
    <Glyph title={title} {...rest}>
      <circle cx={12} cy={12} r={7.25} />
      <circle cx={9} cy={9.5} r={0.75} />
      <circle cx={9} cy={12} r={0.75} />
      <circle cx={9} cy={14.5} r={0.75} />
      <line x1={11.25} y1={9.5} x2={15.5} y2={9.5} />
      <line x1={11.25} y1={12} x2={15.5} y2={12} />
      <line x1={11.25} y1={14.5} x2={15.5} y2={14.5} />
    </Glyph>
  );
}
