import { Glyph, type IconProps } from "./Glyph";

export function IconDirectory({ title = "Directory", active, ...rest }: IconProps) {
  return (
    <Glyph title={title} active={active} {...rest}>
      <path d="M4.5 6.5h7.5" />
      <path d="M4.5 11.5h5.5" />
      <path d="M4.5 16.5h4.5" />
      <path d="M16.5 5.5c1.932 0 3.5 1.568 3.5 3.5 0 2.75-3.5 6.5-3.5 6.5S13 11.75 13 9c0-1.932 1.568-3.5 3.5-3.5Z" />
      <path d="M16.5 8.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
    </Glyph>
  );
}
