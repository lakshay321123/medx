import Image from "next/image";
import Link from "next/link";
import { LOGO_SRC, BRAND_NAME } from "@/lib/brand";

export default function Logo({ width = 160, height = 48 }: { width?: number; height?: number }) {
  return (
    <Link
      href="/"
      aria-label={`${BRAND_NAME} — Home`}
      className="inline-flex items-center"
    >
      <Image src={LOGO_SRC} alt={BRAND_NAME} width={width} height={height} priority />
    </Link>
  );
}
