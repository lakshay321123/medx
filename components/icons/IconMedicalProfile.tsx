import { Glyph, type IconProps } from "./Glyph";

export function IconMedicalProfile({ title = "Medical profile", active, ...rest }: IconProps) {
  return (
    <Glyph title={title} active={active} {...rest}>
      <path d="M9 4.5h5.5l3.5 3.5V19a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 19V6A1.5 1.5 0 0 1 9 4.5Z" />
      <path d="M14.5 4.5V8h3.5" />
      <path d="M12 11.5v5" />
      <path d="M9.5 14h5" />
    </Glyph>
  );
}
