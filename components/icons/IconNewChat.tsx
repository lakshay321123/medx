import { Glyph, type IconProps } from "./Glyph";

export function IconNewChat({ title = "New chat", active, ...rest }: IconProps) {
  return (
    <Glyph title={title} active={active} {...rest}>
      <path d="M6.5 5.5h9a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H11l-3.5 3v-3H6.5a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3Z" />
      <path d="M12 9.5v4" />
      <path d="M10 11.5h4" />
    </Glyph>
  );
}
