import Image from "next/image";
import Link from "next/link";
import type { MouseEventHandler } from "react";
import { LOGO_SRC, BRAND_NAME } from "@/lib/brand";

type LogoProps = {
  width?: number;
  height?: number;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export default function Logo({ width = 160, height = 48, onClick }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label={`${BRAND_NAME} — Home`}
      className="inline-flex items-center"
      onClick={onClick}
    >
      <Image src={LOGO_SRC} alt={BRAND_NAME} width={width} height={height} priority />
    </Link>
  );
}
