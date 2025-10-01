import { Glyph, type IconProps } from "./Glyph";

export function IconTimeline({ title = "Timeline", active, ...rest }: IconProps) {
  return (
    <Glyph title={title} active={active} {...rest}>
      <path d="M12 4.5v15" />
      <path d="M12 5.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z" />
      <path d="M12 10.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z" />
      <path d="M12 15.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z" />
      <path d="M6.5 12h3" />
      <path d="M14.5 8h3" />
      <path d="M14.5 16h3" />
    </Glyph>
  );
}
